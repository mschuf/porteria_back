import { HttpStatus, Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/exceptions/business.exception";
import { API_ERROR_CODE } from "../../common/types/api-error-code";
import type { AuthenticatedUser } from "../../common/types/authenticated-user";
import type { ListEncargadoVisitaQueryDto } from "./dto/list-encargado-visita-query.dto";
import type { VisitaAprobacionDecision } from "./dto/update-visita-aprobacion.dto";
import { mapVisitaRowToResponse } from "./mappers/visita.mapper";
import { EncargadoVisitaVisitasSqlRepository } from "./repositories/encargado-visita-visitas.sql-repository";
import { VisitaAuditSqlRepository } from "./repositories/visita-audit.sql-repository";
import type { VisitaAuditSnapshot, VisitaListRow } from "./visitas.types";

@Injectable()
export class EncargadoVisitaVisitasService {
  constructor(private readonly repo:EncargadoVisitaVisitasSqlRepository,private readonly audit:VisitaAuditSqlRepository){}
  private map(row:VisitaListRow){return {...mapVisitaRowToResponse(row),estadoAprobacion:row.estado_aprobacion};}
  async summary(user:AuthenticatedUser){
    const now=new Date(),start=new Date(now.getFullYear(),now.getMonth(),now.getDate()),end=new Date(start); end.setDate(end.getDate()+1);
    const rows=await this.repo.findToday(user.id,start,end);
    return {metrics:{today:rows.length,approved:rows.filter(r=>r.estado_aprobacion==="aprobada").length,pending:rows.filter(r=>r.estado_aprobacion==="pendiente").length},visits:rows.map(r=>this.map(r))};
  }
  async history(user:AuthenticatedUser,query:ListEncargadoVisitaQueryDto){const r=await this.repo.findAll(user.id,query);return {...r,items:r.items.map(x=>this.map(x))};}
  async find(user:AuthenticatedUser,id:number){const row=await this.repo.findById(user.id,id);if(!row)throw this.notFound();return this.map(row);}
  async decide(user:AuthenticatedUser,id:number,next:VisitaAprobacionDecision){
    const before=await this.repo.findById(user.id,id); if(!before)throw this.notFound();
    if(before.estado_aprobacion==="aprobada")throw new BusinessException({message:"Una visita aprobada no puede cambiar su aprobación",code:API_ERROR_CODE.CONFLICT,status:HttpStatus.CONFLICT});
    const after=await this.repo.updateApproval(user.id,id,next);
    if(!after){const latest=await this.repo.findById(user.id,id);if(latest?.estado_aprobacion==="aprobada")throw new BusinessException({message:"Una visita aprobada no puede cambiar su aprobación",code:API_ERROR_CODE.CONFLICT,status:HttpStatus.CONFLICT});throw this.notFound();}
    await this.audit.create({visitaId:id,actorUserId:user.id,action:"visita.updated",beforeState:this.snapshot(before),afterState:this.snapshot(after),changedFields:["estadoAprobacion"],metadata:{source:"encargado_visita.aprobacion"}});
    return this.map(after);
  }
  private snapshot(row:VisitaListRow):VisitaAuditSnapshot{const d=mapVisitaRowToResponse(row);return {id:d.id,personaId:d.personaId,visitante:d.visitante,documento:d.documento,empresa:d.empresa,sedeId:d.sedeId,sedeNombre:d.sedeNombre,responsableId:d.responsableId,motivo:d.motivo,responsableNombre:d.responsableNombre,usuarioCreadorId:d.usuarioCreadorId,usuarioCreadorNombre:d.usuarioCreadorNombre,estado:d.estado,estadoAprobacion:row.estado_aprobacion,estadoSeguimiento:d.estadoSeguimiento,zonasPermitidas:[...d.zonasPermitidas],credencialNumero:d.credencialNumero,tarjetaColor:d.tarjetaColor,entradaAt:d.entradaAt,salidaAt:d.salidaAt,observaciones:d.observaciones,createdAt:d.createdAt,updatedAt:d.updatedAt};}
  private notFound(){return new BusinessException({message:"Visita no encontrada",code:API_ERROR_CODE.NOT_FOUND,status:HttpStatus.NOT_FOUND});}
}
