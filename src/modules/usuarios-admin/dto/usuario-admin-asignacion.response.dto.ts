/**
 * @file usuario-admin-asignacion.response.dto.ts
 * @description Contrato de la explicación de acceso de un usuario según su rol.
 */
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { UserRole } from "../../../common/types/authenticated-user";
import { USUARIO_ADMIN_ROLES } from "./list-usuarios-admin-query.dto";

export const USUARIO_ASIGNACION_TIPOS = ["global", "empresa", "porteria"] as const;
export type UsuarioAsignacionTipo = (typeof USUARIO_ASIGNACION_TIPOS)[number];

/** Usuario cuya asignación se está explicando. */
export class UsuarioAsignacionUsuarioDto {
  @ApiProperty({ example: 12 })
  id!: number;

  @ApiProperty({ example: "jperez" })
  usuario!: string;

  @ApiProperty({ example: "Juan Pérez" })
  nombre!: string;

  @ApiProperty({ enum: USUARIO_ADMIN_ROLES, example: "portero" })
  rol!: UserRole;

  @ApiProperty({ example: true })
  activo!: boolean;
}

/** Empresa receptora incluida en una asignación. */
export class UsuarioAsignacionEmpresaDto {
  @ApiProperty({ example: 3 })
  id!: number;

  @ApiProperty({ example: "Empresa receptora" })
  nombre!: string;
}

/** Sede incluida en la cadena de acceso de un portero. */
export class UsuarioAsignacionSedeDto {
  @ApiProperty({ example: 7 })
  id!: number;

  @ApiProperty({ example: "Casa central" })
  nombre!: string;
}

/** Empresa de portería incluida en la cadena de acceso de un portero. */
export class UsuarioAsignacionEmpresaPorteriaDto {
  @ApiProperty({ example: 5 })
  id!: number;

  @ApiProperty({ example: "Seguridad S.A." })
  nombre!: string;
}

/** Cadena completa de acceso vigente para un portero. */
export class UsuarioAsignacionPorteriaDto {
  @ApiProperty({ type: UsuarioAsignacionEmpresaPorteriaDto })
  empresaPorteria!: UsuarioAsignacionEmpresaPorteriaDto;

  @ApiProperty({ type: UsuarioAsignacionSedeDto })
  sede!: UsuarioAsignacionSedeDto;

  @ApiProperty({ type: UsuarioAsignacionEmpresaDto })
  empresa!: UsuarioAsignacionEmpresaDto;
}

/** Respuesta discriminada de explicación de asignación. */
export class UsuarioAdminAsignacionResponseDto {
  @ApiProperty({ enum: USUARIO_ASIGNACION_TIPOS, example: "porteria" })
  tipo!: UsuarioAsignacionTipo;

  @ApiProperty({ type: UsuarioAsignacionUsuarioDto })
  usuario!: UsuarioAsignacionUsuarioDto;

  @ApiPropertyOptional({ type: () => [UsuarioAsignacionEmpresaDto] })
  empresas?: UsuarioAsignacionEmpresaDto[];

  @ApiPropertyOptional({ type: UsuarioAsignacionPorteriaDto, nullable: true })
  asignacion?: UsuarioAsignacionPorteriaDto | null;
}
