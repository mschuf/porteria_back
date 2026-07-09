/**
 * @file list-usuarios-admin-query.dto.ts
 * @description DTO de consulta para listar usuarios con paginacion, filtros y orden.
 */
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";
import type { UserRole } from "../../../common/types/authenticated-user";

/** Columnas ordenables en GET /usuarios-admin. */
export const USUARIO_ADMIN_SORT_BY = ["id", "usuario", "nombre", "correo", "rol", "createdAt"] as const;

export type UsuarioAdminSortBy = (typeof USUARIO_ADMIN_SORT_BY)[number];

/** Direccion de ordenacion del listado de usuarios. */
export const USUARIO_ADMIN_SORT_ORDER = ["asc", "desc"] as const;

export type UsuarioAdminSortOrder = (typeof USUARIO_ADMIN_SORT_ORDER)[number];

/** Roles validos de `public.usuario`. */
export const USUARIO_ADMIN_ROLES = ["super_admin", "admin_empresa", "portero"] as const;

/** Parametros de query para el listado paginado de usuarios. */
export class ListUsuariosAdminQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Free-text search in id, usuario, nombre, correo" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Filter by usuario (login)" })
  @IsOptional()
  @IsString()
  usuario?: string;

  @ApiPropertyOptional({ description: "Filter by nombre" })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({ description: "Filter by correo" })
  @IsOptional()
  @IsString()
  correo?: string;

  @ApiPropertyOptional({ enum: USUARIO_ADMIN_ROLES, description: "Filter by rol" })
  @IsOptional()
  @IsIn(USUARIO_ADMIN_ROLES)
  rol?: UserRole;

  @ApiPropertyOptional({ description: "Filter by active status" })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === "") return undefined;
    if (value === true || value === "true" || value === "1") return true;
    if (value === false || value === "false" || value === "0") return false;
    return value;
  })
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ enum: USUARIO_ADMIN_SORT_BY, description: "Column to sort by" })
  @IsOptional()
  @IsIn(USUARIO_ADMIN_SORT_BY)
  sortBy?: UsuarioAdminSortBy;

  @ApiPropertyOptional({ enum: USUARIO_ADMIN_SORT_ORDER, description: "Sort direction (asc or desc)" })
  @IsOptional()
  @IsIn(USUARIO_ADMIN_SORT_ORDER)
  sortOrder?: UsuarioAdminSortOrder;
}

/** Limite por defecto de registros por pagina en listados de usuarios. */
export const DEFAULT_USUARIOS_ADMIN_PAGE_LIMIT = 15;
