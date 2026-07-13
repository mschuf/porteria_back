/**
 * @file update-usuario-empresa-porteria.dto.ts
 * @description DTO de validacion para actualizacion parcial de una asignacion usuario-empresa-porteria.
 */
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsPositive } from "class-validator";

/** Cuerpo HTTP para actualizar una asignacion usuario-empresa-porteria existente. */
export class UpdateUsuarioEmpresaPorteriaDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  usuarioId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  empresaPorteriaId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  sedeEmpresaPorteriaId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
