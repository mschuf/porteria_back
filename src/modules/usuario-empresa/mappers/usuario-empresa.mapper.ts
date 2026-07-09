/**
 * @file usuario-empresa.mapper.ts
 * @description Mapea filas SQL de asignaciones usuario-empresa a DTOs de respuesta de la API.
 */
import type { UsuarioEmpresaResponseDto } from "../dto/usuario-empresa.response.dto";
import type { UsuarioEmpresaRow } from "../usuario-empresa.types";

/**
 * Convierte una fila de Postgres en DTO de respuesta.
 * @param row - Fila cruda de `public.usuario_empresa` con nombres unidos.
 * @returns DTO listo para serializar en HTTP.
 */
export function mapUsuarioEmpresaRowToResponse(row: UsuarioEmpresaRow): UsuarioEmpresaResponseDto {
  return {
    id: Number(row.id),
    usuarioId: Number(row.usuario_id),
    usuarioNombre: row.usuario_nombre,
    empresaId: Number(row.empresa_id),
    empresaNombre: row.empresa_nombre,
    activo: row.activo,
    createdAt: new Date(row.creado_en).toISOString(),
  };
}
