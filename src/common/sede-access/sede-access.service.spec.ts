import { SedeAccessService } from "./sede-access.service";
import type { AuthenticatedUser } from "../types/authenticated-user";

describe("SedeAccessService role scopes", () => {
  const postgres = { query: jest.fn() };
  const service = new SedeAccessService(postgres as never);

  beforeEach(() => jest.clearAllMocks());

  it("limita la operación del encargado de portería a su sede", async () => {
    const user: AuthenticatedUser = { id: 5, role: "encargado_porteria", sedeId: 10, empresaSeguridadId: 3 };
    await expect(service.resolveSedeIds(user)).resolves.toEqual([10]);
  });

  it("impide la operación al encargado de seguridad", async () => {
    const user: AuthenticatedUser = { id: 6, role: "encargado_seguridad", sedeId: null, empresaSeguridadId: 3 };
    await expect(service.resolveSedeIds(user)).resolves.toEqual([]);
  });

  it("resuelve tarjetas y reportes por todas las sedes activas de la empresa", async () => {
    postgres.query.mockResolvedValue([{ sede_id: "10" }, { sede_id: "20" }]);
    const securityManager: AuthenticatedUser = { id: 6, role: "encargado_seguridad", sedeId: null, empresaSeguridadId: 3 };
    const gateManager: AuthenticatedUser = { id: 5, role: "encargado_porteria", sedeId: 10, empresaSeguridadId: 3 };

    await expect(service.resolveCardSedeIds(securityManager)).resolves.toEqual([10, 20]);
    await expect(service.resolveReportSedeIds(gateManager)).resolves.toEqual([10, 20]);
    await expect(service.resolveCardSedeIds(gateManager)).resolves.toEqual([10]);
  });
});
