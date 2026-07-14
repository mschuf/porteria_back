/**
 * @file sede-empresa-porteria.mapper.ts
 * @description Mapea filas SQL de asignaciones sede-empresa de seguridad a DTOs de respuesta de la API.
 */
import type { SedeEmpresaPorteriaResponseDto } from "../dto/sede-empresa-porteria.response.dto";
import type { SedeEmpresaPorteriaRow } from "../sede-empresa-porteria.types";

/**
 * Convierte una fila de Postgres en DTO de respuesta.
 * @param row - Fila cruda de `public.sede_empresa_porteria` con nombres unidos.
 * @returns DTO listo para serializar en HTTP.
 */
export function mapSedeEmpresaPorteriaRowToResponse(
  row: SedeEmpresaPorteriaRow,
): SedeEmpresaPorteriaResponseDto {
  return {
    id: Number(row.id),
    sedeId: Number(row.sede_id),
    sedeNombre: row.sede_nombre,
    empresaPorteriaId: Number(row.empresa_porteria_id),
    empresaPorteriaNombre: row.empresa_porteria_nombre,
    activo: row.activo,
    asignadoDesde: new Date(row.asignado_desde).toISOString(),
    asignadoHasta: row.asignado_hasta ? new Date(row.asignado_hasta).toISOString() : null,
    createdAt: new Date(row.creado_en).toISOString(),
    updatedAt: new Date(row.actualizado_en).toISOString(),
  };
}
