/**
 * @file empresa-porteria.response.dto.ts
 * @description DTOs de respuesta de empresa de seguridad individual y listado paginado.
 */
import { ApiProperty } from "@nestjs/swagger";

/** Representacion serializable de una empresa de seguridad para la API. */
export class EmpresaPorteriaResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: "Seguridad Total SA" })
  nombre!: string;

  @ApiProperty({ example: "80012345-6", nullable: true })
  ruc!: string | null;

  @ApiProperty({ example: "021555123", nullable: true })
  telefono!: string | null;

  @ApiProperty({ example: "contacto@seguridadtotal.com.py", nullable: true })
  correo!: string | null;

  @ApiProperty({ example: "María González", nullable: true })
  nombreContacto!: string | null;

  @ApiProperty({ example: "0981555123", nullable: true })
  telefonoContacto!: string | null;

  @ApiProperty({ example: "maria.gonzalez@seguridadtotal.com.py", nullable: true })
  correoContacto!: string | null;

  @ApiProperty({ example: true })
  activo!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

/** Contenedor paginado de empresas de porteria para respuestas HTTP. */
export class EmpresaPorteriaListResponseDto {
  @ApiProperty({ type: () => [EmpresaPorteriaResponseDto] })
  items!: EmpresaPorteriaResponseDto[];

  @ApiProperty({ example: 1 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 15 })
  limit!: number;
}
