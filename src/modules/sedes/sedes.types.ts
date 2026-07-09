/**
 * @file sedes.types.ts
 * @description Tipos de fila Postgres e inputs de dominio para el modulo de sedes.
 */
import type { QueryResultRow } from "pg";
import type { SedeSortBy, SedeSortOrder } from "./dto/list-sedes-query.dto";

/** Fila de la tabla `public.sede` tal como la devuelve Postgres. */
export interface SedeRow extends QueryResultRow {
  id: string;
  empresa_id: string;
  empresa_nombre: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  activo: boolean;
  creado_en: Date | string;
  actualizado_en: Date | string;
}

/** Filtros de listado paginado de sedes en el repositorio SQL. */
export interface SedeListFilters {
  page: number;
  limit: number;
  search?: string;
  nombre?: string;
  direccion?: string;
  telefono?: string;
  empresaId?: number;
  activo?: boolean;
  sortBy?: SedeSortBy;
  sortOrder?: SedeSortOrder;
}

/** Payload de creacion de sede normalizado para el repositorio. */
export interface CreateSedeInput {
  empresaId: number;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  activo: boolean;
}

/** Payload parcial de actualizacion de sede para el repositorio. */
export interface UpdateSedeInput {
  empresaId?: number;
  nombre?: string;
  direccion?: string | null;
  telefono?: string | null;
  activo?: boolean;
}
