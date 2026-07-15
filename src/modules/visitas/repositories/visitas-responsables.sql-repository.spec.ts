import { VisitasSqlRepository } from "./visitas.sql-repository";

describe("VisitasSqlRepository responsables",()=>{
 it("excluye porteros incluso con alcance global",async()=>{
  const postgres={query:jest.fn().mockResolvedValue([])};
  const repo=new VisitasSqlRepository(postgres as never);
  await repo.findResponsableCandidates(undefined);
  expect(postgres.query.mock.calls[0][0]).toContain("u.rol <> 'portero'");
 });
});
