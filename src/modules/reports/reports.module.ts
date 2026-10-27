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
import { VisitasExportModule } from "./visitas-export.module";

/** Registra controlador, servicio, repositorio y guarda de super admin. */
@Module({
  imports: [UsersModule, VisitasModule, VisitasExportModule],
  controllers: [ReportsController],
  providers: [ReportsService, SuperAdminGuard],
  exports: [ReportsService],
})
export class ReportsModule {}
