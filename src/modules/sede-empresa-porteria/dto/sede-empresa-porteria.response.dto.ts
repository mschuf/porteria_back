/**
 * @file sede-empresa-porteria.response.dto.ts
 * @description DTOs de respuesta de asignacion sede-empresa de seguridad individual y listado paginado.
 */
import { ApiProperty } from "@nestjs/swagger";

/** Representacion serializable de una asignacion sede-empresa de seguridad para la API. */
export class SedeEmpresaPorteriaResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  sedeId!: number;

  @ApiProperty({ example: "Casa Matriz" })
  sedeNombre!: string;

  @ApiProperty({ example: 1 })
  empresaPorteriaId!: number;

  @ApiProperty({ example: "Seguridad Total SA" })
  empresaPorteriaNombre!: string;

  @ApiProperty({ example: true })
  activo!: boolean;

  @ApiProperty()
  asignadoDesde!: string;

  @ApiProperty({ nullable: true })
  asignadoHasta!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

/** Contenedor paginado de asignaciones sede-empresa de seguridad para respuestas HTTP. */
export class SedeEmpresaPorteriaListResponseDto {
  @ApiProperty({ type: () => [SedeEmpresaPorteriaResponseDto] })
  items!: SedeEmpresaPorteriaResponseDto[];

  @ApiProperty({ example: 1 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 15 })
  limit!: number;
}
