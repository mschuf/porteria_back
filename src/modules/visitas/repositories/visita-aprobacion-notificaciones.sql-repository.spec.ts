import { VisitaAprobacionNotificacionesSqlRepository } from "./visita-aprobacion-notificaciones.sql-repository";

describe("VisitaAprobacionNotificacionesSqlRepository",()=>{
 it("deduplica creador y usuarios activos de la sede mediante UNION",async()=>{
  const client={query:jest.fn().mockResolvedValue({rows:[]})};
  const repo=new VisitaAprobacionNotificacionesSqlRepository({} as never);
  const visit={id:"9",sede_id:"3",usuario_creador_id:"4",visitante:"Ana",sede_nombre:"Central"};
  await repo.createForVisitRecipients(visit as never,"rechazada","Sin autorización",client as never);
  const [sql,params]=client.query.mock.calls[0];
  expect(sql).toContain("SELECT DISTINCT u.id");expect(sql).toContain("UNION");expect(sql).toContain("u.rol IN ('portero','encargado_porteria')");
  expect(params).toEqual(["3","4","9","rechazada","Sin autorización","Ana","Central"]);
 });
});
