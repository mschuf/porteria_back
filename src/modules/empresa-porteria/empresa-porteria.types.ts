/**
 * @file empresa-porteria.types.ts
 * @description Tipos de fila Postgres e inputs de dominio para el modulo de empresas de porteria.
 */
import type { QueryResultRow } from "pg";
import type { EmpresaPorteriaSortBy, EmpresaPorteriaSortOrder } from "./dto/list-empresa-porteria-query.dto";

/** Fila de la tabla `public.empresa_porteria` tal como la devuelve Postgres. */
export interface EmpresaPorteriaRow extends QueryResultRow {
  id: string;
  nombre: string;
  ruc: string | null;
  telefono: string | null;
  correo: string | null;
  activo: boolean;
  creado_en: Date | string;
  actualizado_en: Date | string;
}

/** Filtros de listado paginado de empresas de porteria en el repositorio SQL. */
export interface EmpresaPorteriaListFilters {
  page: number;
  limit: number;
  search?: string;
  nombre?: string;
  ruc?: string;
  telefono?: string;
  correo?: string;
  activo?: boolean;
  sortBy?: EmpresaPorteriaSortBy;
  sortOrder?: EmpresaPorteriaSortOrder;
}

/** Payload de creacion de empresa de porteria normalizado para el repositorio. */
export interface CreateEmpresaPorteriaInput {
  nombre: string;
  ruc: string | null;
  telefono: string | null;
  correo: string | null;
  activo: boolean;
}

/** Payload parcial de actualizacion de empresa de porteria para el repositorio. */
export interface UpdateEmpresaPorteriaInput {
  nombre?: string;
  ruc?: string | null;
  telefono?: string | null;
  correo?: string | null;
  activo?: boolean;
}
