/**
 * @file update-sede.dto.ts
 * @description DTO de validacion para actualizacion parcial de una sede.
 */
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

/** Cuerpo HTTP para actualizar una sede existente. */
export class UpdateSedeDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  empresaId?: number;

  @ApiPropertyOptional({ example: "Casa Matriz" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  nombre?: string;

  @ApiPropertyOptional({ example: "Av. Mariscal Lopez 123" })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  direccion?: string;

  @ApiPropertyOptional({ example: "021555123" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  telefono?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({
    description: "false: las visitas de la sede se aprueban automaticamente al crearse.",
  })
  @IsOptional()
  @IsBoolean()
  visitaRequiereAprobacion?: boolean;
}
