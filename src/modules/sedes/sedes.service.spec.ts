import { SedesService } from "./sedes.service";
import type { SedeRow } from "./sedes.types";

const sedeRow: SedeRow = {
  id: "1",
  empresa_id: "1",
  empresa_nombre: "Acme",
  nombre: "Casa Matriz",
  direccion: null,
  telefono: null,
  activo: true,
  visita_requiere_aprobacion: true,
  creado_en: "2026-07-15T10:00:00Z",
  actualizado_en: "2026-07-15T10:00:00Z",
};

describe("SedesService delete rules", () => {
  it("blocks deletion when the site has related catalogs", async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue({ id: "1" }),
      countBlockingRelations: jest.fn().mockResolvedValue(1),
      hardDelete: jest.fn(),
    };
    const service = new SedesService(repo as never);

    await expect(service.deletePermanent(1)).rejects.toMatchObject({ response: { code: "CONFLICT" }, status: 409 });
    expect(repo.hardDelete).not.toHaveBeenCalled();
  });

  it("passes the authorized site scope to the listing repository", async () => {
    const repo = {
      findAll: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 15 }),
    };
    const service = new SedesService(repo as never);

    await service.list({}, [2, 5]);

    expect(repo.findAll).toHaveBeenCalledWith(expect.objectContaining({
      page: 1,
      limit: 15,
      sedeIds: [2, 5],
    }));
  });

  it("exige aprobación de visitas por defecto al crear una sede", async () => {
    const repo = {
      empresaExists: jest.fn().mockResolvedValue(true),
      create: jest.fn().mockResolvedValue(sedeRow),
      findById: jest.fn().mockResolvedValue(sedeRow),
    };
    const service = new SedesService(repo as never);

    await service.create({ empresaId: 1, nombre: "Casa Matriz" });

    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ visitaRequiereAprobacion: true }));
  });

  it("permite crear una sede que aprueba sus visitas automáticamente", async () => {
    const repo = {
      empresaExists: jest.fn().mockResolvedValue(true),
      create: jest.fn().mockResolvedValue({ ...sedeRow, visita_requiere_aprobacion: false }),
      findById: jest.fn(),
    };
    const service = new SedesService(repo as never);

    const created = await service.create({ empresaId: 1, nombre: "Depósito", visitaRequiereAprobacion: false });

    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ visitaRequiereAprobacion: false }));
    expect(created.visitaRequiereAprobacion).toBe(false);
  });

  it("solo actualiza la aprobación de visitas cuando el campo viene en el payload", async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue(sedeRow),
      update: jest.fn().mockResolvedValue(sedeRow),
    };
    const service = new SedesService(repo as never);

    await service.update(1, { nombre: "Casa Matriz" });
    expect(repo.update).toHaveBeenCalledWith(1, expect.not.objectContaining({ visitaRequiereAprobacion: expect.anything() }));

    await service.update(1, { visitaRequiereAprobacion: false });
    expect(repo.update).toHaveBeenLastCalledWith(1, expect.objectContaining({ visitaRequiereAprobacion: false }));
  });
});
