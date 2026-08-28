import * as bcrypt from "bcryptjs";
import { HttpStatus } from "@nestjs/common";
import { API_ERROR_CODE } from "../../common/types/api-error-code";
import { BusinessException } from "../../common/exceptions/business.exception";
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
  const loginThrottle = {
    assertAllowed: jest.fn(),
    recordFailure: jest.fn(),
    clear: jest.fn(),
  };

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
      visitaRequiereAprobacion: true,
    });
    usuariosRepo.updateUltimoAcceso.mockResolvedValue(undefined);
    loginThrottle.assertAllowed.mockResolvedValue(undefined);
    loginThrottle.recordFailure.mockResolvedValue(19);
    loginThrottle.clear.mockResolvedValue(undefined);
    service = new AuthService(
      config as never,
      jwt as never,
      crypto as never,
      usuariosRepo as never,
      access as never,
      loginThrottle as never,
    );
  });

  it("autentica usuario activo con bcrypt valido y firma JWT con rol local", async () => {
    const result = await service.loginWithCredentials(" portero.demo ", validPassword);

    expect(usuariosRepo.findActiveByUsuario).toHaveBeenCalledWith("portero.demo");
    expect(usuariosRepo.updateUltimoAcceso).toHaveBeenCalledWith(7);
    expect(loginThrottle.clear).toHaveBeenCalledWith("portero.demo");
    expect(loginThrottle.recordFailure).not.toHaveBeenCalled();
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
      sedes: [{ id: 10, nombre: "Sede Central", empresaId: 2, empresaNombre: "Empresa Receptora", visitaRequiereAprobacion: true }],
    });
    expect(result.expiresIn).toBe("8h");
  });

  it("rechaza usuario inexistente o inactivo", async () => {
    usuariosRepo.findActiveByUsuario.mockResolvedValue(null);

    await expect(service.loginWithCredentials("no.existe", validPassword, "10.0.0.8")).rejects.toMatchObject({
      code: API_ERROR_CODE.AUTH_INVALID_CREDENTIALS,
    });
    expect(loginThrottle.recordFailure).toHaveBeenCalledWith("no.existe", "10.0.0.8");
    expect(usuariosRepo.updateUltimoAcceso).not.toHaveBeenCalled();
    expect(loginThrottle.clear).not.toHaveBeenCalled();
  });

  it("rechaza contrasena incorrecta", async () => {
    await expect(service.loginWithCredentials("portero.demo", "incorrecta")).rejects.toMatchObject({
      code: API_ERROR_CODE.AUTH_INVALID_CREDENTIALS,
    });
    expect(loginThrottle.recordFailure).toHaveBeenCalledWith("portero.demo", "unknown");
    expect(usuariosRepo.updateUltimoAcceso).not.toHaveBeenCalled();
  });

  it("incluye remainingAttempts en el 401 cuando quedan 5 o menos", async () => {
    loginThrottle.recordFailure.mockResolvedValue(5);

    await expect(service.loginWithCredentials("portero.demo", "incorrecta", "1.1.1.1")).rejects.toMatchObject({
      code: API_ERROR_CODE.AUTH_INVALID_CREDENTIALS,
      details: { remainingAttempts: 5 },
    });
  });

  it("no incluye remainingAttempts cuando quedan mas de 5", async () => {
    loginThrottle.recordFailure.mockResolvedValue(6);

    const error = await service.loginWithCredentials("portero.demo", "incorrecta").catch((e) => e);
    expect(error).toMatchObject({ code: API_ERROR_CODE.AUTH_INVALID_CREDENTIALS });
    expect(error.details).toBeUndefined();
  });

  it("descifra password RSA antes de autenticar", async () => {
    await service.loginWithEncryptedCredentials("portero.demo", "ciphertext", "10.0.0.8");

    expect(crypto.decrypt).toHaveBeenCalledWith("ciphertext");
    expect(usuariosRepo.findActiveByUsuario).toHaveBeenCalledWith("portero.demo");
    expect(loginThrottle.clear).toHaveBeenCalledWith("portero.demo");
  });

  it("no llega a descifrar ni consultar usuario si el login esta bloqueado", async () => {
    loginThrottle.assertAllowed.mockRejectedValue(
      new BusinessException({
        message: "Demasiados intentos fallidos. Intente de nuevo en 15 minutos.",
        code: API_ERROR_CODE.RATE_LIMITED,
        status: HttpStatus.TOO_MANY_REQUESTS,
      }),
    );

    await expect(
      service.loginWithEncryptedCredentials("portero.demo", "ciphertext", "10.0.0.8"),
    ).rejects.toMatchObject({
      code: API_ERROR_CODE.RATE_LIMITED,
    });
    expect(crypto.decrypt).not.toHaveBeenCalled();
    expect(usuariosRepo.findActiveByUsuario).not.toHaveBeenCalled();
    expect(loginThrottle.recordFailure).not.toHaveBeenCalled();
  });

  it("no cuenta como fallo el 403 de portero sin sede", async () => {
    usuariosRepo.findActivePorteriaAssignment.mockResolvedValue(null);

    await expect(service.loginWithCredentials("portero.demo", validPassword, "10.0.0.8")).rejects.toMatchObject({
      code: API_ERROR_CODE.FORBIDDEN,
    });
    expect(loginThrottle.clear).toHaveBeenCalledWith("portero.demo");
    expect(loginThrottle.recordFailure).not.toHaveBeenCalled();
  });
});
