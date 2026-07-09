/**
 * @file usuario-empresa-porteria.mapper.ts
 * @description Mapea filas SQL de asignaciones usuario-empresa-porteria a DTOs de respuesta de la API.
 */
import type { UsuarioEmpresaPorteriaResponseDto } from "../dto/usuario-empresa-porteria.response.dto";
import type { UsuarioEmpresaPorteriaRow } from "../usuario-empresa-porteria.types";

/**
 * Convierte una fila de Postgres en DTO de respuesta.
 * @param row - Fila cruda de `public.usuario_empresa_porteria` con nombres unidos.
 * @returns DTO listo para serializar en HTTP.
 */
export function mapUsuarioEmpresaPorteriaRowToResponse(
  row: UsuarioEmpresaPorteriaRow,
): UsuarioEmpresaPorteriaResponseDto {
  return {
    id: Number(row.id),
    usuarioId: Number(row.usuario_id),
    usuarioNombre: row.usuario_nombre,
    empresaPorteriaId: Number(row.empresa_porteria_id),
    empresaPorteriaNombre: row.empresa_porteria_nombre,
    activo: row.activo,
    createdAt: new Date(row.creado_en).toISOString(),
  };
}
