/**
 * @file export-historial-visitas-query.dto.ts
 * @description Parámetros de exportación del historial de visitas de Portería.
 */
import { ApiProperty, OmitType } from "@nestjs/swagger";
import { IsIn } from "class-validator";
import { ListVisitasQueryDto } from "./list-visitas-query.dto";

/** Formatos de exportación soportados por el historial. */
export const HISTORIAL_VISITAS_EXPORT_FORMATS = ["pdf", "xlsx"] as const;

export type HistorialVisitasExportFormat =
  (typeof HISTORIAL_VISITAS_EXPORT_FORMATS)[number];

/**
 * Filtros aplicados en la tabla de historial más el formato de descarga.
 * Reutiliza la validación del listado y excluye los parámetros de paginación.
 */
export class ExportHistorialVisitasQueryDto extends OmitType(ListVisitasQueryDto, [
  "page",
  "limit",
] as const) {
  @ApiProperty({ enum: HISTORIAL_VISITAS_EXPORT_FORMATS })
  @IsIn(HISTORIAL_VISITAS_EXPORT_FORMATS)
  format!: HistorialVisitasExportFormat;
}
