/**
 * @file sede-empresa-porteria.module.ts
 * @description Modulo NestJS que registra el CRUD de asignaciones sede-empresa de seguridad.
 */
import { Module } from "@nestjs/common";
import { SedeEmpresaPorteriaController } from "./sede-empresa-porteria.controller";
import { SedeEmpresaPorteriaService } from "./sede-empresa-porteria.service";
import { SedeEmpresaPorteriaSqlRepository } from "./repositories/sede-empresa-porteria.sql-repository";

/** Registra controlador, servicio y repositorio de asignaciones sede-empresa de seguridad. */
@Module({
  controllers: [SedeEmpresaPorteriaController],
  providers: [SedeEmpresaPorteriaService, SedeEmpresaPorteriaSqlRepository],
  exports: [SedeEmpresaPorteriaService, SedeEmpresaPorteriaSqlRepository],
})
export class SedeEmpresaPorteriaModule {}
