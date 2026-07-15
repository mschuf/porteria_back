import { firstValueFrom, take } from "rxjs";
import { VisitaAprobacionNotificacionesService } from "./visita-aprobacion-notificaciones.service";

const row={id:"8",visita_id:"14",usuario_destinatario_id:"3",estado_aprobacion:"rechazada" as const,motivo_rechazo:"Sin autorización",visitante_nombre:"Ana",sede_nombre:"Central",creado_en:"2026-07-15T12:00:00Z",confirmado_en:null};

describe("VisitaAprobacionNotificacionesService",()=>{
 const repo={findPending:jest.fn(),confirm:jest.fn()};
 const service=new VisitaAprobacionNotificacionesService(repo as never);
 beforeEach(()=>jest.clearAllMocks());
 it("devuelve pendientes en el orden del repositorio con contrato público",async()=>{repo.findPending.mockResolvedValue([row]);await expect(service.pending(3)).resolves.toEqual([{id:8,visitaId:14,estadoAprobacion:"rechazada",motivoRechazo:"Sin autorización",visitante:"Ana",sedeNombre:"Central",createdAt:"2026-07-15T12:00:00.000Z"}]);});
 it("emite los pendientes al abrir el stream",async()=>{repo.findPending.mockResolvedValue([row]);await expect(firstValueFrom(service.stream(3).pipe(take(1)))).resolves.toMatchObject({type:"visita.aprobacion",id:"8",data:{id:8}});});
 it("confirma únicamente notificaciones propias existentes",async()=>{repo.confirm.mockResolvedValue(false);await expect(service.confirm(3,99)).rejects.toMatchObject({code:"NOT_FOUND"});repo.confirm.mockResolvedValue(true);await expect(service.confirm(3,8)).resolves.toEqual({id:8,confirmed:true});});
});
