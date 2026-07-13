import { AreasService } from "./areas.service";

describe("AreasService business rules", () => {
  const area = { id: "1", sede_id: "2", sede_nombre: "Central", empresa_nombre: "Empresa", nombre: "Deposito", activo: true, creado_en: new Date(), actualizado_en: new Date() };
  const repo = { findById: jest.fn(), findByNombre: jest.fn(), countAssignments: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), findAll: jest.fn(), activeSedeExists: jest.fn() };
  const access = { assertSede: jest.fn(), resolveSedeIds: jest.fn() };
  const service = new AreasService(repo as never, access as never);
  const admin = { id: 1, role: "super_admin", sedeId: null } as const;
  beforeEach(() => jest.clearAllMocks());

  it("blocks deactivation when assigned", async () => {
    repo.findById.mockResolvedValue(area); repo.countAssignments.mockResolvedValue(1);
    await expect(service.deactivate(admin, 1)).rejects.toMatchObject({ response: { code: "CONFLICT" }, status: 409 });
  });

  it("blocks deletion when assigned", async () => {
    repo.findById.mockResolvedValue(area); repo.countAssignments.mockResolvedValue(1);
    await expect(service.delete(admin, 1)).rejects.toMatchObject({ response: { code: "CONFLICT" }, status: 409 });
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("checks area name uniqueness within its site", async () => {
    repo.activeSedeExists.mockResolvedValue(true); repo.findByNombre.mockResolvedValue(area);
    await expect(service.create(admin, { sedeId: 2, nombre: "Recepción" })).rejects.toMatchObject({ response: { code: "CONFLICT" } });
    expect(repo.findByNombre).toHaveBeenCalledWith(2, "Recepción");
  });
});
