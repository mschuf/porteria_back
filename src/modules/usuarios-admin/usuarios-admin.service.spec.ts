import { UsuariosAdminService } from "./usuarios-admin.service";
import type { UsuarioAdminRow } from "./usuarios-admin.types";

function makeUsuario(overrides: Partial<UsuarioAdminRow> = {}): UsuarioAdminRow {
  return {
    id: "12",
    usuario: "jperez",
    nombre: "Juan Pérez",
    correo: "jperez@example.com",
    rol: "portero",
    activo: true,
    creado_en: "2026-07-10T10:00:00.000Z",
    actualizado_en: "2026-07-10T10:00:00.000Z",
    ...overrides,
  };
}

describe("UsuariosAdminService explicación de asignaciones", () => {
  const repo = {
    findById: jest.fn(),
    findActiveEmpresaAssignments: jest.fn(),
    findActivePorteriaAssignment: jest.fn(),
    findByUsuario: jest.fn(),
    findSedeCompanyIds: jest.fn(),
    createWithSedes: jest.fn(),
    securityCompanyExists: jest.fn(),
    findPorteriaTarget: jest.fn(),
    updateWithPorteriaAssignment: jest.fn(),
    updateWithSedes: jest.fn(),
    update: jest.fn(),
    setActivo: jest.fn(),
  };
  let service: UsuariosAdminService;
  const access = {
    listAuthorizedSedes: jest.fn(),
    listAssignedSedes: jest.fn(),
    listSecurityCompanySedeIds: jest.fn(),
    resolveSedeIds: jest.fn(),
    assertSede: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsuariosAdminService(repo as never, access as never);
  });

  it("explica el acceso global sin consultar asignaciones", async () => {
    repo.findById.mockResolvedValue(makeUsuario({ rol: "super_admin" }));

    await expect(service.explainAssignment(12)).resolves.toEqual(
      expect.objectContaining({ tipo: "global", usuario: expect.objectContaining({ id: 12 }) }),
    );
    expect(repo.findActiveEmpresaAssignments).not.toHaveBeenCalled();
    expect(repo.findActivePorteriaAssignment).not.toHaveBeenCalled();
  });

  it("devuelve todas las empresas activas del administrador", async () => {
    repo.findById.mockResolvedValue(makeUsuario({ rol: "admin_empresa" }));
    access.listAssignedSedes.mockResolvedValue([
      { id: 3, nombre: "Central", empresaId: 2, empresaNombre: "Empresa A" },
      { id: 4, nombre: "Sucursal", empresaId: 2, empresaNombre: "Empresa A" },
    ]);

    await expect(service.explainAssignment(12)).resolves.toEqual(
      expect.objectContaining({
        tipo: "sedes",
        empresa: { id: 2, nombre: "Empresa A" },
        sedes: [{ id: 3, nombre: "Central" }, { id: 4, nombre: "Sucursal" }],
      }),
    );
  });

  it("devuelve la cadena completa del portero", async () => {
    repo.findById.mockResolvedValue(makeUsuario());
    repo.findActivePorteriaAssignment.mockResolvedValue({
      empresa_seguridad_id: "4",
      empresa_porteria_nombre: "Seguridad",
      sede_id: "6",
      sede_nombre: "Casa central",
      empresa_id: "2",
      empresa_nombre: "Empresa A",
    });

    await expect(service.explainAssignment(12)).resolves.toMatchObject({
      tipo: "porteria",
      asignacion: {
        empresaPorteria: { id: 4, nombre: "Seguridad" },
        sede: { id: 6, nombre: "Casa central" },
        empresa: { id: 2, nombre: "Empresa A" },
      },
    });
  });

  it("representa explícitamente un portero sin asignación vigente", async () => {
    repo.findById.mockResolvedValue(makeUsuario({ activo: false }));
    repo.findActivePorteriaAssignment.mockResolvedValue(null);

    await expect(service.explainAssignment(12)).resolves.toMatchObject({
      tipo: "porteria",
      usuario: { activo: false },
      asignacion: null,
    });
  });

  it("rechaza un usuario inexistente", async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.explainAssignment(99)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("crea encargado_visita mediante usuario_sede", async () => {
    repo.findByUsuario.mockResolvedValue(null);
    const companies = new Set([2]) as Set<number> & { missing?: boolean };
    companies.missing = false;
    repo.findSedeCompanyIds.mockResolvedValue(companies);
    repo.createWithSedes.mockResolvedValue(makeUsuario({ rol: "encargado_visita" }));

    await service.create({
      usuario: "responsable.visita",
      nombre: "Responsable Visita",
      rol: "encargado_visita",
      password: "ClaveSegura123",
      sedeIds: [3, 4],
    }, { id: 1, role: "super_admin", sedeId: null, empresaSeguridadId: null });

    expect(repo.createWithSedes).toHaveBeenCalledWith(
      expect.objectContaining({ rol: "encargado_visita" }),
      [3, 4],
    );
  });

  it("permite que admin_empresa promueva un portero a encargado_seguridad dentro de su alcance", async () => {
    repo.findById.mockResolvedValue(makeUsuario({ rol: "portero" }));
    repo.findActivePorteriaAssignment.mockResolvedValue({
      empresa_seguridad_id: "4",
      empresa_porteria_nombre: "Seguridad",
      sede_id: "6",
      sede_nombre: "Casa central",
      empresa_id: "2",
      empresa_nombre: "Empresa A",
    });
    access.resolveSedeIds.mockResolvedValue([6]);
    access.listSecurityCompanySedeIds.mockResolvedValue([6, 9]);
    repo.securityCompanyExists.mockResolvedValue(true);
    repo.updateWithPorteriaAssignment.mockResolvedValue(makeUsuario({ rol: "encargado_seguridad" }));

    await expect(service.update(12, {
      rol: "encargado_seguridad",
      porteriaAssignment: { empresaPorteriaId: 4 },
    }, { id: 20, role: "admin_empresa", sedeId: null, empresaSeguridadId: null })).resolves.toMatchObject({
      rol: "encargado_seguridad",
    });

    expect(repo.updateWithPorteriaAssignment).toHaveBeenCalledWith(
      12,
      { rol: "encargado_seguridad" },
      4,
      null,
    );
  });

  it("permite que admin_empresa degrade un encargado_seguridad a portero en una sede autorizada", async () => {
    repo.findById.mockResolvedValue(makeUsuario({ rol: "encargado_seguridad" }));
    repo.findActivePorteriaAssignment.mockResolvedValue({
      empresa_seguridad_id: "4",
      empresa_porteria_nombre: "Seguridad",
      sede_id: null,
      sede_nombre: null,
      empresa_id: null,
      empresa_nombre: null,
    });
    access.resolveSedeIds.mockResolvedValue([6]);
    access.listSecurityCompanySedeIds.mockResolvedValue([6, 9]);
    repo.findPorteriaTarget.mockResolvedValue(6);
    repo.updateWithPorteriaAssignment.mockResolvedValue(makeUsuario({ rol: "portero" }));

    await expect(service.update(12, {
      rol: "portero",
      porteriaAssignment: { empresaPorteriaId: 4, sedeEmpresaPorteriaId: 10 },
    }, { id: 20, role: "admin_empresa", sedeId: null, empresaSeguridadId: null })).resolves.toMatchObject({
      rol: "portero",
    });

    expect(access.assertSede).toHaveBeenCalledWith(
      { id: 20, role: "admin_empresa", sedeId: null, empresaSeguridadId: null },
      6,
    );
    expect(repo.updateWithPorteriaAssignment).toHaveBeenCalledWith(12, { rol: "portero" }, 4, 10);
  });

  it.each([
    ["portero", "encargado_porteria"],
    ["encargado_porteria", "portero"],
  ] as const)("permite que admin_empresa cambie el rol de sede %s a %s", async (sourceRole, targetRole) => {
    repo.findById.mockResolvedValue(makeUsuario({ rol: sourceRole }));
    repo.findActivePorteriaAssignment.mockResolvedValue({
      empresa_seguridad_id: "4",
      empresa_porteria_nombre: "Seguridad",
      sede_id: "6",
      sede_nombre: "Casa central",
      empresa_id: "2",
      empresa_nombre: "Empresa A",
    });
    access.resolveSedeIds.mockResolvedValue([6]);
    repo.update.mockResolvedValue(makeUsuario({ rol: targetRole }));

    await expect(service.update(12, {
      rol: targetRole,
    }, { id: 20, role: "admin_empresa", sedeId: null, empresaSeguridadId: null })).resolves.toMatchObject({
      rol: targetRole,
    });

    expect(repo.update).toHaveBeenCalledWith(12, { rol: targetRole });
    expect(repo.updateWithPorteriaAssignment).not.toHaveBeenCalled();
  });

  it("permite que admin_empresa promueva un portero a encargado_visita en sus sedes", async () => {
    repo.findById.mockResolvedValue(makeUsuario({ rol: "portero" }));
    repo.findActivePorteriaAssignment.mockResolvedValue({
      empresa_seguridad_id: "4",
      empresa_porteria_nombre: "Seguridad",
      sede_id: "6",
      sede_nombre: "Casa central",
      empresa_id: "2",
      empresa_nombre: "Empresa A",
    });
    const companies = new Set([2]) as Set<number> & { missing?: boolean };
    companies.missing = false;
    repo.findSedeCompanyIds.mockResolvedValue(companies);
    access.resolveSedeIds.mockResolvedValue([6]);
    repo.updateWithSedes.mockResolvedValue(makeUsuario({ rol: "encargado_visita" }));

    await expect(service.update(12, {
      rol: "encargado_visita",
      sedeIds: [6],
    }, { id: 20, role: "admin_empresa", sedeId: null, empresaSeguridadId: null })).resolves.toMatchObject({
      rol: "encargado_visita",
    });

    expect(repo.updateWithSedes).toHaveBeenCalledWith(12, { rol: "encargado_visita" }, [6]);
  });

  it("permite que admin_empresa degrade un encargado_visita a portero en una sede autorizada", async () => {
    repo.findById.mockResolvedValue(makeUsuario({ rol: "encargado_visita" }));
    access.listAssignedSedes.mockResolvedValue([
      { id: 6, nombre: "Casa central", empresaId: 2, empresaNombre: "Empresa A" },
    ]);
    access.resolveSedeIds.mockResolvedValue([6]);
    repo.findPorteriaTarget.mockResolvedValue(6);
    repo.updateWithPorteriaAssignment.mockResolvedValue(makeUsuario({ rol: "portero" }));

    await expect(service.update(12, {
      rol: "portero",
      porteriaAssignment: { empresaPorteriaId: 4, sedeEmpresaPorteriaId: 10 },
    }, { id: 20, role: "admin_empresa", sedeId: null, empresaSeguridadId: null })).resolves.toMatchObject({
      rol: "portero",
    });

    expect(repo.updateWithPorteriaAssignment).toHaveBeenCalledWith(12, { rol: "portero" }, 4, 10);
  });

  it("permite que admin_empresa reactive un encargado_visita inactivo de su sede", async () => {
    repo.findById.mockResolvedValue(makeUsuario({ rol: "encargado_visita", activo: false }));
    access.listAssignedSedes.mockResolvedValue([
      { id: 6, nombre: "Casa central", empresaId: 2, empresaNombre: "Empresa A" },
    ]);
    access.resolveSedeIds.mockResolvedValue([6]);
    repo.setActivo.mockResolvedValue(makeUsuario({ rol: "encargado_visita", activo: true }));

    await expect(service.activate(12, {
      id: 20,
      role: "admin_empresa",
      sedeId: null,
      empresaSeguridadId: null,
    })).resolves.toMatchObject({ rol: "encargado_visita", activo: true });
  });

  it("rechaza promover a encargado_seguridad de una empresa fuera del alcance del admin_empresa", async () => {
    repo.findById.mockResolvedValue(makeUsuario({ rol: "portero" }));
    repo.findActivePorteriaAssignment.mockResolvedValue({
      empresa_seguridad_id: "4",
      empresa_porteria_nombre: "Seguridad",
      sede_id: "6",
      sede_nombre: "Casa central",
      empresa_id: "2",
      empresa_nombre: "Empresa A",
    });
    access.resolveSedeIds.mockResolvedValue([6]);
    access.listSecurityCompanySedeIds.mockResolvedValue([9]);
    repo.securityCompanyExists.mockResolvedValue(true);

    await expect(service.update(12, {
      rol: "encargado_seguridad",
      porteriaAssignment: { empresaPorteriaId: 5 },
    }, { id: 20, role: "admin_empresa", sedeId: null, empresaSeguridadId: null })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(repo.updateWithPorteriaAssignment).not.toHaveBeenCalled();
  });
});
