import { EncargadoVisitaVisitasSqlRepository } from "./encargado-visita-visitas.sql-repository";

describe("EncargadoVisitaVisitasSqlRepository",()=>{
 const access={userId:22,subordinateRoles:["portero" as const],sedeIds:[3]};
 it("mantiene visibles las rechazadas aunque estén canceladas",async()=>{
  const postgres={query:jest.fn().mockResolvedValue([])};
  const repo=new EncargadoVisitaVisitasSqlRepository(postgres as never);
  await repo.findToday(access,new Date("2026-07-15"),new Date("2026-07-16"));
  expect(postgres.query.mock.calls[0][0]).toContain("v.estado_aprobacion='rechazada'");
 });
 it("activa una visita cuando se aprueba",async()=>{
  const client={query:jest.fn().mockResolvedValueOnce({rows:[{id:"1"}]}).mockResolvedValueOnce({rows:[]})};
  const repo=new EncargadoVisitaVisitasSqlRepository({} as never);
  await repo.updateApproval(access,1,"aprobada",null,client as never);
  expect(client.query.mock.calls[0][0]).toContain("WHEN $2='aprobada' THEN 'activa'");
 });
 it("ocupa la tarjeta solo si continúa disponible",async()=>{
  const client={query:jest.fn().mockResolvedValue({rows:[{id:"9"}]})};
  const repo=new EncargadoVisitaVisitasSqlRepository({} as never);
  await expect(repo.claimTarjeta(3,"1",7,client as never)).resolves.toBe(true);
  expect(client.query.mock.calls[0][0]).toContain("propia.estado='programada'");
  expect(client.query.mock.calls[0][0]).toContain("v.estado IN ('programada','activa','sin_salida')");
 });
});
