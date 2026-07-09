/**
 * @file usuario-admin.mapper.ts
 * @description Mapea filas SQL de usuarios a DTOs de respuesta de la API.
 */
import type { UsuarioAdminResponseDto } from "../dto/usuario-admin.response.dto";
import type { UsuarioAdminRow } from "../usuarios-admin.types";

/**
 * Convierte una fila de Postgres en DTO de respuesta.
 * @param row - Fila cruda de `public.usuario` sin la contraseña.
 * @returns DTO listo para serializar en HTTP.
 */
export function mapUsuarioAdminRowToResponse(row: UsuarioAdminRow): UsuarioAdminResponseDto {
  return {
    id: Number(row.id),
    usuario: row.usuario,
    nombre: row.nombre,
    correo: row.correo,
    rol: row.rol,
    activo: row.activo,
    createdAt: new Date(row.creado_en).toISOString(),
    updatedAt: new Date(row.actualizado_en).toISOString(),
  };
}
