/**
 * @file empresa-porteria.mapper.ts
 * @description Mapea filas SQL de empresas de porteria a DTOs de respuesta de la API.
 */
import type { EmpresaPorteriaResponseDto } from "../dto/empresa-porteria.response.dto";
import type { EmpresaPorteriaRow } from "../empresa-porteria.types";

/**
 * Convierte una fila de Postgres en DTO de respuesta.
 * @param row - Fila cruda de `public.empresa_porteria`.
 * @returns DTO listo para serializar en HTTP.
 */
export function mapEmpresaPorteriaRowToResponse(row: EmpresaPorteriaRow): EmpresaPorteriaResponseDto {
  return {
    id: Number(row.id),
    nombre: row.nombre,
    ruc: row.ruc,
    telefono: row.telefono,
    correo: row.correo,
    activo: row.activo,
    createdAt: new Date(row.creado_en).toISOString(),
    updatedAt: new Date(row.actualizado_en).toISOString(),
  };
}
