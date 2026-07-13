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
  };
  let service: UsuariosAdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsuariosAdminService(repo as never);
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
    repo.findActiveEmpresaAssignments.mockResolvedValue([
      { empresa_id: "2", empresa_nombre: "Empresa A" },
      { empresa_id: "8", empresa_nombre: "Empresa B" },
    ]);

    await expect(service.explainAssignment(12)).resolves.toEqual(
      expect.objectContaining({
        tipo: "empresa",
        empresas: [
          { id: 2, nombre: "Empresa A" },
          { id: 8, nombre: "Empresa B" },
        ],
      }),
    );
  });

  it("devuelve la cadena completa del portero", async () => {
    repo.findById.mockResolvedValue(makeUsuario());
    repo.findActivePorteriaAssignment.mockResolvedValue({
      empresa_porteria_id: "4",
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
});
