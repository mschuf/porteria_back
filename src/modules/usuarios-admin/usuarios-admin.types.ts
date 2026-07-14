/**
 * @file usuarios-admin.types.ts
 * @description Tipos de fila Postgres e inputs de dominio para el CRUD de usuarios.
 */
import type { QueryResultRow } from "pg";
import type { UserRole } from "../../common/types/authenticated-user";
import type { UsuarioAdminSortBy, UsuarioAdminSortOrder } from "./dto/list-usuarios-admin-query.dto";

/** Fila de la tabla `public.usuario` sin la contraseña. */
export interface UsuarioAdminRow extends QueryResultRow {
  id: string;
  usuario: string;
  nombre: string;
  correo: string | null;
  rol: UserRole;
  activo: boolean;
  creado_en: Date | string;
  actualizado_en: Date | string;
}

/** Empresa receptora activa asignada a un administrador de empresa. */
export interface UsuarioAdminEmpresaAssignmentRow extends QueryResultRow {
  empresa_id: string;
  empresa_nombre: string;
}

/** Cadena activa y vigente que determina el acceso de un usuario portero. */
export interface UsuarioAdminPorteriaAssignmentRow extends QueryResultRow {
  empresa_seguridad_id: string;
  empresa_porteria_nombre: string;
  sede_id: string;
  sede_nombre: string;
  empresa_id: string;
  empresa_nombre: string;
}

/** Filtros de listado paginado de usuarios en el repositorio SQL. */
export interface UsuarioAdminListFilters {
  page: number;
  limit: number;
  search?: string;
  usuario?: string;
  nombre?: string;
  correo?: string;
  rol?: UserRole;
  activo?: boolean;
  sortBy?: UsuarioAdminSortBy;
  sortOrder?: UsuarioAdminSortOrder;
  actorSedeIds?: number[];
}

/** Payload de creacion de usuario normalizado para el repositorio. */
export interface CreateUsuarioAdminInput {
  usuario: string;
  nombre: string;
  correo: string | null;
  rol: UserRole;
  activo: boolean;
  contrasenaHash: string;
}

/** Payload parcial de actualizacion de usuario para el repositorio. */
export interface UpdateUsuarioAdminInput {
  usuario?: string;
  nombre?: string;
  correo?: string | null;
  rol?: UserRole;
  activo?: boolean;
}
