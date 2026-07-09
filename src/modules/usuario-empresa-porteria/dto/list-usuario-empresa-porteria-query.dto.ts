/**
 * @file list-usuario-empresa-porteria-query.dto.ts
 * @description DTO de consulta para listar asignaciones usuario-empresa-porteria con paginacion, filtros y orden.
 */
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, IsPositive, IsString } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";

/** Columnas ordenables en GET /usuario-empresa-porteria. */
export const USUARIO_EMPRESA_PORTERIA_SORT_BY = ["id", "usuarioId", "empresaPorteriaId", "createdAt"] as const;

export type UsuarioEmpresaPorteriaSortBy = (typeof USUARIO_EMPRESA_PORTERIA_SORT_BY)[number];

/** Direccion de ordenacion del listado de asignaciones usuario-empresa-porteria. */
export const USUARIO_EMPRESA_PORTERIA_SORT_ORDER = ["asc", "desc"] as const;

export type UsuarioEmpresaPorteriaSortOrder = (typeof USUARIO_EMPRESA_PORTERIA_SORT_ORDER)[number];

/** Parametros de query para el listado paginado de asignaciones usuario-empresa-porteria. */
export class ListUsuarioEmpresaPorteriaQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Free-text search in id, usuario nombre, empresa porteria nombre" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Filter by usuario id" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  usuarioId?: number;

  @ApiPropertyOptional({ description: "Filter by empresa porteria id" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  empresaPorteriaId?: number;

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

  @ApiPropertyOptional({ enum: USUARIO_EMPRESA_PORTERIA_SORT_BY, description: "Column to sort by" })
  @IsOptional()
  @IsIn(USUARIO_EMPRESA_PORTERIA_SORT_BY)
  sortBy?: UsuarioEmpresaPorteriaSortBy;

  @ApiPropertyOptional({ enum: USUARIO_EMPRESA_PORTERIA_SORT_ORDER, description: "Sort direction (asc or desc)" })
  @IsOptional()
  @IsIn(USUARIO_EMPRESA_PORTERIA_SORT_ORDER)
  sortOrder?: UsuarioEmpresaPorteriaSortOrder;
}

/** Limite por defecto de registros por pagina en listados de asignaciones usuario-empresa-porteria. */
export const DEFAULT_USUARIO_EMPRESA_PORTERIA_PAGE_LIMIT = 15;
