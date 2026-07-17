/**
 * @file sede.mapper.ts
 * @description Mapea filas SQL de sedes a DTOs de respuesta de la API.
 */
import type { SedeResponseDto } from "../dto/sede.response.dto";
import type { SedeRow } from "../sedes.types";

/**
 * Convierte una fila de Postgres en DTO de respuesta.
 * @param row - Fila cruda de `public.sede`.
 * @returns DTO listo para serializar en HTTP.
 */
export function mapSedeRowToResponse(row: SedeRow): SedeResponseDto {
  return {
    id: Number(row.id),
    empresaId: Number(row.empresa_id),
    empresaNombre: row.empresa_nombre,
    nombre: row.nombre,
    direccion: row.direccion,
    telefono: row.telefono,
    activo: row.activo,
    visitaRequiereAprobacion: row.visita_requiere_aprobacion,
    createdAt: new Date(row.creado_en).toISOString(),
    updatedAt: new Date(row.actualizado_en).toISOString(),
  };
}
