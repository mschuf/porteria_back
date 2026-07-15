import { HttpStatus, Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/exceptions/business.exception";
import { API_ERROR_CODE } from "../../common/types/api-error-code";
import type { AuthenticatedUser } from "../../common/types/authenticated-user";
import { PostgresService } from "../postgres/postgres.service";
import type { ListEncargadoVisitaQueryDto } from "./dto/list-encargado-visita-query.dto";
import type { VisitaAprobacionDecision } from "./dto/update-visita-aprobacion.dto";
import { mapVisitaRowToResponse } from "./mappers/visita.mapper";
import { EncargadoVisitaVisitasSqlRepository } from "./repositories/encargado-visita-visitas.sql-repository";
import { VisitaAprobacionNotificacionesSqlRepository } from "./repositories/visita-aprobacion-notificaciones.sql-repository";
import { VisitaAuditSqlRepository } from "./repositories/visita-audit.sql-repository";
import { VisitaAprobacionNotificacionesService } from "./visita-aprobacion-notificaciones.service";
import type { VisitaAuditSnapshot, VisitaListRow } from "./visitas.types";

@Injectable()
export class EncargadoVisitaVisitasService {
  constructor(
    private readonly repo:EncargadoVisitaVisitasSqlRepository,
    private readonly audit:VisitaAuditSqlRepository,
    private readonly postgres:PostgresService,
    private readonly notificationsRepo:VisitaAprobacionNotificacionesSqlRepository,
    private readonly notifications:VisitaAprobacionNotificacionesService,
  ){}
  private map(row:VisitaListRow){return mapVisitaRowToResponse(row);}
  async summary(user:AuthenticatedUser){
    const now=new Date(),start=new Date(now.getFullYear(),now.getMonth(),now.getDate()),end=new Date(start); end.setDate(end.getDate()+1);
    const rows=await this.repo.findToday(user.id,start,end);
    return {metrics:{today:rows.length,approved:rows.filter(r=>r.estado_aprobacion==="aprobada").length,pending:rows.filter(r=>r.estado_aprobacion==="pendiente").length},visits:rows.map(r=>this.map(r))};
  }
  async history(user:AuthenticatedUser,query:ListEncargadoVisitaQueryDto){const r=await this.repo.findAll(user.id,query);return {...r,items:r.items.map(x=>this.map(x))};}
  async find(user:AuthenticatedUser,id:number){const row=await this.repo.findById(user.id,id);if(!row)throw this.notFound();return this.map(row);}
  async decide(user:AuthenticatedUser,id:number,next:VisitaAprobacionDecision,motivoRechazo?:string){
    const reason=motivoRechazo?.trim() ?? "";
    if(next==="rechazada" && (reason.length<1 || reason.length>250))throw new BusinessException({message:"El motivo del rechazo es obligatorio y debe tener hasta 250 caracteres",code:API_ERROR_CODE.VALIDATION,status:HttpStatus.BAD_REQUEST});
    if(next==="aprobada" && reason)throw new BusinessException({message:"Una aprobación no admite motivo de rechazo",code:API_ERROR_CODE.VALIDATION,status:HttpStatus.BAD_REQUEST});
    let notificationRows:Awaited<ReturnType<VisitaAprobacionNotificacionesSqlRepository["createForVisitRecipients"]>>=[];
    const after=await this.postgres.transaction(async client=>{
      const before=await this.repo.findById(user.id,id,client,true); if(!before)throw this.notFound();
      if(before.estado_aprobacion==="aprobada")throw new BusinessException({message:"Una visita aprobada no puede cambiar su aprobación",code:API_ERROR_CODE.CONFLICT,status:HttpStatus.CONFLICT});
      const updated=await this.repo.updateApproval(user.id,id,next,next==="rechazada"?reason:null,client); if(!updated)throw this.notFound();
      if(next==="rechazada")await this.repo.releaseTarjeta(Number(updated.sede_id),updated.credencial_numero,client);
      const changedFields=[
        "estadoAprobacion",
        ...(before.motivo_rechazo!==updated.motivo_rechazo?["motivoRechazo"]:[]),
        ...(before.estado!==updated.estado?["estado"]:[]),
        ...(before.estado_seguimiento!==updated.estado_seguimiento?["estadoSeguimiento"]:[]),
      ];
      await this.audit.create({visitaId:id,actorUserId:user.id,action:"visita.updated",beforeState:this.snapshot(before),afterState:this.snapshot(updated),changedFields,metadata:{source:"encargado_visita.aprobacion"}},client);
      notificationRows=await this.notificationsRepo.createForVisitRecipients(updated,next,updated.motivo_rechazo,client);
      return updated;
    });
    this.notifications.publish(notificationRows);
    return this.map(after);
  }
  private snapshot(row:VisitaListRow):VisitaAuditSnapshot{const d=mapVisitaRowToResponse(row);return {id:d.id,personaId:d.personaId,visitante:d.visitante,documento:d.documento,empresa:d.empresa,sedeId:d.sedeId,sedeNombre:d.sedeNombre,responsableId:d.responsableId,motivo:d.motivo,responsableNombre:d.responsableNombre,usuarioCreadorId:d.usuarioCreadorId,usuarioCreadorNombre:d.usuarioCreadorNombre,estado:d.estado,estadoAprobacion:row.estado_aprobacion,motivoRechazo:row.motivo_rechazo,estadoSeguimiento:d.estadoSeguimiento,zonasPermitidas:[...d.zonasPermitidas],credencialNumero:d.credencialNumero,tarjetaColor:d.tarjetaColor,entradaAt:d.entradaAt,salidaAt:d.salidaAt,observaciones:d.observaciones,createdAt:d.createdAt,updatedAt:d.updatedAt};}
  private notFound(){return new BusinessException({message:"Visita no encontrada",code:API_ERROR_CODE.NOT_FOUND,status:HttpStatus.NOT_FOUND});}
}
