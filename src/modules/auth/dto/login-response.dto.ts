/**
 * @file login-response.dto.ts
 * @description DTOs de respuesta para login, perfil de usuario autenticado y sesión activa.
 */
import { ApiProperty } from "@nestjs/swagger";

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

  @ApiProperty({ example: "portero", enum: ["super_admin", "admin_empresa", "portero"] })
  role!: "super_admin" | "admin_empresa" | "portero";
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
