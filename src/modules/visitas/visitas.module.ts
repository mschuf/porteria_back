/**
 * @file visitas.module.ts
 * @description Módulo NestJS que registra el CRUD de visitas y su repositorio SQL.
 */
import { Module } from "@nestjs/common";
import { PorteriaGuard } from "../../common/guards/porteria.guard";
import { MotivosVisitaModule } from "../motivos-visita/motivos-visita.module";
import { PersonasModule } from "../personas/personas.module";
import { UsersModule } from "../users/users.module";
import { CatalogModule } from "../catalog/catalog.module";
import { VisitaAuditSqlRepository } from "./repositories/visita-audit.sql-repository";
import { VisitasController } from "./visitas.controller";
import { VisitasService } from "./visitas.service";
import { VisitasSqlRepository } from "./repositories/visitas.sql-repository";
import { EncargadoVisitaGuard } from "../../common/guards/encargado-visita.guard";
import { EncargadoVisitaVisitasController } from "./encargado-visita-visitas.controller";
import { EncargadoVisitaVisitasService } from "./encargado-visita-visitas.service";
import { EncargadoVisitaVisitasSqlRepository } from "./repositories/encargado-visita-visitas.sql-repository";
import { VisitaAprobacionNotificacionesController } from "./visita-aprobacion-notificaciones.controller";
import { VisitaAprobacionNotificacionesService } from "./visita-aprobacion-notificaciones.service";
import { VisitaAprobacionNotificacionesSqlRepository } from "./repositories/visita-aprobacion-notificaciones.sql-repository";

/** Registra controlador, servicio y repositorio de visitas. */
@Module({
  imports: [PersonasModule, MotivosVisitaModule, UsersModule, CatalogModule],
  controllers: [VisitasController, EncargadoVisitaVisitasController, VisitaAprobacionNotificacionesController],
  providers: [VisitasService, EncargadoVisitaVisitasService, VisitaAprobacionNotificacionesService, VisitasSqlRepository, EncargadoVisitaVisitasSqlRepository, VisitaAprobacionNotificacionesSqlRepository, VisitaAuditSqlRepository, PorteriaGuard, EncargadoVisitaGuard],
  exports: [VisitasService, VisitasSqlRepository, VisitaAuditSqlRepository],
})
export class VisitasModule {}
