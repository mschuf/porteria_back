/**
 * @file create-usuario-empresa.dto.ts
 * @description DTO de validacion para la creacion de una asignacion usuario-empresa.
 */
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsPositive } from "class-validator";

/** Cuerpo HTTP para crear una asignacion usuario-empresa. */
export class CreateUsuarioEmpresaDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  usuarioId!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  empresaId!: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
