/**
 * @file reports.module.ts
 * @description Módulo NestJS que registra reportes superadmin y su repositorio SQL.
 */
import { Module } from "@nestjs/common";
import { SuperAdminGuard } from "../../common/guards/super-admin.guard";
import { UsersModule } from "../users/users.module";
import { VisitasModule } from "../visitas/visitas.module";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { VisitasExportService } from "./visitas-export.service";

/** Registra controlador, servicio, repositorio y guarda de super admin. */
@Module({
  imports: [UsersModule, VisitasModule],
  controllers: [ReportsController],
  providers: [ReportsService, VisitasExportService, SuperAdminGuard],
  exports: [ReportsService],
})
export class ReportsModule {}
