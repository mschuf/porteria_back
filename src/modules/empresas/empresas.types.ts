/**
 * @file empresas.types.ts
 * @description Tipos de fila Postgres e inputs de dominio para el modulo de empresas.
 */
import type { QueryResultRow } from "pg";
import type { EmpresaSortBy, EmpresaSortOrder } from "./dto/list-empresas-query.dto";

/** Fila de la tabla `public.empresa` tal como la devuelve Postgres. */
export interface EmpresaRow extends QueryResultRow {
  id: string;
  nombre: string;
  ruc: string | null;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  activo: boolean;
  creado_en: Date | string;
  actualizado_en: Date | string;
}

/** Filtros de listado paginado de empresas en el repositorio SQL. */
export interface EmpresaListFilters {
  page: number;
  limit: number;
  search?: string;
  nombre?: string;
  ruc?: string;
  direccion?: string;
  telefono?: string;
  correo?: string;
  activo?: boolean;
  sortBy?: EmpresaSortBy;
  sortOrder?: EmpresaSortOrder;
}

/** Payload de creacion de empresa normalizado para el repositorio. */
export interface CreateEmpresaInput {
  nombre: string;
  ruc: string | null;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  activo: boolean;
}

/** Payload parcial de actualizacion de empresa para el repositorio. */
export interface UpdateEmpresaInput {
  nombre?: string;
  ruc?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  correo?: string | null;
  activo?: boolean;
}

