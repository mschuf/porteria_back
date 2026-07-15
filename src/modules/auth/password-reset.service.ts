/**
 * @file password-reset.service.ts
 * @description Flujo de recuperación de contraseña: enlace propio por correo o reseteo por el
 * superior directo (derivado por jerarquía + ámbito) cuando el usuario no tiene correo.
 */
import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { API_ERROR_CODE } from "../../common/types/api-error-code";
import { getManagerRoles } from "../../common/types/role-hierarchy";
import type { AppConfig } from "../../config/configuration";
import { MailService } from "../mail/mail.service";
import { UsuariosSqlRepository, type UsuarioAuthRow } from "./repositories/usuarios.sql-repository";
import {
  PasswordResetSqlRepository,
  type SuperiorRecipientRow,
} from "./repositories/password-reset.sql-repository";

const BCRYPT_SALT_ROUNDS = 10;
const SELF_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora
const SUPERIOR_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
/** Contraseña temporal asignada por el superior; el usuario debe cambiarla al ingresar. */
const TEMP_PASSWORD = "12345";

/** Datos del subordinado asociados a un token de reseteo por superior. */
export interface SuperiorTokenSubject {
  usuario: string;
  nombre: string;
}

/** Servicio de recuperación y cambio de contraseña. */
@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  /** Inyecta configuración, correo y repositorios de usuarios y tokens. */
  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly mail: MailService,
    private readonly usuariosRepo: UsuariosSqlRepository,
    private readonly resetRepo: PasswordResetSqlRepository,
  ) {}

  /**
   * Inicia la recuperación para el identificador dado (usuario o correo). No revela si la cuenta
   * existe: siempre resuelve sin error.
   * @param identificador - Login o correo del usuario.
   */
  async requestRecovery(identificador: string): Promise<void> {
    const normalized = identificador.trim();
    if (!normalized) return;

    const usuario =
      (await this.usuariosRepo.findActiveByUsuario(normalized)) ??
      (await this.usuariosRepo.findActiveByCorreo(normalized));

    if (!usuario) {
      this.logger.warn(`[RESET] Identificador '${normalized}' sin cuenta activa`);
      return;
    }

    if (usuario.correo) {
      await this.sendSelfResetEmail(usuario);
    } else {
      await this.sendSuperiorResetEmails(usuario);
    }
  }

  /**
   * Restablece la contraseña usando un token propio recibido por correo.
   * @param token - Token en claro del enlace.
   * @param contrasena - Nueva contraseña.
   */
  async resetWithToken(token: string, contrasena: string): Promise<void> {
    const record = await this.resetRepo.findValidByHash(this.hashToken(token));
    if (!record || record.tipo !== "propio") {
      throw this.invalidToken();
    }
    const contrasenaHash = await bcrypt.hash(contrasena, BCRYPT_SALT_ROUNDS);
    await this.resetRepo.setPassword(record.usuarioId, contrasenaHash, false);
    await this.resetRepo.markUsed(record.id);
  }

  /**
   * Describe el subordinado asociado a un token de reseteo por superior, sin consumirlo.
   * @param token - Token en claro.
   * @returns Datos del subordinado.
   */
  async describeSuperiorToken(token: string): Promise<SuperiorTokenSubject> {
    const record = await this.resetRepo.findValidByHash(this.hashToken(token));
    if (!record || record.tipo !== "superior") {
      throw this.invalidToken();
    }
    const usuario = await this.usuariosRepo.findActiveById(record.usuarioId);
    if (!usuario) throw this.invalidToken();
    return { usuario: usuario.usuario, nombre: usuario.nombre };
  }

  /**
   * Aplica el reseteo confirmado por el superior: fija la contraseña temporal y fuerza el cambio.
   * @param token - Token en claro.
   * @returns Datos del subordinado reseteado.
   */
  async resetBySuperior(token: string): Promise<SuperiorTokenSubject> {
    const record = await this.resetRepo.findValidByHash(this.hashToken(token));
    if (!record || record.tipo !== "superior") {
      throw this.invalidToken();
    }
    const usuario = await this.usuariosRepo.findActiveById(record.usuarioId);
    if (!usuario) throw this.invalidToken();

    const contrasenaHash = await bcrypt.hash(TEMP_PASSWORD, BCRYPT_SALT_ROUNDS);
    await this.resetRepo.setPassword(usuario.id, contrasenaHash, true);
    await this.resetRepo.markUsed(record.id);
    return { usuario: usuario.usuario, nombre: usuario.nombre };
  }

  /**
   * Cambia la contraseña del usuario autenticado y limpia la bandera de cambio forzado.
   * @param userId - Identificador del usuario autenticado.
   * @param actual - Contraseña actual.
   * @param nueva - Nueva contraseña.
   */
  async changePassword(userId: number, actual: string, nueva: string): Promise<void> {
    const usuario = await this.usuariosRepo.findActiveById(userId);
    if (!usuario) {
      throw new BusinessException({
        message: "Usuario no encontrado",
        code: API_ERROR_CODE.AUTH_USER_NOT_FOUND,
        status: HttpStatus.UNAUTHORIZED,
      });
    }
    const matches = await bcrypt.compare(actual, usuario.contrasenaHash);
    if (!matches) {
      throw new BusinessException({
        message: "La contraseña actual es incorrecta",
        code: API_ERROR_CODE.AUTH_INVALID_CREDENTIALS,
        status: HttpStatus.BAD_REQUEST,
      });
    }
    const contrasenaHash = await bcrypt.hash(nueva, BCRYPT_SALT_ROUNDS);
    await this.resetRepo.setPassword(usuario.id, contrasenaHash, false);
  }

  /** Genera y envía el enlace de restablecimiento propio al correo del usuario. */
  private async sendSelfResetEmail(usuario: UsuarioAuthRow): Promise<void> {
    const { token, hash, expiraEn } = this.generateToken(SELF_TOKEN_TTL_MS);
    await this.resetRepo.invalidatePending(usuario.id, "propio");
    await this.resetRepo.createToken({
      usuarioId: usuario.id,
      tipo: "propio",
      hashToken: hash,
      superiorId: null,
      expiraEn,
    });

    const link = `${this.frontendBaseUrl()}/restablecer-contrasena?token=${encodeURIComponent(token)}`;
    const result = await this.mail.send({
      subject: "Recuperación de contraseña — Portería",
      recipients: [{ name: usuario.nombre, email: usuario.correo! }],
      html: this.selfResetHtml(usuario.nombre, link),
      text:
        `Hola ${usuario.nombre},\n\n` +
        `Recibimos una solicitud para restablecer tu contraseña. ` +
        `Abrí el siguiente enlace (válido por 1 hora):\n${link}\n\n` +
        `Si no lo solicitaste, ignorá este correo.`,
    });
    if (!result.sent) {
      this.logger.warn(`[RESET] No se pudo enviar el correo propio a ${usuario.correo}: ${result.error ?? "SMTP deshabilitado"}`);
    }
  }

  /** Deriva superiores y les envía la solicitud de reseteo del subordinado sin correo. */
  private async sendSuperiorResetEmails(usuario: UsuarioAuthRow): Promise<void> {
    const superiors = await this.resolveSuperiors(usuario);
    if (superiors.length === 0) {
      this.logger.warn(`[RESET] Usuario '${usuario.usuario}' sin correo y sin superior con correo`);
      return;
    }

    const { token, hash, expiraEn } = this.generateToken(SUPERIOR_TOKEN_TTL_MS);
    await this.resetRepo.invalidatePending(usuario.id, "superior");
    await this.resetRepo.createToken({
      usuarioId: usuario.id,
      tipo: "superior",
      hashToken: hash,
      superiorId: null,
      expiraEn,
    });

    const link = `${this.frontendBaseUrl()}/restablecer-subordinado?token=${encodeURIComponent(token)}`;
    const result = await this.mail.send({
      subject: "Solicitud de reseteo de contraseña — Portería",
      recipients: superiors.map((s) => ({ name: s.nombre, email: s.correo })),
      html: this.superiorResetHtml(usuario.nombre, usuario.usuario, link),
      text:
        `El usuario ${usuario.nombre} (${usuario.usuario}) no tiene correo y solicitó recuperar su contraseña.\n\n` +
        `Como superior directo, podés restablecer su contraseña a la temporal (deberá cambiarla al ingresar) ` +
        `desde el siguiente enlace (válido por 24 horas):\n${link}`,
    });
    if (!result.sent) {
      this.logger.warn(`[RESET] No se pudo enviar el correo al superior de '${usuario.usuario}': ${result.error ?? "SMTP deshabilitado"}`);
    }
  }

  /**
   * Deriva los superiores con correo del usuario recorriendo la jerarquía del más cercano al más
   * lejano y devolviendo el primer nivel con destinatarios.
   */
  private async resolveSuperiors(usuario: UsuarioAuthRow): Promise<SuperiorRecipientRow[]> {
    const managerRoles = getManagerRoles(usuario.rol);
    if (managerRoles.length === 0) return [];

    const assignment = await this.usuariosRepo.findActivePorteriaAssignment(usuario.id);
    const empresaSeguridadId = assignment?.empresaSeguridadId ?? null;
    const sedeId = assignment?.sedeId ?? null;

    for (const role of managerRoles) {
      const found = await this.resetRepo.findEmailSuperiors(role, empresaSeguridadId, sedeId);
      const recipients = found.filter((s) => s.id !== usuario.id);
      if (recipients.length > 0) return recipients;
    }
    return [];
  }

  /** Crea un token aleatorio, su hash de almacenamiento y la fecha de expiración. */
  private generateToken(ttlMs: number): { token: string; hash: string; expiraEn: Date } {
    const token = randomBytes(32).toString("base64url");
    return { token, hash: this.hashToken(token), expiraEn: new Date(Date.now() + ttlMs) };
  }

  /** Calcula el hash SHA-256 de almacenamiento de un token. */
  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  /** URL base del frontend para construir enlaces. */
  private frontendBaseUrl(): string {
    return this.config.get("frontend.baseUrl", { infer: true }) || "";
  }

  private invalidToken(): BusinessException {
    return new BusinessException({
      message: "El enlace es inválido o ya expiró",
      code: API_ERROR_CODE.VALIDATION,
      status: HttpStatus.BAD_REQUEST,
    });
  }

  private selfResetHtml(nombre: string, link: string): string {
    return `
      <div style="font-family:Arial,sans-serif;font-size:14px;color:#111;line-height:1.5">
        <p>Hola ${this.escapeHtml(nombre)},</p>
        <p>Recibimos una solicitud para restablecer tu contraseña en <strong>Portería</strong>.</p>
        <p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;text-decoration:none;border-radius:6px">Restablecer contraseña</a></p>
        <p style="color:#555">El enlace es válido por 1 hora. Si no lo solicitaste, ignorá este correo.</p>
      </div>`;
  }

  private superiorResetHtml(nombre: string, login: string, link: string): string {
    return `
      <div style="font-family:Arial,sans-serif;font-size:14px;color:#111;line-height:1.5">
        <p>El usuario <strong>${this.escapeHtml(nombre)}</strong> (${this.escapeHtml(login)}) no tiene correo y solicitó recuperar su contraseña.</p>
        <p>Como superior directo, podés restablecer su contraseña a una temporal. El usuario deberá cambiarla al iniciar sesión.</p>
        <p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;text-decoration:none;border-radius:6px">Revisar y restablecer</a></p>
        <p style="color:#555">El enlace es válido por 24 horas.</p>
      </div>`;
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) =>
      char === "&" ? "&amp;" :
      char === "<" ? "&lt;" :
      char === ">" ? "&gt;" :
      char === '"' ? "&quot;" : "&#39;",
    );
  }
}
