/**
 * @file create-usuario-empresa-porteria.dto.ts
 * @description DTO de validacion para la creacion de una asignacion usuario-empresa-porteria.
 */
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsPositive } from "class-validator";

/** Cuerpo HTTP para crear una asignacion usuario-empresa-porteria. */
export class CreateUsuarioEmpresaPorteriaDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  usuarioId!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  empresaPorteriaId!: number;

  @ApiProperty({ example: 1, description: "Asignación vigente de la empresa de portería a una sede" })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  sedeEmpresaPorteriaId!: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
