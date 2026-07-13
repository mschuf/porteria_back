/**
 * @file create-proveedor.dto.ts
 * @description DTO de validación para la creación de un proveedor.
 */
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength, MinLength } from "class-validator";

/** Cuerpo HTTP para crear un proveedor. */
export class CreateProveedorDto {
  @ApiProperty({ example: 2 }) @IsInt() @IsPositive() sedeId!: number;
  @ApiProperty({ example: "Logistica Norte SA" })
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

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
