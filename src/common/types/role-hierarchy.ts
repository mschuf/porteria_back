/**
 * @file role-hierarchy.ts
 * @description Jerarquía de gestión entre roles: qué roles puede gestionar cada rol y su inverso
 * (qué roles pueden gestionar a uno dado). Centraliza la regla usada por la administración de
 * usuarios y por la derivación del "superior directo" en la recuperación de contraseña.
 */
import type { UserRole } from "./authenticated-user";

/** Orden jerárquico (menor → mayor) usado para priorizar el superior más cercano. */
const ROLE_RANK: Record<UserRole, number> = {
  portero: 0,
  encargado_visita: 1,
  encargado_porteria: 1,
  encargado_seguridad: 2,
  admin_empresa: 3,
  super_admin: 4,
};

/** Todos los roles conocidos del sistema. */
export const ALL_USER_ROLES: UserRole[] = [
  "portero",
  "encargado_visita",
  "encargado_porteria",
  "encargado_seguridad",
  "admin_empresa",
  "super_admin",
];

/** Nivel funcional usado exclusivamente para la aprobación jerárquica de visitas. */
const VISITA_APPROVAL_ROLE_RANK: Record<UserRole, number> = {
  portero: 0,
  encargado_visita: 1,
  encargado_porteria: 1,
  encargado_seguridad: 2,
  admin_empresa: 3,
  super_admin: 4,
};

/** Roles inferiores sobre los que un actor puede decidir visitas. */
export function getVisitaApprovalSubordinateRoles(role: UserRole): UserRole[] {
  const rank = VISITA_APPROVAL_ROLE_RANK[role];
  return ALL_USER_ROLES.filter((candidate) => VISITA_APPROVAL_ROLE_RANK[candidate] < rank);
}

/**
 * Roles que un rol dado puede gestionar (crear, editar, resetear).
 * @param role - Rol del actor.
 * @returns Lista de roles gestionables por `role`.
 */
export function getManagedRoles(role: UserRole): UserRole[] {
  if (role === "super_admin") {
    return ["super_admin", "admin_empresa", "encargado_seguridad", "encargado_porteria", "encargado_visita", "portero"];
  }
  if (role === "admin_empresa" || role === "encargado_seguridad") {
    return role === "admin_empresa" ? ["encargado_porteria", "encargado_visita", "portero"] : ["encargado_porteria", "portero"];
  }
  if (role === "encargado_porteria") {
    return ["portero"];
  }
  return [];
}

/**
 * Roles que pueden gestionar (son superiores de) un rol dado, del más cercano al más lejano.
 * Es el inverso de {@link getManagedRoles}; se excluye el propio rol.
 * @param role - Rol del subordinado.
 * @returns Roles superiores ordenados por cercanía jerárquica.
 */
export function getManagerRoles(role: UserRole): UserRole[] {
  return ALL_USER_ROLES.filter(
    (candidate) => candidate !== role && getManagedRoles(candidate).includes(role),
  ).sort((a, b) => ROLE_RANK[a] - ROLE_RANK[b]);
}
