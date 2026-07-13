/**
 * @file usuario-empresa-porteria.response.dto.ts
 * @description DTOs de respuesta de asignacion usuario-empresa-porteria individual y listado paginado.
 */
import { ApiProperty } from "@nestjs/swagger";

/** Representacion serializable de una asignacion usuario-empresa-porteria para la API. */
export class UsuarioEmpresaPorteriaResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  usuarioId!: number;

  @ApiProperty({ example: "Juan Perez" })
  usuarioNombre!: string;

  @ApiProperty({ example: 1 })
  empresaPorteriaId!: number;

  @ApiProperty({ example: "Seguridad Acme SA" })
  empresaPorteriaNombre!: string;

  @ApiProperty({ example: 1 })
  sedeEmpresaPorteriaId!: number;

  @ApiProperty({ example: 1 })
  sedeId!: number;

  @ApiProperty({ example: "Planta Central" })
  sedeNombre!: string;

  @ApiProperty({ example: true })
  activo!: boolean;

  @ApiProperty()
  createdAt!: string;
}

/** Contenedor paginado de asignaciones usuario-empresa-porteria para respuestas HTTP. */
export class UsuarioEmpresaPorteriaListResponseDto {
  @ApiProperty({ type: () => [UsuarioEmpresaPorteriaResponseDto] })
  items!: UsuarioEmpresaPorteriaResponseDto[];

  @ApiProperty({ example: 1 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 15 })
  limit!: number;
}
