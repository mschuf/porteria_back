/**
 * @file update-empresa-porteria.dto.ts
 * @description DTO de validacion para actualizacion parcial de una empresa de seguridad.
 */
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

/** Cuerpo HTTP para actualizar una empresa de seguridad existente. */
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

  @ApiPropertyOptional({ example: "María González" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombreContacto?: string;

  @ApiPropertyOptional({ example: "0981555123" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  telefonoContacto?: string;

  @ApiPropertyOptional({ example: "maria.gonzalez@seguridadtotal.com.py" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  correoContacto?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
