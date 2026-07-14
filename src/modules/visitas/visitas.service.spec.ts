import { VisitasService } from "./visitas.service";
import type { AuthenticatedUser } from "../../common/types/authenticated-user";
import type { VisitaListRow, VisitaTarjetaCandidateRow } from "./visitas.types";

const portero: AuthenticatedUser = { id: 7, role: "portero", sedeId: 10, empresaSeguridadId: 3 };

function makeRow(overrides: Partial<VisitaListRow> = {}): VisitaListRow {
  return {
    id: "1",
    persona_id: "2",
    sede_id: "10",
    usuario_creador_id: "7",
    motivo_visita_id: "3",
    motivo: "Reunión",
    responsable_usuario_id: "8",
    estado: "activa",
    estado_seguimiento: "activo",
    zonas_permitidas: ["administración"],
    credencial_numero: "1",
    tarjeta_color: "rojo",
    entrada_at: "2026-07-10T10:00:00.000Z",
    salida_at: null,
    observaciones: null,
    creado_en: "2026-07-10T10:00:00.000Z",
    actualizado_en: "2026-07-10T10:00:00.000Z",
    visitante: "Visitante",
    documento: "123",
    empresa: "Proveedor",
    sede_nombre: "Sede Central",
    responsable_nombre: "Responsable",
    usuario_creador_nombre: "Portero",
    has_foto: false,
    has_visita_foto: false,
    ...overrides,
  };
}

function makeTarjeta(overrides: Partial<VisitaTarjetaCandidateRow> = {}): VisitaTarjetaCandidateRow {
  return {
    id: "5",
    numero: 20,
    sede_id: "10",
    sede_nombre: "Sede Central",
    color: "#EF4444",
    icono: "IdCard",
    areas: [{ id: 1, nombre: "Administración" }],
    activo: true,
    en_uso: false,
    ocupada_por_visita: false,
    ...overrides,
  };
}

describe("VisitasService alcance por sede", () => {
  const repo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    findStaleCandidates: jest.fn(),
    markStaleWithoutCheckout: jest.fn(),
    getMetrics: jest.fn(),
    findAdminSedeIds: jest.fn(),
    findAllActiveSedeIds: jest.fn(),
    findTarjetaCandidates: jest.fn(),
  };
  const auditRepo = { create: jest.fn() };
  const personasRepo = { findById: jest.fn(), updateUltimosVisita: jest.fn() };
  const motivos = { assertActiveMotivoVisita: jest.fn() };
  const users = { findById: jest.fn(), listAll: jest.fn() };
  const access = { resolveSedeIds: jest.fn(async (user: AuthenticatedUser) => user.role === "super_admin" ? undefined : user.role === "portero" ? [user.sedeId!] : [10, 11]) };
  let service: VisitasService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo.findStaleCandidates.mockResolvedValue([]);
    repo.markStaleWithoutCheckout.mockResolvedValue([]);
    service = new VisitasService(
      repo as never,
      auditRepo as never,
      personasRepo as never,
      motivos as never,
      users as never,
      access as never,
    );
  });

  it("limita el listado a la sede del portero", async () => {
    repo.findAll.mockResolvedValue({ items: [], total: 0, page: 1, limit: 15 });
    await service.list(portero, {});
    expect(repo.findAll).toHaveBeenCalledWith(expect.objectContaining({ sedeIds: [10] }));
  });

  it("busca por id dentro de la sede y oculta visitas ajenas", async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.findById(portero, 99)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(repo.findById).toHaveBeenCalledWith(99, [10]);
  });

  it("cancela cualquier visita sin borrarla físicamente", async () => {
    const current = makeRow({ estado: "finalizada" });
    const cancelled = makeRow({ estado: "cancelada", estado_seguimiento: null });
    repo.findById.mockResolvedValue(current);
    repo.update.mockResolvedValue(cancelled);

    await expect(service.deletePermanent(portero, 1)).resolves.toEqual({ id: 1, cancelled: true });
    expect(repo.update).toHaveBeenCalledWith(1, { estado: "cancelada", estadoSeguimiento: null });
    expect(auditRepo.create).toHaveBeenCalledWith(expect.objectContaining({ visitaId: 1 }));
  });

  it("aplica la sede del portero a métricas", async () => {
    repo.getMetrics.mockResolvedValue({
      month_visits: "0", day_visits: "0", active_only_admin: "0",
      active_only_factory: "0", active_both_zones: "0", active_stale_without_checkout: "0",
    });
    await service.getMetrics(portero);
    expect(repo.getMetrics).toHaveBeenCalledWith(expect.any(Object), [10]);
  });

  it("limita las tarjetas candidatas del portero a su sede y marca las ocupadas", async () => {
    repo.findTarjetaCandidates.mockResolvedValue([
      makeTarjeta({ ocupada_por_visita: true }),
    ]);

    const result = await service.listTarjetaCandidates(portero, { visitaSedeId: 10 });

    expect(repo.findTarjetaCandidates).toHaveBeenCalledWith(expect.objectContaining({ sedeIds: [10] }));
    expect(result.items[0]).toMatchObject({ enUso: true, selectable: false, blockedReason: "in_use" });
  });

  it("muestra todas las sedes autorizadas al administrador y bloquea la sede diferente", async () => {
    const admin: AuthenticatedUser = { id: 9, role: "admin_empresa", sedeId: null, empresaSeguridadId: null };
    repo.findTarjetaCandidates.mockResolvedValue([
      makeTarjeta({ sede_id: "11", sede_nombre: "Sucursal" }),
    ]);

    const result = await service.listTarjetaCandidates(admin, { visitaSedeId: 10 });

    expect(repo.findTarjetaCandidates).toHaveBeenCalledWith(expect.objectContaining({ sedeIds: [10, 11] }));
    expect(result.items[0]).toMatchObject({ selectable: false, blockedReason: "different_sede" });
  });

  it("solo excluye la propia visita si está dentro del alcance del usuario", async () => {
    repo.findById.mockResolvedValue(makeRow());
    repo.findTarjetaCandidates.mockResolvedValue([makeTarjeta()]);

    await service.listTarjetaCandidates(portero, { excludeVisitaId: 1, visitaSedeId: 10 });

    expect(repo.findById).toHaveBeenCalledWith(1, [10]);
    expect(repo.findTarjetaCandidates).toHaveBeenCalledWith(
      expect.objectContaining({ excludeVisitaId: 1 }),
    );
  });
});
