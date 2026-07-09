/**
 * @file list-empresa-porteria-query.dto.ts
 * @description DTO de consulta para listar empresas de porteria con paginacion, filtros y orden.
 */
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";

/** Columnas ordenables en GET /empresa-porteria. */
export const EMPRESA_PORTERIA_SORT_BY = [
  "id",
  "nombre",
  "ruc",
  "telefono",
  "correo",
  "createdAt",
] as const;

export type EmpresaPorteriaSortBy = (typeof EMPRESA_PORTERIA_SORT_BY)[number];

/** Direccion de ordenacion del listado de empresas de porteria. */
export const EMPRESA_PORTERIA_SORT_ORDER = ["asc", "desc"] as const;

export type EmpresaPorteriaSortOrder = (typeof EMPRESA_PORTERIA_SORT_ORDER)[number];

/** Parametros de query para el listado paginado de empresas de porteria. */
export class ListEmpresaPorteriaQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Free-text search in id, nombre, ruc, telefono, correo" })
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

  @ApiPropertyOptional({ enum: EMPRESA_PORTERIA_SORT_BY, description: "Column to sort by" })
  @IsOptional()
  @IsIn(EMPRESA_PORTERIA_SORT_BY)
  sortBy?: EmpresaPorteriaSortBy;

  @ApiPropertyOptional({ enum: EMPRESA_PORTERIA_SORT_ORDER, description: "Sort direction (asc or desc)" })
  @IsOptional()
  @IsIn(EMPRESA_PORTERIA_SORT_ORDER)
  sortOrder?: EmpresaPorteriaSortOrder;
}

/** Limite por defecto de registros por pagina en listados de empresas de porteria. */
export const DEFAULT_EMPRESA_PORTERIA_PAGE_LIMIT = 15;
