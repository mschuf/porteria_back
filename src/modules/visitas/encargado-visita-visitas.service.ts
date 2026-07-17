import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BusinessException } from "../../common/exceptions/business.exception";
import { API_ERROR_CODE } from "../../common/types/api-error-code";
import type { AuthenticatedUser } from "../../common/types/authenticated-user";
import { getVisitaApprovalSubordinateRoles } from "../../common/types/role-hierarchy";
import { SedeAccessService } from "../../common/sede-access/sede-access.service";
import type { AppConfig } from "../../config/configuration";
import { MailService } from "../mail/mail.service";
import {
  buildVisitaDecisionHtml,
  buildVisitaDecisionSubject,
  buildVisitaDecisionText,
} from "../mail/templates/visita-decision.template";
import { UsersService } from "../users/users.service";
import { PostgresService } from "../postgres/postgres.service";
import type { ListEncargadoVisitaQueryDto } from "./dto/list-encargado-visita-query.dto";
import type { VisitaAprobacionDecision } from "./dto/update-visita-aprobacion.dto";
import { mapVisitaRowToResponse } from "./mappers/visita.mapper";
import { EncargadoVisitaVisitasSqlRepository, type VisitaApprovalAccess } from "./repositories/encargado-visita-visitas.sql-repository";
import { VisitaAprobacionNotificacionesSqlRepository } from "./repositories/visita-aprobacion-notificaciones.sql-repository";
import { VisitaAuditSqlRepository } from "./repositories/visita-audit.sql-repository";
import { VisitaAprobacionNotificacionesService } from "./visita-aprobacion-notificaciones.service";
import type { VisitaAuditSnapshot, VisitaListRow } from "./visitas.types";

@Injectable()
export class EncargadoVisitaVisitasService {
  private readonly logger=new Logger(EncargadoVisitaVisitasService.name);
  constructor(
    private readonly repo:EncargadoVisitaVisitasSqlRepository,
    private readonly audit:VisitaAuditSqlRepository,
    private readonly postgres:PostgresService,
    private readonly notificationsRepo:VisitaAprobacionNotificacionesSqlRepository,
    private readonly notifications:VisitaAprobacionNotificacionesService,
    private readonly sedeAccess:SedeAccessService,
    private readonly mail:MailService,
    private readonly usersService:UsersService,
    private readonly config:ConfigService<AppConfig,true>,
  ){}
  private map(row:VisitaListRow){return mapVisitaRowToResponse(row);}
  private async resolveAccess(user:AuthenticatedUser):Promise<VisitaApprovalAccess>{
    const sedeIds=user.role==="super_admin"
      ? undefined
      : await this.sedeAccess.resolveSedeIds(user);
    return {userId:user.id,subordinateRoles:getVisitaApprovalSubordinateRoles(user.role),sedeIds};
  }
  async summary(user:AuthenticatedUser){
    const now=new Date(),start=new Date(now.getFullYear(),now.getMonth(),now.getDate()),end=new Date(start); end.setDate(end.getDate()+1);
    const rows=await this.repo.findToday(await this.resolveAccess(user),start,end);
    return {metrics:{today:rows.length,approved:rows.filter(r=>r.estado_aprobacion==="aprobada").length,pending:rows.filter(r=>r.estado_aprobacion==="pendiente").length},visits:rows.map(r=>this.map(r))};
  }
  async history(user:AuthenticatedUser,query:ListEncargadoVisitaQueryDto){
    if(user.role!=="encargado_visita")throw new BusinessException({message:"No tiene acceso al historial de encargado de visita",code:API_ERROR_CODE.FORBIDDEN,status:HttpStatus.FORBIDDEN});
    const r=await this.repo.findAll(await this.resolveAccess(user),query);return {...r,items:r.items.map(x=>this.map(x))};
  }
  async find(user:AuthenticatedUser,id:number){const row=await this.repo.findById(await this.resolveAccess(user),id);if(!row)throw this.notFound();return this.map(row);}
  async decide(user:AuthenticatedUser,id:number,next:VisitaAprobacionDecision,motivoRechazo?:string){
    const reason=motivoRechazo?.trim() ?? "";
    if(next==="rechazada" && (reason.length<1 || reason.length>250))throw new BusinessException({message:"El motivo del rechazo es obligatorio y debe tener hasta 250 caracteres",code:API_ERROR_CODE.VALIDATION,status:HttpStatus.BAD_REQUEST});
    if(next==="aprobada" && reason)throw new BusinessException({message:"Una aprobación no admite motivo de rechazo",code:API_ERROR_CODE.VALIDATION,status:HttpStatus.BAD_REQUEST});
    let notificationRows:Awaited<ReturnType<VisitaAprobacionNotificacionesSqlRepository["createForVisitRecipients"]>>=[];
    const access=await this.resolveAccess(user);
    const after=await this.postgres.transaction(async client=>{
      const before=await this.repo.findById(access,id,client,true); if(!before)throw this.notFound();
      if(before.estado_aprobacion==="aprobada")throw new BusinessException({message:"Una visita aprobada no puede cambiar su aprobación",code:API_ERROR_CODE.CONFLICT,status:HttpStatus.CONFLICT});
      if(next==="aprobada" && !(await this.repo.claimTarjeta(Number(before.sede_id),before.credencial_numero,id,client))){
        throw new BusinessException({message:`La tarjeta Nº ${before.credencial_numero ?? "asignada"} ya no está disponible para registrar el ingreso`,code:API_ERROR_CODE.CONFLICT,status:HttpStatus.CONFLICT});
      }
      const updated=await this.repo.updateApproval(access,id,next,next==="rechazada"?reason:null,client); if(!updated)throw this.notFound();
      if(next==="rechazada")await this.repo.releaseTarjeta(Number(updated.sede_id),updated.credencial_numero,client);
      const changedFields=[
        "estadoAprobacion",
        ...(before.motivo_rechazo!==updated.motivo_rechazo?["motivoRechazo"]:[]),
        ...(before.estado!==updated.estado?["estado"]:[]),
        ...(before.estado_seguimiento!==updated.estado_seguimiento?["estadoSeguimiento"]:[]),
      ];
      await this.audit.create({visitaId:id,actorUserId:user.id,action:"visita.updated",beforeState:this.snapshot(before),afterState:this.snapshot(updated),changedFields,metadata:{source:"encargado_visita.aprobacion"}},client);
      notificationRows=await this.notificationsRepo.createForVisitRecipients(updated,next,updated.motivo_rechazo,user.id,client);
      return updated;
    });
    this.notifications.publish(notificationRows);
    await this.notifyCreador(after,next);
    return this.map(after);
  }
  /** Notifica por correo al creador de la visita la decisión de aprobación/rechazo (best-effort). */
  private async notifyCreador(after:VisitaListRow,decision:VisitaAprobacionDecision):Promise<void>{
    try{
      const creador=await this.usersService.findById(Number(after.usuario_creador_id));
      if(!creador?.isActive || !creador.email?.trim()){
        this.logger.warn(`No se notificó por correo la decisión de la visita ${after.id}: creador sin correo`);
        return;
      }
      const visit=this.map(after);
      const baseUrl=(this.config.get("frontend.baseUrl",{infer:true}) ?? "").replace(/\/+$/,"");
      const template={
        creadorNombre:creador.fullName,
        decision,
        visitante:visit.visitante,
        documento:visit.documento,
        sede:visit.sedeNombre,
        motivo:visit.motivo,
        responsable:visit.responsableNombre,
        credencial:visit.credencialNumero ?? "—",
        motivoRechazo:visit.motivoRechazo,
        visitasUrl:`${baseUrl}/visitas`,
      };
      const result=await this.mail.send({
        subject:buildVisitaDecisionSubject(decision),
        recipients:[{name:creador.fullName,email:creador.email.trim()}],
        html:buildVisitaDecisionHtml(template),
        text:buildVisitaDecisionText(template),
      });
      if(!result.sent)this.logger.warn(`No se notificó por correo la decisión de la visita ${after.id}: ${result.error ?? "SMTP deshabilitado"}`);
    }catch(error){
      this.logger.warn(`Error al notificar por correo la decisión de la visita ${after.id}: ${error instanceof Error?error.message:String(error)}`);
    }
  }
  private snapshot(row:VisitaListRow):VisitaAuditSnapshot{const d=mapVisitaRowToResponse(row);return {id:d.id,personaId:d.personaId,visitante:d.visitante,documento:d.documento,empresa:d.empresa,sedeId:d.sedeId,sedeNombre:d.sedeNombre,responsableId:d.responsableId,motivo:d.motivo,responsableNombre:d.responsableNombre,usuarioCreadorId:d.usuarioCreadorId,usuarioCreadorNombre:d.usuarioCreadorNombre,estado:d.estado,estadoAprobacion:row.estado_aprobacion,motivoRechazo:row.motivo_rechazo,estadoSeguimiento:d.estadoSeguimiento,zonasPermitidas:[...d.zonasPermitidas],credencialNumero:d.credencialNumero,tarjetaColor:d.tarjetaColor,entradaAt:d.entradaAt,salidaAt:d.salidaAt,observaciones:d.observaciones,createdAt:d.createdAt,updatedAt:d.updatedAt};}
  private notFound(){return new BusinessException({message:"Visita no encontrada",code:API_ERROR_CODE.NOT_FOUND,status:HttpStatus.NOT_FOUND});}
}
