/**
 * @file empresa.response.dto.ts
 * @description DTOs de respuesta de empresa individual y listado paginado.
 */
import { ApiProperty } from "@nestjs/swagger";

/** Representacion serializable de una empresa para la API. */
export class EmpresaResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: "Acme Paraguay SA" })
  nombre!: string;

  @ApiProperty({ example: "80012345-6", nullable: true })
  ruc!: string | null;

  @ApiProperty({ example: "Av. Mariscal Lopez 123", nullable: true })
  direccion!: string | null;

  @ApiProperty({ example: "021555123", nullable: true })
  telefono!: string | null;

  @ApiProperty({ example: "contacto@acme.com.py", nullable: true })
  correo!: string | null;

  @ApiProperty({ example: true })
  activo!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

/** Contenedor paginado de empresas para respuestas HTTP. */
export class EmpresaListResponseDto {
  @ApiProperty({ type: () => [EmpresaResponseDto] })
  items!: EmpresaResponseDto[];

  @ApiProperty({ example: 1 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 15 })
  limit!: number;
}

