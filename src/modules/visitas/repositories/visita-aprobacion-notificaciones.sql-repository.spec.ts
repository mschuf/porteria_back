import { VisitaAprobacionNotificacionesSqlRepository } from "./visita-aprobacion-notificaciones.sql-repository";

describe("VisitaAprobacionNotificacionesSqlRepository",()=>{
 it("deduplica destinatarios y asigna un único grupo a la decisión",async()=>{
  const client={query:jest.fn().mockResolvedValue({rows:[]})};
  const repo=new VisitaAprobacionNotificacionesSqlRepository({} as never);
  const visit={id:"9",sede_id:"3",usuario_creador_id:"4",responsable_usuario_id:"8",visitante:"Ana",sede_nombre:"Central"};
  await repo.createForVisitRecipients(visit as never,"rechazada","Sin autorización",22,client as never);
  const [sql,params]=client.query.mock.calls[0];
  expect(sql).toContain("nextval('public.visita_aprobacion_notificacion_grupo_seq')");
  expect(sql).toContain("notification_group.id");
  expect(sql).toContain("SELECT DISTINCT u.id");expect(sql).toContain("UNION");expect(sql).toContain("u.rol IN ('portero','encargado_porteria')");expect(sql).toContain("u.id<>$9");
  expect(params).toEqual(["3","4","9","rechazada","Sin autorización","Ana","Central","8",22]);
 });
 it("omite al iniciar sesión cualquier grupo que ya tenga una confirmación",async()=>{
  const postgres={query:jest.fn().mockResolvedValue([])};
  const repo=new VisitaAprobacionNotificacionesSqlRepository(postgres as never);
  await expect(repo.findPending(4)).resolves.toEqual([]);
  const [sql,params]=postgres.query.mock.calls[0];
  expect(sql).toContain("sibling.grupo_decision_id=visita_aprobacion_notificacion.grupo_decision_id");
  expect(sql).toContain("sibling.confirmado_en IS NOT NULL");
  expect(params).toEqual([4]);
 });
 it("confirma atómicamente todo el grupo y devuelve sus destinatarios",async()=>{
  const postgres={query:jest.fn().mockResolvedValue([{grupo_decision_id:"31",destinatario_ids:["3","4"]}])};
  const repo=new VisitaAprobacionNotificacionesSqlRepository(postgres as never);
  await expect(repo.confirm(3,8)).resolves.toEqual({grupoDecisionId:31,destinatarioIds:[3,4]});
  const [sql,params]=postgres.query.mock.calls[0];
  expect(sql).toContain("WHERE id=$1 AND usuario_destinatario_id=$2");
  expect(sql).toContain("notification.grupo_decision_id=target.grupo_decision_id");
  expect(sql).toContain("COALESCE(notification.confirmado_en,now())");
  expect(params).toEqual([8,3]);
 });
 it("es idempotente y solo devuelve null cuando el usuario no es destinatario",async()=>{
  const postgres={query:jest.fn().mockResolvedValue([])};
  const repo=new VisitaAprobacionNotificacionesSqlRepository(postgres as never);
  await expect(repo.confirm(3,99)).resolves.toBeNull();
 });
});
