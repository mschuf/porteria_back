import { TarjetasService } from "./tarjetas.service";

const row = (overrides: Record<string, unknown> = {}) => ({
  id: "1", sede_id: "2", sede_nombre: "Central", empresa_nombre: "Empresa", numero: 10, color: "#3B82F6", icono: "IdCard", activo: true, en_uso: false,
  creado_en: new Date(), actualizado_en: new Date(), areas: [], ...overrides,
});

describe("TarjetasService business rules", () => {
  const repo = {
    findById: jest.fn(), findByNumero: jest.fn(), findActiveAreas: jest.fn(),
    create: jest.fn(), update: jest.fn(), delete: jest.fn(), findAll: jest.fn(), activeSedeExists: jest.fn(),
  };
  const access = { assertCardSede: jest.fn(), resolveCardSedeIds: jest.fn() };
  const service = new TarjetasService(repo as never, access as never);
  const admin = { id: 1, role: "super_admin", sedeId: null, empresaSeguridadId: null } as const;
  beforeEach(() => { jest.clearAllMocks(); repo.activeSedeExists.mockResolvedValue(true); });

  it("rejects inactive cards marked as in use", async () => {
    repo.findByNumero.mockResolvedValue(null); repo.findActiveAreas.mockResolvedValue([{ id: "1" }]);
    await expect(service.create(admin, { sedeId: 2, numero: 10, color: "#3B82F6", icono: "IdCard", areaIds: [1], activo: false, enUso: true })).rejects.toMatchObject({ response: { code: "CONFLICT" }, status: 409 });
  });

  it("rejects unknown or inactive assigned areas", async () => {
    repo.findByNumero.mockResolvedValue(null); repo.findActiveAreas.mockResolvedValue([]);
    await expect(service.create(admin, { sedeId: 2, numero: 10, color: "#3B82F6", icono: "IdCard", areaIds: [1] })).rejects.toMatchObject({ response: { code: "CONFLICT" }, status: 409 });
    expect(repo.findActiveAreas).toHaveBeenCalledWith(2, [1]);
  });

  it("checks card number uniqueness within its site", async () => {
    repo.findByNumero.mockResolvedValue(row()); repo.findActiveAreas.mockResolvedValue([{ id: "1" }]);
    await expect(service.create(admin, { sedeId: 2, numero: 10, color: "#3B82F6", icono: "IdCard", areaIds: [1] })).rejects.toMatchObject({ response: { code: "CONFLICT" } });
    expect(repo.findByNumero).toHaveBeenCalledWith(2, 10);
  });

  it("blocks deletion while a card is in use", async () => {
    repo.findById.mockResolvedValue(row({ en_uso: true }));
    await expect(service.delete(admin, 1)).rejects.toMatchObject({ response: { code: "CONFLICT" }, status: 409 });
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
