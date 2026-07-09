/**
 * @file create-empresa-porteria.dto.ts
 * @description DTO de validacion para la creacion de una empresa de porteria.
 */
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

/** Cuerpo HTTP para crear una empresa de porteria (seguridad). */
export class CreateEmpresaPorteriaDto {
  @ApiProperty({ example: "Seguridad Total SA" })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  nombre!: string;

  @ApiProperty({ example: "80012345-6" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  ruc!: string;

  @ApiProperty({ example: "021555123" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  telefono!: string;

  @ApiProperty({ example: "contacto@seguridadtotal.com.py" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  correo!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
