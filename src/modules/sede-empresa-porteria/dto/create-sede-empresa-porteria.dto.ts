/**
 * @file create-sede-empresa-porteria.dto.ts
 * @description DTO de validacion para la creacion de una asignacion sede-empresa de seguridad.
 */
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsISO8601, IsOptional, IsPositive } from "class-validator";

/** Cuerpo HTTP para crear una asignacion sede-empresa de seguridad. */
export class CreateSedeEmpresaPorteriaDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  sedeId!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  empresaPorteriaId!: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ description: "Fecha de inicio de la asignacion (ISO 8601), por defecto ahora" })
  @IsOptional()
  @IsISO8601()
  asignadoDesde?: string;

  @ApiPropertyOptional({
    description: "Fecha de fin de la asignacion (ISO 8601), vacio o null para asignacion vigente",
    nullable: true,
  })
  @IsOptional()
  @IsISO8601()
  asignadoHasta?: string | null;
}
