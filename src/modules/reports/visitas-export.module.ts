/**
 * @file visitas-export.module.ts
 * @description Módulo compartido que expone la generación de PDF/Excel de visitas.
 */
import { Module } from "@nestjs/common";
import { VisitasExportService } from "./visitas-export.service";

/**
 * Permite reutilizar la exportación desde reportes y desde el historial de Portería
 * sin acoplar ambos módulos entre sí.
 */
@Module({
  providers: [VisitasExportService],
  exports: [VisitasExportService],
})
export class VisitasExportModule {}
