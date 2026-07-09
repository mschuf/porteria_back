/**
 * @file update-empresa.dto.ts
 * @description DTO de validacion para actualizacion parcial de una empresa.
 */
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

/** Cuerpo HTTP para actualizar una empresa existente. */
export class UpdateEmpresaDto {
  @ApiPropertyOptional({ example: "Acme Paraguay SA" })
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

  @ApiPropertyOptional({ example: "contacto@acme.com.py" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  correo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

