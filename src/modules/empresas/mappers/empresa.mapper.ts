/**
 * @file empresa.mapper.ts
 * @description Mapea filas SQL de empresas a DTOs de respuesta de la API.
 */
import type { EmpresaResponseDto } from "../dto/empresa.response.dto";
import type { EmpresaRow } from "../empresas.types";

/**
 * Convierte una fila de Postgres en DTO de respuesta.
 * @param row - Fila cruda de `public.empresa`.
 * @returns DTO listo para serializar en HTTP.
 */
export function mapEmpresaRowToResponse(row: EmpresaRow): EmpresaResponseDto {
  return {
    id: Number(row.id),
    nombre: row.nombre,
    ruc: row.ruc,
    direccion: row.direccion,
    telefono: row.telefono,
    correo: row.correo,
    activo: row.activo,
    createdAt: new Date(row.creado_en).toISOString(),
    updatedAt: new Date(row.actualizado_en).toISOString(),
  };
}

