/**
 * @file update-empresa-porteria.dto.ts
 * @description DTO de validacion para actualizacion parcial de una empresa de porteria.
 */
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

/** Cuerpo HTTP para actualizar una empresa de porteria existente. */
export class UpdateEmpresaPorteriaDto {
  @ApiPropertyOptional({ example: "Seguridad Total SA" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  nombre?: string;

  @ApiPropertyOptional({ example: "80012345-6" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  ruc?: string;

  @ApiPropertyOptional({ example: "021555123" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  telefono?: string;

  @ApiPropertyOptional({ example: "contacto@seguridadtotal.com.py" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  correo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
