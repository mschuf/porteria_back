import type { AuthenticatedUser } from "../../common/types/authenticated-user";
import { EncargadoVisitaVisitasService } from "./encargado-visita-visitas.service";
import type { VisitaListRow } from "./visitas.types";

const user:AuthenticatedUser={id:22,role:"encargado_visita",sedeId:null,empresaSeguridadId:null};
const row=(approval:"pendiente"|"aprobada"|"rechazada"):VisitaListRow=>({id:"1",persona_id:"2",sede_id:"3",usuario_creador_id:"4",motivo_visita_id:"5",motivo:"Reunión",responsable_usuario_id:"22",estado:"programada",estado_aprobacion:approval,estado_seguimiento:null,zonas_permitidas:[],credencial_numero:"1",tarjeta_color:"rojo",entrada_at:"2026-07-15T12:00:00Z",salida_at:null,observaciones:null,creado_en:"2026-07-15T10:00:00Z",actualizado_en:"2026-07-15T10:00:00Z",visitante:"Ana",documento:"123",empresa:"Proveedor",sede_nombre:"Central",responsable_nombre:"Responsable",usuario_creador_nombre:"Portero",has_foto:false,has_visita_foto:false});

describe("EncargadoVisitaVisitasService",()=>{
 const repo={findToday:jest.fn(),findAll:jest.fn(),findById:jest.fn(),updateApproval:jest.fn()};const audit={create:jest.fn()};const service=new EncargadoVisitaVisitasService(repo as never,audit as never);
 beforeEach(()=>jest.clearAllMocks());
 it("resume únicamente las filas devueltas para el responsable",async()=>{repo.findToday.mockResolvedValue([row("pendiente"),{...row("aprobada"),id:"2"}]);const result=await service.summary(user);expect(repo.findToday).toHaveBeenCalledWith(user.id,expect.any(Date),expect.any(Date));expect(result.metrics).toEqual({today:2,approved:1,pending:1});});
 it("permite aprobar una visita rechazada y audita el cambio",async()=>{repo.findById.mockResolvedValue(row("rechazada"));repo.updateApproval.mockResolvedValue(row("aprobada"));await expect(service.decide(user,1,"aprobada")).resolves.toMatchObject({estadoAprobacion:"aprobada"});expect(repo.updateApproval).toHaveBeenCalledWith(user.id,1,"aprobada");expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({changedFields:["estadoAprobacion"]}));});
 it("impide modificar una aprobación definitiva",async()=>{repo.findById.mockResolvedValue(row("aprobada"));await expect(service.decide(user,1,"rechazada")).rejects.toMatchObject({code:"CONFLICT"});expect(repo.updateApproval).not.toHaveBeenCalled();});
});
