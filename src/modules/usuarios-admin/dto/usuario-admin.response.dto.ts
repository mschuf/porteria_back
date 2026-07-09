/**
 * @file usuario-admin.response.dto.ts
 * @description DTOs de respuesta de usuario individual y listado paginado.
 */
import { ApiProperty } from "@nestjs/swagger";
import type { UserRole } from "../../../common/types/authenticated-user";
import { USUARIO_ADMIN_ROLES } from "./list-usuarios-admin-query.dto";

/** Representacion serializable de un usuario para la API (sin contraseña). */
export class UsuarioAdminResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: "jperez" })
  usuario!: string;

  @ApiProperty({ example: "Juan Perez" })
  nombre!: string;

  @ApiProperty({ example: "jperez@empresa.com.py", nullable: true })
  correo!: string | null;

  @ApiProperty({ enum: USUARIO_ADMIN_ROLES, example: "portero" })
  rol!: UserRole;

  @ApiProperty({ example: true })
  activo!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

/** Contenedor paginado de usuarios para respuestas HTTP. */
export class UsuarioAdminListResponseDto {
  @ApiProperty({ type: () => [UsuarioAdminResponseDto] })
  items!: UsuarioAdminResponseDto[];

  @ApiProperty({ example: 1 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 15 })
  limit!: number;
}
