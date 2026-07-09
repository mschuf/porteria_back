/**
 * @file usuario-empresa.response.dto.ts
 * @description DTOs de respuesta de asignacion usuario-empresa individual y listado paginado.
 */
import { ApiProperty } from "@nestjs/swagger";

/** Representacion serializable de una asignacion usuario-empresa para la API. */
export class UsuarioEmpresaResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  usuarioId!: number;

  @ApiProperty({ example: "Juan Perez" })
  usuarioNombre!: string;

  @ApiProperty({ example: 1 })
  empresaId!: number;

  @ApiProperty({ example: "Acme SA" })
  empresaNombre!: string;

  @ApiProperty({ example: true })
  activo!: boolean;

  @ApiProperty()
  createdAt!: string;
}

/** Contenedor paginado de asignaciones usuario-empresa para respuestas HTTP. */
export class UsuarioEmpresaListResponseDto {
  @ApiProperty({ type: () => [UsuarioEmpresaResponseDto] })
  items!: UsuarioEmpresaResponseDto[];

  @ApiProperty({ example: 1 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 15 })
  limit!: number;
}
