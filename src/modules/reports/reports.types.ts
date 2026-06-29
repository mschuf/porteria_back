/**
 * @file reports.types.ts
 * @description Tipos internos del módulo de reportes.
 */

/** Resultado de exportación del reporte de visitas de portería. */
export interface VisitaReportExportResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}
