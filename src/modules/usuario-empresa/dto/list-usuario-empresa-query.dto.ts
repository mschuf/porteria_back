/**
 * @file list-usuario-empresa-query.dto.ts
 * @description DTO de consulta para listar asignaciones usuario-empresa con paginacion, filtros y orden.
 */
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, IsPositive, IsString } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";

/** Columnas ordenables en GET /usuario-empresa. */
export const USUARIO_EMPRESA_SORT_BY = ["id", "usuarioId", "empresaId", "createdAt"] as const;

export type UsuarioEmpresaSortBy = (typeof USUARIO_EMPRESA_SORT_BY)[number];

/** Direccion de ordenacion del listado de asignaciones usuario-empresa. */
export const USUARIO_EMPRESA_SORT_ORDER = ["asc", "desc"] as const;

export type UsuarioEmpresaSortOrder = (typeof USUARIO_EMPRESA_SORT_ORDER)[number];

/** Parametros de query para el listado paginado de asignaciones usuario-empresa. */
export class ListUsuarioEmpresaQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Free-text search in id, usuario nombre, empresa nombre" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Filter by usuario id" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  usuarioId?: number;

  @ApiPropertyOptional({ description: "Filter by empresa id" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  empresaId?: number;

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

  @ApiPropertyOptional({ enum: USUARIO_EMPRESA_SORT_BY, description: "Column to sort by" })
  @IsOptional()
  @IsIn(USUARIO_EMPRESA_SORT_BY)
  sortBy?: UsuarioEmpresaSortBy;

  @ApiPropertyOptional({ enum: USUARIO_EMPRESA_SORT_ORDER, description: "Sort direction (asc or desc)" })
  @IsOptional()
  @IsIn(USUARIO_EMPRESA_SORT_ORDER)
  sortOrder?: UsuarioEmpresaSortOrder;
}

/** Limite por defecto de registros por pagina en listados de asignaciones usuario-empresa. */
export const DEFAULT_USUARIO_EMPRESA_PAGE_LIMIT = 15;
