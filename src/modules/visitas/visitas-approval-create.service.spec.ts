import type { AuthenticatedUser } from "../../common/types/authenticated-user";
import { VisitasService } from "./visitas.service";
import type { VisitaListRow } from "./visitas.types";

const actor:AuthenticatedUser={id:7,role:"portero",sedeId:10,empresaSeguridadId:3};
const dto={personaId:2,motivoVisitaId:3,responsableId:8,tarjetaColor:"rojo" as const,credencialNumero:"1"};
const created:VisitaListRow={id:"1",persona_id:"2",sede_id:"10",usuario_creador_id:"7",motivo_visita_id:"3",motivo:"Reunión",responsable_usuario_id:"8",estado:"programada",estado_aprobacion:"pendiente",motivo_rechazo:null,estado_seguimiento:null,zonas_permitidas:["administración"],credencial_numero:"1",tarjeta_color:"rojo",entrada_at:"2026-07-15T12:00:00Z",salida_at:null,observaciones:null,creado_en:"2026-07-15T10:00:00Z",actualizado_en:"2026-07-15T10:00:00Z",visitante:"Ana",documento:"123",empresa:"Proveedor",sede_nombre:"Central",responsable_nombre:"Responsable",usuario_creador_nombre:"Portero",has_foto:false,has_visita_foto:false};

describe("VisitasService creación con aprobación",()=>{
 const repo={create:jest.fn(),setTarjetaEnUso:jest.fn(),isEncargadoVisitaAssignedToSede:jest.fn(),findTarjetaCandidates:jest.fn(),findActiveByPersonaId:jest.fn()};
 const audit={create:jest.fn()};
 const personas={findById:jest.fn(),updateUltimosVisita:jest.fn()};
 const motivos={assertActiveMotivoVisita:jest.fn()};
 const users={findById:jest.fn()};
 const access={resolveSedeIds:jest.fn()};
 const mail={send:jest.fn()};
 const config={get:jest.fn().mockReturnValue("https://porteria.example")};
 const notifications={publishCorreoFallido:jest.fn()};
 let service:VisitasService;
 beforeEach(()=>{
  jest.clearAllMocks();
  personas.findById.mockResolvedValue({id:"2",sede_id:"10",activo:true,proveedor_nombre:"Proveedor",proveedor_activo:true});
  motivos.assertActiveMotivoVisita.mockResolvedValue({id:3,nombre:"Reunión",sedeId:10});
  repo.create.mockResolvedValue(created);
  mail.send.mockResolvedValue({sent:true,error:null});
  users.findById.mockResolvedValue({id:8,isActive:true,userTitle:"admin_empresa",fullName:"Responsable",email:"responsable@example.com"});
  service=new VisitasService(repo as never,audit as never,personas as never,motivos as never,users as never,access as never,mail as never,config as never,notifications as never);
 });
 it("avisa en tiempo real cuando el correo no se envía",async()=>{
  mail.send.mockResolvedValue({sent:false,error:"timeout"});
  const result=await service.create(actor,dto);
  await waitForScheduledMail();
  expect(notifications.publishCorreoFallido).toHaveBeenCalledWith(actor.id,result.id);
 });
 const waitForScheduledMail=()=>new Promise<void>((resolve)=>setImmediate(resolve));
 it("crea toda visita como programada y pendiente sin esperar el correo",async()=>{
  const result=await service.create(actor,dto);
  expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({estado:"programada",estadoAprobacion:"pendiente",responsableUsuarioId:8}));
  expect(result.notificacionCorreo).toEqual({requerida:true,programada:true,enviada:false,advertencia:null});
  await waitForScheduledMail();
  expect(mail.send).toHaveBeenCalledWith(expect.objectContaining({recipients:[{name:"Responsable",email:"responsable@example.com"}],text:expect.stringContaining("https://porteria.example/aprobacion-visitas")}));
 });
 it("responde aunque el proveedor de correo siga pendiente",async()=>{
  let finishMail:((value:{sent:boolean;error:null})=>void)|undefined;
  mail.send.mockReturnValue(new Promise((resolve)=>{finishMail=resolve;}));
  const result=await service.create(actor,dto);
  expect(result.id).toBe(1);
  expect(result.notificacionCorreo).toEqual({requerida:true,programada:true,enviada:false,advertencia:null});
  await waitForScheduledMail();
  finishMail?.({sent:true,error:null});
 });
 it("rechaza un portero como responsable antes de persistir",async()=>{
  users.findById.mockResolvedValue({id:8,isActive:true,userTitle:"portero",fullName:"Portero",email:"p@example.com"});
  await expect(service.create(actor,dto)).rejects.toMatchObject({code:"VALIDATION_ERROR"});
  expect(repo.create).not.toHaveBeenCalled();
  expect(mail.send).not.toHaveBeenCalled();
 });
});
