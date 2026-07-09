/**
 * @file list-empresas-query.dto.ts
 * @description DTO de consulta para listar empresas con paginacion, filtros y orden.
 */
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";

/** Columnas ordenables en GET /empresas. */
export const EMPRESA_SORT_BY = [
  "id",
  "nombre",
  "ruc",
  "direccion",
  "telefono",
  "correo",
  "createdAt",
] as const;

export type EmpresaSortBy = (typeof EMPRESA_SORT_BY)[number];

/** Direccion de ordenacion del listado de empresas. */
export const EMPRESA_SORT_ORDER = ["asc", "desc"] as const;

export type EmpresaSortOrder = (typeof EMPRESA_SORT_ORDER)[number];

/** Parametros de query para el listado paginado de empresas. */
export class ListEmpresasQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Free-text search in id, nombre, ruc, direccion, telefono, correo" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Filter by nombre" })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({ description: "Filter by RUC" })
  @IsOptional()
  @IsString()
  ruc?: string;

  @ApiPropertyOptional({ description: "Filter by direccion" })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiPropertyOptional({ description: "Filter by telefono" })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({ description: "Filter by correo" })
  @IsOptional()
  @IsString()
  correo?: string;

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

  @ApiPropertyOptional({ enum: EMPRESA_SORT_BY, description: "Column to sort by" })
  @IsOptional()
  @IsIn(EMPRESA_SORT_BY)
  sortBy?: EmpresaSortBy;

  @ApiPropertyOptional({ enum: EMPRESA_SORT_ORDER, description: "Sort direction (asc or desc)" })
  @IsOptional()
  @IsIn(EMPRESA_SORT_ORDER)
  sortOrder?: EmpresaSortOrder;
}

/** Limite por defecto de registros por pagina en listados de empresas. */
export const DEFAULT_EMPRESAS_PAGE_LIMIT = 15;

