import { Injectable } from "@nestjs/common";
import type { PoolClient } from "pg";
import type { PaginatedResult } from "../../../common/dto/pagination.dto";
import { PostgresService } from "../../postgres/postgres.service";
import type { VisitaSortBy } from "../dto/list-visitas-query.dto";
import type { ListEncargadoVisitaQueryDto } from "../dto/list-encargado-visita-query.dto";
import type { VisitaAprobacionDecision } from "../dto/update-visita-aprobacion.dto";
import type { VisitaListRow } from "../visitas.types";
import type { UserRole } from "../../../common/types/authenticated-user";

export interface VisitaApprovalAccess {
  userId: number;
  subordinateRoles: UserRole[];
  sedeIds: number[] | undefined;
}

const SELECT = `v.id,v.persona_id,v.sede_id,v.usuario_creador_id,v.motivo_visita_id,v.motivo,
 v.responsable_usuario_id,v.estado,v.estado_aprobacion,v.motivo_rechazo,v.estado_seguimiento,v.zonas_permitidas,
 v.credencial_numero,v.tarjeta_color,v.entrada_at,v.salida_at,v.observaciones,v.creado_en,v.actualizado_en,
 p.nombre AS visitante,p.documento,prov.nombre AS empresa,s.nombre AS sede_nombre,
 responsable.nombre AS responsable_nombre,responsable.rol AS responsable_rol,creador.nombre AS usuario_creador_nombre,
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

  private accessClause(access: VisitaApprovalAccess, params: unknown[]): string {
    params.push(access.userId);
    const ownParam = params.length;
    if (access.subordinateRoles.length === 0) return `v.responsable_usuario_id=$${ownParam}`;
    params.push(access.subordinateRoles);
    const rolesParam = params.length;
    let territorial = "TRUE";
    if (access.sedeIds !== undefined) {
      params.push(access.sedeIds);
      territorial = `v.sede_id=ANY($${params.length}::bigint[])`;
    }
    return `(v.responsable_usuario_id=$${ownParam} OR (responsable.rol=ANY($${rolesParam}::text[]) AND ${territorial}))`;
  }

  async findToday(access: VisitaApprovalAccess, start: Date, end: Date): Promise<VisitaListRow[]> {
    const params: unknown[] = [];
    const accessSql = this.accessClause(access, params);
    params.push(start, end);
    return this.postgres.query<VisitaListRow>(
      `SELECT ${SELECT} ${FROM}
       WHERE ${accessSql} AND v.entrada_at >= $${params.length - 1} AND v.entrada_at < $${params.length}
         AND (v.estado <> 'cancelada' OR v.estado_aprobacion='rechazada')
       ORDER BY v.entrada_at ASC, v.id ASC`, params,
    );
  }

  async findAll(access: VisitaApprovalAccess, query: ListEncargadoVisitaQueryDto): Promise<PaginatedResult<VisitaListRow>> {
    const page=query.page ?? 1, limit=query.limit ?? 15;
    const params: unknown[]=[];
    const clauses=[this.accessClause(access, params)];
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

  async findById(access:VisitaApprovalAccess,id:number,client?:PoolClient,forUpdate=false):Promise<VisitaListRow|null>{
    const params:unknown[]=[id];
    const accessSql=this.accessClause(access,params);
    const sql=`SELECT ${SELECT} ${FROM} WHERE v.id=$1 AND ${accessSql}${forUpdate ? " FOR UPDATE OF v" : ""}`;
    const rows=client
      ? (await client.query<VisitaListRow>(sql,params)).rows
      : await this.postgres.query<VisitaListRow>(sql,params);
    return rows[0] ?? null;
  }

  async updateApproval(access:VisitaApprovalAccess,id:number,next:VisitaAprobacionDecision,motivoRechazo:string|null,client?:PoolClient):Promise<VisitaListRow|null>{
    const sql=`UPDATE public.visita
          SET estado_aprobacion=$2,
              motivo_rechazo=$3,
              estado=CASE
                WHEN $2='rechazada' THEN 'cancelada'
                WHEN $2='aprobada' THEN 'activa'
                ELSE estado
              END,
              estado_seguimiento=CASE WHEN $2='rechazada' THEN NULL ELSE estado_seguimiento END,
              actualizado_en=now()
       WHERE id=$1 AND estado_aprobacion <> 'aprobada'
       RETURNING id`;
    const rows=client
      ? (await client.query<{id:string}>(sql,[id,next,motivoRechazo])).rows
      : await this.postgres.query<{id:string}>(sql,[id,next,motivoRechazo]);
    return rows[0] ? this.findById(access,id,client) : null;
  }

  async claimTarjeta(sedeId:number,credencialNumero:string|null,visitaId:number,client:PoolClient):Promise<boolean>{
    const normalized=credencialNumero?.trim();
    if(!normalized)return false;
    const numero=Number(normalized);
    if(!Number.isSafeInteger(numero)||numero<1||String(numero)!==normalized)return false;
    const result=await client.query<{id:string}>(
      `UPDATE public.tarjetas t
          SET en_uso=true, actualizado_en=now()
        WHERE t.sede_id=$1 AND t.numero=$2 AND t.activo=true
          AND (
            t.en_uso=false
            OR EXISTS (
              SELECT 1 FROM public.visita propia
               WHERE propia.id=$3
                 AND propia.sede_id=t.sede_id
                 AND propia.estado='programada'
                 AND trim(propia.credencial_numero)=t.numero::text
            )
          )
          AND NOT EXISTS (
            SELECT 1 FROM public.visita v
             WHERE v.sede_id=$1
               AND trim(v.credencial_numero)=$2::text
               AND v.estado IN ('programada','activa','sin_salida')
               AND v.id<>$3
          )
        RETURNING t.id`,
      [sedeId,numero,visitaId],
    );
    return result.rows.length>0;
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
