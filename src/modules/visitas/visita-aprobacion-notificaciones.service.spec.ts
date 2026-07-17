import { firstValueFrom, take } from "rxjs";
import { VisitaAprobacionNotificacionesService } from "./visita-aprobacion-notificaciones.service";

const row={id:"8",grupo_decision_id:"31",visita_id:"14",usuario_destinatario_id:"3",estado_aprobacion:"rechazada" as const,motivo_rechazo:"Sin autorización",visitante_nombre:"Ana",sede_nombre:"Central",creado_en:"2026-07-15T12:00:00Z",confirmado_en:null};

describe("VisitaAprobacionNotificacionesService",()=>{
 const repo={findPending:jest.fn(),confirm:jest.fn()};
 const service=new VisitaAprobacionNotificacionesService(repo as never);
 beforeEach(()=>jest.clearAllMocks());
 it("devuelve pendientes en el orden del repositorio con el grupo de decisión",async()=>{repo.findPending.mockResolvedValue([row]);await expect(service.pending(3)).resolves.toEqual([{id:8,grupoDecisionId:31,visitaId:14,estadoAprobacion:"rechazada",motivoRechazo:"Sin autorización",visitante:"Ana",sedeNombre:"Central",createdAt:"2026-07-15T12:00:00.000Z"}]);});
 it("emite los pendientes al abrir el stream",async()=>{repo.findPending.mockResolvedValue([row]);await expect(firstValueFrom(service.stream(3).pipe(take(1)))).resolves.toMatchObject({type:"visita.aprobacion",id:"8",data:{id:8,grupoDecisionId:31}});});
 it("emite en vivo el fallo de correo al usuario conectado",async()=>{repo.findPending.mockResolvedValue([]);const event=firstValueFrom(service.stream(3).pipe(take(1)));service.publishCorreoFallido(3,14);await expect(event).resolves.toMatchObject({type:"visita.correo-fallido",data:{visitaId:14,mensaje:expect.stringContaining("No se pudo enviar")}});});
 it("confirma el grupo y avisa a todos los destinatarios conectados",async()=>{
  repo.findPending.mockResolvedValue([]);
  repo.confirm.mockResolvedValue({grupoDecisionId:31,destinatarioIds:[3,4]});
  const user3Event=firstValueFrom(service.stream(3).pipe(take(1)));
  const user4Event=firstValueFrom(service.stream(4).pipe(take(1)));
  await expect(service.confirm(3,8)).resolves.toEqual({id:8,grupoDecisionId:31,confirmed:true});
  await expect(user3Event).resolves.toMatchObject({type:"visita.aprobacion-confirmada",data:{grupoDecisionId:31}});
  await expect(user4Event).resolves.toMatchObject({type:"visita.aprobacion-confirmada",data:{grupoDecisionId:31}});
 });
 it("rechaza notificaciones que no pertenecen al usuario",async()=>{repo.confirm.mockResolvedValue(null);await expect(service.confirm(3,99)).rejects.toMatchObject({code:"NOT_FOUND"});});
});
