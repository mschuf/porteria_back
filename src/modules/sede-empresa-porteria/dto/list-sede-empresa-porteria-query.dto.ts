/**
 * @file list-sede-empresa-porteria-query.dto.ts
 * @description DTO de consulta para listar asignaciones sede-empresa de porteria con paginacion, filtros y orden.
 */
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, IsPositive, IsString } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";

/** Columnas ordenables en GET /sede-empresa-porteria. */
export const SEDE_EMPRESA_PORTERIA_SORT_BY = [
  "id",
  "sedeId",
  "empresaPorteriaId",
  "asignadoDesde",
  "asignadoHasta",
  "createdAt",
] as const;

export type SedeEmpresaPorteriaSortBy = (typeof SEDE_EMPRESA_PORTERIA_SORT_BY)[number];

/** Direccion de ordenacion del listado de asignaciones sede-empresa de porteria. */
export const SEDE_EMPRESA_PORTERIA_SORT_ORDER = ["asc", "desc"] as const;

export type SedeEmpresaPorteriaSortOrder = (typeof SEDE_EMPRESA_PORTERIA_SORT_ORDER)[number];

/** Parametros de query para el listado paginado de asignaciones sede-empresa de porteria. */
export class ListSedeEmpresaPorteriaQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Free-text search in id, sede nombre, empresa porteria nombre" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Filter by sede id" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  sedeId?: number;

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

  @ApiPropertyOptional({ enum: SEDE_EMPRESA_PORTERIA_SORT_BY, description: "Column to sort by" })
  @IsOptional()
  @IsIn(SEDE_EMPRESA_PORTERIA_SORT_BY)
  sortBy?: SedeEmpresaPorteriaSortBy;

  @ApiPropertyOptional({ enum: SEDE_EMPRESA_PORTERIA_SORT_ORDER, description: "Sort direction (asc or desc)" })
  @IsOptional()
  @IsIn(SEDE_EMPRESA_PORTERIA_SORT_ORDER)
  sortOrder?: SedeEmpresaPorteriaSortOrder;
}

/** Limite por defecto de registros por pagina en listados de asignaciones sede-empresa de porteria. */
export const DEFAULT_SEDE_EMPRESA_PORTERIA_PAGE_LIMIT = 15;
