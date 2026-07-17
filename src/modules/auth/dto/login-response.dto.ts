/**
 * @file login-response.dto.ts
 * @description DTOs de respuesta para login, perfil de usuario autenticado y sesión activa.
 */
import { ApiProperty } from "@nestjs/swagger";
import type { UserRole } from "../../../common/types/authenticated-user";

/**
 * Perfil público del usuario autenticado devuelto por la API de auth.
 */
export class AuthenticatedUserResponseDto {
  @ApiProperty({ example: 188 })
  id!: number;

  @ApiProperty({ example: "jdoe" })
  login!: string;

  @ApiProperty({ example: "Juan Pérez" })
  name!: string;

  @ApiProperty({ example: "jperez@empresa.com", nullable: true })
  email!: string | null;

  @ApiProperty({ example: "portero", enum: ["super_admin", "admin_empresa", "encargado_seguridad", "encargado_porteria", "encargado_visita", "portero"] })
  role!: UserRole;

  @ApiProperty({ nullable: true, example: 3 })
  sedeId!: number | null;

  @ApiProperty({ nullable: true, example: 5 })
  empresaSeguridadId!: number | null;

  @ApiProperty({ example: false, description: "El usuario debe cambiar su contraseña al iniciar sesión." })
  requiereCambioContrasena!: boolean;

  @ApiProperty({ nullable: true, example: "Planta Central" })
  sedeName!: string | null;

  @ApiProperty({ nullable: true, example: "Empresa Receptora SA" })
  empresaName!: string | null;

  @ApiProperty({ nullable: true, example: "Seguridad Integral SA" })
  empresaPorteriaName!: string | null;

  @ApiProperty({ type: "array", items: { type: "object" } })
  sedes!: Array<{
    id: number;
    nombre: string;
    empresaId: number;
    empresaNombre: string;
    /** false: las visitas de la sede se aprueban automáticamente al crearse. */
    visitaRequiereAprobacion: boolean;
  }>;
}

/**
 * Respuesta exitosa del endpoint de login con expiración y usuario.
 */
export class LoginResponseDto {
  @ApiProperty({ example: "8h" })
  expiresIn!: string;

  @ApiProperty({ type: () => AuthenticatedUserResponseDto })
  user!: AuthenticatedUserResponseDto;
}

/**
 * Respuesta del endpoint /auth/me con perfil y timestamp de expiración de sesión.
 */
export class SessionResponseDto {
  @ApiProperty({ type: () => AuthenticatedUserResponseDto })
  user!: AuthenticatedUserResponseDto;

  @ApiProperty({
    description: "Session expiry timestamp in milliseconds (Unix epoch)",
    example: 1710000000000,
  })
  expiresAt!: number;
}
