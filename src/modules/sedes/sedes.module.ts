/**
 * @file sedes.module.ts
 * @description Modulo NestJS que registra el CRUD de sedes.
 */
import { Module } from "@nestjs/common";
import { SedesController } from "./sedes.controller";
import { SedesService } from "./sedes.service";
import { SedesSqlRepository } from "./repositories/sedes.sql-repository";

/** Registra controlador, servicio y repositorio de sedes. */
@Module({
  controllers: [SedesController],
  providers: [SedesService, SedesSqlRepository],
  exports: [SedesService, SedesSqlRepository],
})
export class SedesModule {}
