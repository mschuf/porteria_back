/**
 * @file list-sedes-query.dto.ts
 * @description DTO de consulta para listar sedes con paginacion, filtros y orden.
 */
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, IsPositive, IsString } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";

/** Columnas ordenables en GET /sedes. */
export const SEDE_SORT_BY = [
  "id",
  "nombre",
  "direccion",
  "telefono",
  "empresaId",
  "createdAt",
] as const;

export type SedeSortBy = (typeof SEDE_SORT_BY)[number];

/** Direccion de ordenacion del listado de sedes. */
export const SEDE_SORT_ORDER = ["asc", "desc"] as const;

export type SedeSortOrder = (typeof SEDE_SORT_ORDER)[number];

/** Parametros de query para el listado paginado de sedes. */
export class ListSedesQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Free-text search in id, nombre, direccion, telefono" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Filter by nombre" })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({ description: "Filter by direccion" })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiPropertyOptional({ description: "Filter by telefono" })
  @IsOptional()
  @IsString()
  telefono?: string;

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

  @ApiPropertyOptional({ enum: SEDE_SORT_BY, description: "Column to sort by" })
  @IsOptional()
  @IsIn(SEDE_SORT_BY)
  sortBy?: SedeSortBy;

  @ApiPropertyOptional({ enum: SEDE_SORT_ORDER, description: "Sort direction (asc or desc)" })
  @IsOptional()
  @IsIn(SEDE_SORT_ORDER)
  sortOrder?: SedeSortOrder;
}

/** Limite por defecto de registros por pagina en listados de sedes. */
export const DEFAULT_SEDES_PAGE_LIMIT = 15;
