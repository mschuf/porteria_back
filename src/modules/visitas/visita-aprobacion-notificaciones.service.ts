import { HttpStatus, Injectable, MessageEvent } from "@nestjs/common";
import { BusinessException } from "../../common/exceptions/business.exception";
import { API_ERROR_CODE } from "../../common/types/api-error-code";
import { from, interval, map, merge, mergeMap, Observable, Subject } from "rxjs";
import { VisitaAprobacionNotificacionesSqlRepository } from "./repositories/visita-aprobacion-notificaciones.sql-repository";
import type { VisitaAprobacionNotificacionDto, VisitaAprobacionNotificacionRow } from "./visita-aprobacion-notificaciones.types";

@Injectable()
export class VisitaAprobacionNotificacionesService {
  private readonly liveByUser = new Map<number, Subject<VisitaAprobacionNotificacionDto>>();
  constructor(private readonly repo: VisitaAprobacionNotificacionesSqlRepository) {}

  private map(row: VisitaAprobacionNotificacionRow): VisitaAprobacionNotificacionDto {
    return {id:Number(row.id),visitaId:Number(row.visita_id),estadoAprobacion:row.estado_aprobacion,
      motivoRechazo:row.motivo_rechazo,visitante:row.visitante_nombre,sedeNombre:row.sede_nombre,
      createdAt:new Date(row.creado_en).toISOString()};
  }

  async pending(userId:number){return (await this.repo.findPending(userId)).map(row=>this.map(row));}

  async confirm(userId:number,id:number){
    if(!(await this.repo.confirm(userId,id))) throw new BusinessException({message:"Notificación no encontrada",code:API_ERROR_CODE.NOT_FOUND,status:HttpStatus.NOT_FOUND});
    return {id,confirmed:true};
  }

  publish(rows:VisitaAprobacionNotificacionRow[]){
    for(const row of rows)this.liveByUser.get(Number(row.usuario_destinatario_id))?.next(this.map(row));
  }

  stream(userId:number):Observable<MessageEvent>{
    let subject=this.liveByUser.get(userId);
    if(!subject){subject=new Subject();this.liveByUser.set(userId,subject);}
    const stored=from(this.pending(userId)).pipe(mergeMap(items=>from(items)),map(data=>({type:"visita.aprobacion",id:String(data.id),data})));
    const live=subject.pipe(map(data=>({type:"visita.aprobacion",id:String(data.id),data})));
    const heartbeat=interval(10000).pipe(map(()=>({type:"heartbeat",data:{at:new Date().toISOString()}})));
    return merge(stored,live,heartbeat);
  }
}
