/**
 * @file usuario-empresa.types.ts
 * @description Tipos de fila Postgres e inputs de dominio para el modulo de asignaciones usuario-empresa.
 */
import type { QueryResultRow } from "pg";
import type { UsuarioEmpresaSortBy, UsuarioEmpresaSortOrder } from "./dto/list-usuario-empresa-query.dto";

/** Fila de la tabla `public.usuario_empresa` tal como la devuelve Postgres (con nombres unidos). */
export interface UsuarioEmpresaRow extends QueryResultRow {
  id: string;
  usuario_id: string;
  usuario_nombre: string;
  empresa_id: string;
  empresa_nombre: string;
  activo: boolean;
  creado_en: Date | string;
}

/** Filtros de listado paginado de asignaciones usuario-empresa en el repositorio SQL. */
export interface UsuarioEmpresaListFilters {
  page: number;
  limit: number;
  search?: string;
  usuarioId?: number;
  empresaId?: number;
  activo?: boolean;
  sortBy?: UsuarioEmpresaSortBy;
  sortOrder?: UsuarioEmpresaSortOrder;
}

/** Payload de creacion de asignacion usuario-empresa normalizado para el repositorio. */
export interface CreateUsuarioEmpresaInput {
  usuarioId: number;
  empresaId: number;
  activo: boolean;
}

/** Payload parcial de actualizacion de asignacion usuario-empresa para el repositorio. */
export interface UpdateUsuarioEmpresaInput {
  usuarioId?: number;
  empresaId?: number;
  activo?: boolean;
}
