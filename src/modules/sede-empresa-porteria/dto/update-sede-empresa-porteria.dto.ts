/**
 * @file update-sede-empresa-porteria.dto.ts
 * @description DTO de validacion para actualizacion parcial de una asignacion sede-empresa de seguridad.
 */
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsISO8601, IsOptional, IsPositive } from "class-validator";

/** Cuerpo HTTP para actualizar una asignacion sede-empresa de seguridad existente. */
export class UpdateSedeEmpresaPorteriaDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  sedeId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  empresaPorteriaId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ description: "Fecha de inicio de la asignacion (ISO 8601)" })
  @IsOptional()
  @IsISO8601()
  asignadoDesde?: string;

  @ApiPropertyOptional({
    description: "Fecha de fin de la asignacion (ISO 8601); enviar null para volver a dejarla vigente",
    nullable: true,
  })
  @IsOptional()
  @IsISO8601()
  asignadoHasta?: string | null;
}
