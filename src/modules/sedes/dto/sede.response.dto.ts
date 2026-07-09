/**
 * @file sede.response.dto.ts
 * @description DTOs de respuesta de sede individual y listado paginado.
 */
import { ApiProperty } from "@nestjs/swagger";

/** Representacion serializable de una sede para la API. */
export class SedeResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  empresaId!: number;

  @ApiProperty({ example: "Acme Paraguay SA" })
  empresaNombre!: string;

  @ApiProperty({ example: "Casa Matriz" })
  nombre!: string;

  @ApiProperty({ example: "Av. Mariscal Lopez 123", nullable: true })
  direccion!: string | null;

  @ApiProperty({ example: "021555123", nullable: true })
  telefono!: string | null;

  @ApiProperty({ example: true })
  activo!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

/** Contenedor paginado de sedes para respuestas HTTP. */
export class SedeListResponseDto {
  @ApiProperty({ type: () => [SedeResponseDto] })
  items!: SedeResponseDto[];

  @ApiProperty({ example: 1 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 15 })
  limit!: number;
}
