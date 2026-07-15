import * as bcrypt from "bcryptjs";
import { API_ERROR_CODE } from "../../common/types/api-error-code";
import { AuthService } from "./auth.service";
import type { UsuarioAuthRow } from "./repositories/usuarios.sql-repository";

describe("AuthService", () => {
  const validPassword = "clave-segura";
  const passwordHash = bcrypt.hashSync(validPassword, 4);
  const usuario: UsuarioAuthRow = {
    id: 7,
    usuario: "portero.demo",
    contrasenaHash: passwordHash,
    nombre: "Portero Demo",
    correo: "portero@example.com",
    rol: "portero",
    requiereCambioContrasena: false,
  };

  const config = {
    get: jest.fn((key: string) => {
      if (key === "jwt.expiresIn") return "8h";
      return undefined;
    }),
  };
  const jwt = {
    signAsync: jest.fn(async (payload) => `token:${JSON.stringify(payload)}`),
  };
  const crypto = {
    decrypt: jest.fn(() => validPassword),
  };
  const usuariosRepo = {
    findActiveByUsuario: jest.fn(),
    findActiveById: jest.fn(),
    findActivePorteriaAssignment: jest.fn(),
    updateUltimoAcceso: jest.fn(),
  };
  const access = { listAuthorizedSedes: jest.fn().mockResolvedValue([]) };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    usuariosRepo.findActiveByUsuario.mockResolvedValue(usuario);
    usuariosRepo.findActiveById.mockResolvedValue(usuario);
    usuariosRepo.findActivePorteriaAssignment.mockResolvedValue({
      sedeId: 10,
      sedeName: "Sede Central",
      empresaId: 2,
      empresaName: "Empresa Receptora",
      empresaSeguridadId: 4,
      empresaPorteriaName: "Seguridad Integral",
    });
    usuariosRepo.updateUltimoAcceso.mockResolvedValue(undefined);
    service = new AuthService(
      config as never,
      jwt as never,
      crypto as never,
      usuariosRepo as never,
      access as never,
    );
  });

  it("autentica usuario activo con bcrypt valido y firma JWT con rol local", async () => {
    const result = await service.loginWithCredentials(" portero.demo ", validPassword);

    expect(usuariosRepo.findActiveByUsuario).toHaveBeenCalledWith("portero.demo");
    expect(usuariosRepo.updateUltimoAcceso).toHaveBeenCalledWith(7);
    expect(jwt.signAsync).toHaveBeenCalledWith({
      sub: 7,
      role: "portero",
      sedeId: 10,
      empresaSeguridadId: 4,
    });
    expect(result.user).toEqual({
      id: 7,
      role: "portero",
      sedeId: 10,
      empresaSeguridadId: 4,
      login: "portero.demo",
      name: "Portero Demo",
      email: "portero@example.com",
      sedeName: "Sede Central",
      empresaName: "Empresa Receptora",
      empresaPorteriaName: "Seguridad Integral",
      requiereCambioContrasena: false,
      sedes: [{ id: 10, nombre: "Sede Central", empresaId: 2, empresaNombre: "Empresa Receptora" }],
    });
    expect(result.expiresIn).toBe("8h");
  });

  it("rechaza usuario inexistente o inactivo", async () => {
    usuariosRepo.findActiveByUsuario.mockResolvedValue(null);

    await expect(service.loginWithCredentials("no.existe", validPassword)).rejects.toMatchObject({
      code: API_ERROR_CODE.AUTH_INVALID_CREDENTIALS,
    });
    expect(usuariosRepo.updateUltimoAcceso).not.toHaveBeenCalled();
  });

  it("rechaza contrasena incorrecta", async () => {
    await expect(service.loginWithCredentials("portero.demo", "incorrecta")).rejects.toMatchObject({
      code: API_ERROR_CODE.AUTH_INVALID_CREDENTIALS,
    });
    expect(usuariosRepo.updateUltimoAcceso).not.toHaveBeenCalled();
  });

  it("descifra password RSA antes de autenticar", async () => {
    await service.loginWithEncryptedCredentials("portero.demo", "ciphertext");

    expect(crypto.decrypt).toHaveBeenCalledWith("ciphertext");
    expect(usuariosRepo.findActiveByUsuario).toHaveBeenCalledWith("portero.demo");
  });
});
