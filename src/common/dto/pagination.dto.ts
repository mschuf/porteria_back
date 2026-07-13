/**
 * @file pagination.dto.ts
 * @description DTO reutilizable de paginación y tipo de resultado paginado.
 */
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

/**
 * Parámetros de consulta comunes para listados paginados.
 */
export class PaginationDto {
  @ApiPropertyOptional({ minimum: 1, default: 1, description: "Page number, 1-indexed" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 50000, default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50_000)
  limit?: number = 25;
}

/**
 * Resultado paginado genérico devuelto por servicios de listado.
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
