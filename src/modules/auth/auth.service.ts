/**
 * @file auth.service.ts
 * @description Autenticación contra la tabla local `usuario` y emisión de JWT de sesión.
 */
import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { BusinessException } from "../../common/exceptions/business.exception";
import { API_ERROR_CODE } from "../../common/types/api-error-code";
import { CryptoService } from "../../common/crypto/crypto.service";
import type {
  AuthenticatedUser,
  JwtPayload,
  SessionUser,
} from "../../common/types/authenticated-user";
import type { AppConfig } from "../../config/configuration";
import { UsuariosSqlRepository, type UsuarioAuthRow } from "./repositories/usuarios.sql-repository";

/** Servicio de autenticación local contra PostgreSQL. */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /** Inyecta configuración, JWT, cifrado y repositorio de usuarios. */
  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly jwt: JwtService,
    private readonly crypto: CryptoService,
    private readonly usuariosRepo: UsuariosSqlRepository,
  ) {}

  /**
   * Descifra la contraseña RSA-OAEP y delega el login con credenciales en texto plano.
   * @param username - Nombre de usuario local.
   * @param encryptedPassword - Contraseña cifrada en base64.
   * @returns Token JWT, expiración y usuario de sesión.
   */
  async loginWithEncryptedCredentials(
    username: string,
    encryptedPassword: string,
  ): Promise<{
    accessToken: string;
    expiresIn: string;
    user: SessionUser;
  }> {
    let password: string;
    try {
      password = this.crypto.decrypt(encryptedPassword);
    } catch (error) {
      this.logger.warn(
        `[AUTH] Failed to decrypt credentials for '${username}': ${(error as Error).message}`,
      );
      throw this.invalidCredentials();
    }

    return this.loginWithCredentials(username, password);
  }

  /**
   * Valida credenciales contra `public.usuario`.
   * @param username - Nombre de usuario.
   * @param password - Contraseña en texto plano, tras descifrado RSA.
   * @returns Token JWT, expiración y usuario de sesión.
   */
  async loginWithCredentials(username: string, password: string): Promise<{
    accessToken: string;
    expiresIn: string;
    user: SessionUser;
  }> {
    const normalizedUsername = username.trim();
    if (!normalizedUsername || !password) {
      throw this.invalidCredentials();
    }

    const usuario = await this.usuariosRepo.findActiveByUsuario(normalizedUsername);
    if (!usuario) {
      this.logger.warn(`[AUTH] Usuario '${normalizedUsername}' not found or inactive`);
      throw this.invalidCredentials();
    }

    const passwordMatches = await bcrypt.compare(password, usuario.contrasenaHash);
    if (!passwordMatches) {
      this.logger.warn(`[AUTH] Invalid password for usuario '${normalizedUsername}'`);
      throw this.invalidCredentials();
    }

    await this.usuariosRepo.updateUltimoAcceso(usuario.id);
    return this.completeLogin(usuario);
  }

  /**
   * Revoca la sesión del usuario autenticado (sin estado en servidor por ahora).
   * @returns Promesa resuelta sin valor.
   */
  async logout(_user: AuthenticatedUser): Promise<void> {
    return;
  }

  /**
   * Enriquece el usuario autenticado con datos actualizados desde `public.usuario`.
   * @param user - Usuario autenticado extraído del JWT.
   * @returns Perfil de sesión.
   */
  async resolveProfile(user: AuthenticatedUser): Promise<SessionUser> {
    const usuario = await this.usuariosRepo.findActiveById(user.id);
    if (!usuario) {
      throw new BusinessException({
        message: `User ${user.id} not found`,
        code: API_ERROR_CODE.AUTH_USER_NOT_FOUND,
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    return this.toSessionUser(usuario);
  }

  private async completeLogin(usuario: UsuarioAuthRow): Promise<{
    accessToken: string;
    expiresIn: string;
    user: SessionUser;
  }> {
    const user = await this.toSessionUser(usuario);
    const accessToken = await this.signToken(user);
    const expiresIn = this.config.get("jwt.expiresIn", { infer: true });

    return { accessToken, expiresIn, user };
  }

  private async toSessionUser(usuario: UsuarioAuthRow): Promise<SessionUser> {
    const assignment = usuario.rol === "portero"
      ? await this.usuariosRepo.findActivePorteriaAssignment(usuario.id)
      : null;

    if (usuario.rol === "portero" && !assignment) {
      throw new BusinessException({
        message: "El portero no tiene una sede activa y vigente asignada",
        code: API_ERROR_CODE.FORBIDDEN,
        status: HttpStatus.FORBIDDEN,
      });
    }

    return {
      id: usuario.id,
      role: usuario.rol,
      sedeId: assignment?.sedeId ?? null,
      login: usuario.usuario,
      name: usuario.nombre,
      email: usuario.correo,
      sedeName: assignment?.sedeName ?? null,
      empresaName: assignment?.empresaName ?? null,
      empresaPorteriaName: assignment?.empresaPorteriaName ?? null,
    };
  }

  private async signToken(user: AuthenticatedUser): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      sedeId: user.sedeId,
    };
    return this.jwt.signAsync(payload);
  }

  private invalidCredentials(): BusinessException {
    return new BusinessException({
      message: "Invalid credentials",
      code: API_ERROR_CODE.AUTH_INVALID_CREDENTIALS,
      status: HttpStatus.UNAUTHORIZED,
    });
  }
}

/** Tipo de salida del flujo de login con credenciales en texto plano. */
export type LoginOutput = Awaited<ReturnType<AuthService["loginWithCredentials"]>>;
