/**
 * @file sede-empresa-porteria.types.ts
 * @description Tipos de fila Postgres e inputs de dominio para el modulo de asignaciones sede-empresa de seguridad.
 */
import type { QueryResultRow } from "pg";
import type {
  SedeEmpresaPorteriaSortBy,
  SedeEmpresaPorteriaSortOrder,
} from "./dto/list-sede-empresa-porteria-query.dto";

/** Fila de la tabla `public.sede_empresa_porteria` tal como la devuelve Postgres (con nombres unidos). */
export interface SedeEmpresaPorteriaRow extends QueryResultRow {
  id: string;
  sede_id: string;
  sede_nombre: string;
  empresa_porteria_id: string;
  empresa_porteria_nombre: string;
  activo: boolean;
  asignado_desde: Date | string;
  asignado_hasta: Date | string | null;
  creado_en: Date | string;
  actualizado_en: Date | string;
}

/** Filtros de listado paginado de asignaciones sede-empresa de seguridad en el repositorio SQL. */
export interface SedeEmpresaPorteriaListFilters {
  page: number;
  limit: number;
  search?: string;
  sedeId?: number;
  empresaPorteriaId?: number;
  activo?: boolean;
  sortBy?: SedeEmpresaPorteriaSortBy;
  sortOrder?: SedeEmpresaPorteriaSortOrder;
}

/** Payload de creacion de asignacion sede-empresa de seguridad normalizado para el repositorio. */
export interface CreateSedeEmpresaPorteriaInput {
  sedeId: number;
  empresaPorteriaId: number;
  activo: boolean;
  asignadoDesde: Date;
  asignadoHasta: Date | null;
}

/** Payload parcial de actualizacion de asignacion sede-empresa de seguridad para el repositorio. */
export interface UpdateSedeEmpresaPorteriaInput {
  sedeId?: number;
  empresaPorteriaId?: number;
  activo?: boolean;
  asignadoDesde?: Date;
  asignadoHasta?: Date | null;
}
