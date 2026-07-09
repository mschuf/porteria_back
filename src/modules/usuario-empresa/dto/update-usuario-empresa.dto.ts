/**
 * @file update-usuario-empresa.dto.ts
 * @description DTO de validacion para actualizacion parcial de una asignacion usuario-empresa.
 */
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsPositive } from "class-validator";

/** Cuerpo HTTP para actualizar una asignacion usuario-empresa existente. */
export class UpdateUsuarioEmpresaDto {
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
  empresaId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
