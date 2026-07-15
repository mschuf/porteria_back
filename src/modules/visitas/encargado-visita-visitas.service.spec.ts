import type { AuthenticatedUser } from "../../common/types/authenticated-user";
import { EncargadoVisitaVisitasService } from "./encargado-visita-visitas.service";
import type { VisitaListRow } from "./visitas.types";

const user:AuthenticatedUser={id:22,role:"encargado_visita",sedeId:null,empresaSeguridadId:null};
const row=(approval:"pendiente"|"aprobada"|"rechazada"):VisitaListRow=>({id:"1",persona_id:"2",sede_id:"3",usuario_creador_id:"4",motivo_visita_id:"5",motivo:"Reunión",responsable_usuario_id:"22",estado:"programada",estado_aprobacion:approval,motivo_rechazo:approval==="rechazada"?"Sin autorización":null,estado_seguimiento:null,zonas_permitidas:[],credencial_numero:"1",tarjeta_color:"rojo",entrada_at:"2026-07-15T12:00:00Z",salida_at:null,observaciones:null,creado_en:"2026-07-15T10:00:00Z",actualizado_en:"2026-07-15T10:00:00Z",visitante:"Ana",documento:"123",empresa:"Proveedor",sede_nombre:"Central",responsable_nombre:"Responsable",usuario_creador_nombre:"Portero",has_foto:false,has_visita_foto:false});

describe("EncargadoVisitaVisitasService",()=>{
 const repo={findToday:jest.fn(),findAll:jest.fn(),findById:jest.fn(),updateApproval:jest.fn(),releaseTarjeta:jest.fn()};
 const audit={create:jest.fn()};
 const postgres={transaction:jest.fn(async(callback:(client:unknown)=>Promise<unknown>)=>callback({}))};
 const notificationsRepo={createForVisitRecipients:jest.fn().mockResolvedValue([])};
 const notifications={publish:jest.fn()};
 const service=new EncargadoVisitaVisitasService(repo as never,audit as never,postgres as never,notificationsRepo as never,notifications as never);
 beforeEach(()=>jest.clearAllMocks());
 it("resume únicamente las filas devueltas para el responsable",async()=>{repo.findToday.mockResolvedValue([row("pendiente"),{...row("aprobada"),id:"2"}]);const result=await service.summary(user);expect(repo.findToday).toHaveBeenCalledWith(user.id,expect.any(Date),expect.any(Date));expect(result.metrics).toEqual({today:2,approved:1,pending:1});});
 it("permite aprobar una visita rechazada, limpia el motivo y audita",async()=>{repo.findById.mockResolvedValue(row("rechazada"));repo.updateApproval.mockResolvedValue(row("aprobada"));await expect(service.decide(user,1,"aprobada")).resolves.toMatchObject({estadoAprobacion:"aprobada",motivoRechazo:null});expect(repo.updateApproval).toHaveBeenCalledWith(user.id,1,"aprobada",null,expect.anything());expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({changedFields:["estadoAprobacion","motivoRechazo"]}),expect.anything());});
  it("exige un motivo no vacío al rechazar",async()=>{await expect(service.decide(user,1,"rechazada","   ")).rejects.toMatchObject({code:"VALIDATION_ERROR"});expect(postgres.transaction).not.toHaveBeenCalled();});
  it("rechaza motivos que superan 250 caracteres",async()=>{await expect(service.decide(user,1,"rechazada","x".repeat(251))).rejects.toMatchObject({code:"VALIDATION_ERROR"});});
  it("no admite motivo al aprobar",async()=>{await expect(service.decide(user,1,"aprobada","texto indebido")).rejects.toMatchObject({code:"VALIDATION_ERROR"});});
 it("guarda el motivo, cancela la visita y libera su tarjeta al rechazar",async()=>{const before={...row("pendiente"),estado_seguimiento:"activo" as const};repo.findById.mockResolvedValue(before);repo.updateApproval.mockResolvedValue({...row("rechazada"),estado:"cancelada",estado_seguimiento:null,motivo_rechazo:"Acceso denegado"});await expect(service.decide(user,1,"rechazada","  Acceso denegado  ")).resolves.toMatchObject({estado:"cancelada",estadoAprobacion:"rechazada"});expect(repo.updateApproval).toHaveBeenCalledWith(user.id,1,"rechazada","Acceso denegado",expect.anything());expect(repo.releaseTarjeta).toHaveBeenCalledWith(3,"1",expect.anything());expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({changedFields:["estadoAprobacion","motivoRechazo","estado","estadoSeguimiento"]}),expect.anything());});
 it("impide modificar una aprobación definitiva",async()=>{repo.findById.mockResolvedValue(row("aprobada"));await expect(service.decide(user,1,"rechazada","Acceso denegado")).rejects.toMatchObject({code:"CONFLICT"});expect(repo.updateApproval).not.toHaveBeenCalled();});
});
