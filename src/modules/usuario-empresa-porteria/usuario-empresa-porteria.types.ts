/**
 * @file usuario-empresa-porteria.types.ts
 * @description Tipos de fila Postgres e inputs de dominio para el modulo de asignaciones usuario-empresa-porteria.
 */
import type { QueryResultRow } from "pg";
import type {
  UsuarioEmpresaPorteriaSortBy,
  UsuarioEmpresaPorteriaSortOrder,
} from "./dto/list-usuario-empresa-porteria-query.dto";

/** Fila de la tabla `public.usuario_empresa_porteria` tal como la devuelve Postgres (con nombres unidos). */
export interface UsuarioEmpresaPorteriaRow extends QueryResultRow {
  id: string;
  usuario_id: string;
  usuario_nombre: string;
  empresa_porteria_id: string;
  empresa_porteria_nombre: string;
  sede_empresa_porteria_id: string;
  sede_id: string;
  sede_nombre: string;
  activo: boolean;
  creado_en: Date | string;
}

/** Filtros de listado paginado de asignaciones usuario-empresa-porteria en el repositorio SQL. */
export interface UsuarioEmpresaPorteriaListFilters {
  page: number;
  limit: number;
  search?: string;
  usuarioId?: number;
  empresaPorteriaId?: number;
  sedeId?: number;
  activo?: boolean;
  sortBy?: UsuarioEmpresaPorteriaSortBy;
  sortOrder?: UsuarioEmpresaPorteriaSortOrder;
}

/** Payload de creacion de asignacion usuario-empresa-porteria normalizado para el repositorio. */
export interface CreateUsuarioEmpresaPorteriaInput {
  usuarioId: number;
  empresaPorteriaId: number;
  sedeEmpresaPorteriaId: number;
  activo: boolean;
}

/** Payload parcial de actualizacion de asignacion usuario-empresa-porteria para el repositorio. */
export interface UpdateUsuarioEmpresaPorteriaInput {
  usuarioId?: number;
  empresaPorteriaId?: number;
  sedeEmpresaPorteriaId?: number;
  activo?: boolean;
}
