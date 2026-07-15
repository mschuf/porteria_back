import { Injectable } from "@nestjs/common";
import type { PoolClient } from "pg";
import type { PaginatedResult } from "../../../common/dto/pagination.dto";
import { PostgresService } from "../../postgres/postgres.service";
import type { VisitaSortBy } from "../dto/list-visitas-query.dto";
import type { ListEncargadoVisitaQueryDto } from "../dto/list-encargado-visita-query.dto";
import type { VisitaAprobacionDecision } from "../dto/update-visita-aprobacion.dto";
import type { VisitaListRow } from "../visitas.types";

const SELECT = `v.id,v.persona_id,v.sede_id,v.usuario_creador_id,v.motivo_visita_id,v.motivo,
 v.responsable_usuario_id,v.estado,v.estado_aprobacion,v.motivo_rechazo,v.estado_seguimiento,v.zonas_permitidas,
 v.credencial_numero,v.tarjeta_color,v.entrada_at,v.salida_at,v.observaciones,v.creado_en,v.actualizado_en,
 p.nombre AS visitante,p.documento,prov.nombre AS empresa,s.nombre AS sede_nombre,
 responsable.nombre AS responsable_nombre,creador.nombre AS usuario_creador_nombre,
 (p.foto IS NOT NULL) AS has_foto,(v.foto IS NOT NULL) AS has_visita_foto`;
const FROM = `FROM public.visita v
 INNER JOIN public.persona p ON p.id=v.persona_id
 INNER JOIN public.proveedor prov ON prov.id=p.proveedor_id
 INNER JOIN public.sede s ON s.id=v.sede_id
 INNER JOIN public.usuario responsable ON responsable.id=v.responsable_usuario_id
 INNER JOIN public.usuario creador ON creador.id=v.usuario_creador_id`;
const SORT: Record<VisitaSortBy, string> = {
  id:"v.id",visitante:"p.nombre",documento:"p.documento",empresa:"prov.nombre",sede:"s.nombre",
  motivo:"v.motivo",responsable:"responsable.nombre",creador:"creador.nombre",estado:"v.estado",
  estadoAprobacion:"v.estado_aprobacion",
  entradaAt:"v.entrada_at",salidaAt:"v.salida_at",
};

@Injectable()
export class EncargadoVisitaVisitasSqlRepository {
  constructor(private readonly postgres: PostgresService) {}

  async findToday(userId: number, start: Date, end: Date): Promise<VisitaListRow[]> {
    return this.postgres.query<VisitaListRow>(
      `SELECT ${SELECT} ${FROM}
       WHERE v.responsable_usuario_id=$1 AND v.entrada_at >= $2 AND v.entrada_at < $3 AND v.estado <> 'cancelada'
       ORDER BY v.entrada_at ASC, v.id ASC`, [userId,start,end],
    );
  }

  async findAll(userId: number, query: ListEncargadoVisitaQueryDto): Promise<PaginatedResult<VisitaListRow>> {
    const page=query.page ?? 1, limit=query.limit ?? 15;
    const params: unknown[]=[userId];
    const clauses=["v.responsable_usuario_id=$1"];
    const ilike=(column:string,value?:string)=>{ if(value?.trim()){params.push(`%${value.trim()}%`);clauses.push(`${column} ILIKE $${params.length}`);} };
    ilike("p.nombre",query.visitante); ilike("p.documento",query.documento); ilike("prov.nombre",query.empresa); ilike("v.motivo",query.motivo);
    if(query.entradaFrom){params.push(query.entradaFrom);clauses.push(`v.entrada_at >= $${params.length}::timestamptz`);}
    if(query.entradaTo){params.push(query.entradaTo);clauses.push(`v.entrada_at <= $${params.length}::timestamptz`);}
    if(query.estadoAprobacion){params.push(query.estadoAprobacion);clauses.push(`v.estado_aprobacion = $${params.length}`);}
    if(query.search?.trim()){
      params.push(`%${query.search.trim()}%`); const p=params.length;
      clauses.push(`(v.id::text ILIKE $${p} OR p.nombre ILIKE $${p} OR p.documento ILIKE $${p} OR prov.nombre ILIKE $${p} OR v.motivo ILIKE $${p} OR s.nombre ILIKE $${p})`);
    }
    const where=`WHERE ${clauses.join(" AND ")}`;
    const count=await this.postgres.query<{total:string}>(`SELECT COUNT(*)::text total ${FROM} ${where}`,params);
    const order=query.sortBy ? `${SORT[query.sortBy]} ${(query.sortOrder === "asc" ? "ASC" : "DESC")}` : "v.entrada_at DESC NULLS LAST, v.id DESC";
    const listParams=[...params,limit,(page-1)*limit];
    const items=await this.postgres.query<VisitaListRow>(`SELECT ${SELECT} ${FROM} ${where} ORDER BY ${order} LIMIT $${listParams.length-1} OFFSET $${listParams.length}`,listParams);
    return {items,total:Number(count[0]?.total ?? 0),page,limit};
  }

  async findById(userId:number,id:number,client?:PoolClient,forUpdate=false):Promise<VisitaListRow|null>{
    const sql=`SELECT ${SELECT} ${FROM} WHERE v.id=$1 AND v.responsable_usuario_id=$2${forUpdate ? " FOR UPDATE OF v" : ""}`;
    const rows=client
      ? (await client.query<VisitaListRow>(sql,[id,userId])).rows
      : await this.postgres.query<VisitaListRow>(sql,[id,userId]);
    return rows[0] ?? null;
  }

  async updateApproval(userId:number,id:number,next:VisitaAprobacionDecision,motivoRechazo:string|null,client?:PoolClient):Promise<VisitaListRow|null>{
    const sql=`UPDATE public.visita
          SET estado_aprobacion=$3,
              motivo_rechazo=$4,
              estado=CASE WHEN $3='rechazada' THEN 'cancelada' ELSE estado END,
              estado_seguimiento=CASE WHEN $3='rechazada' THEN NULL ELSE estado_seguimiento END,
              actualizado_en=now()
       WHERE id=$1 AND responsable_usuario_id=$2 AND estado_aprobacion <> 'aprobada'
       RETURNING id`;
    const rows=client
      ? (await client.query<{id:string}>(sql,[id,userId,next,motivoRechazo])).rows
      : await this.postgres.query<{id:string}>(sql,[id,userId,next,motivoRechazo]);
    return rows[0] ? this.findById(userId,id,client) : null;
  }

  async releaseTarjeta(sedeId:number,credencialNumero:string|null,client:PoolClient):Promise<void>{
    const normalized=credencialNumero?.trim();
    if(!normalized)return;
    const numero=Number(normalized);
    if(!Number.isSafeInteger(numero)||numero<1||String(numero)!==normalized)return;
    await client.query(
      `UPDATE public.tarjetas
          SET en_uso=false, actualizado_en=now()
        WHERE sede_id=$1 AND numero=$2 AND en_uso=true`,
      [sedeId,numero],
    );
  }
}
