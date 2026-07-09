/**
 * @file empresas.module.ts
 * @description Modulo NestJS que registra el CRUD de empresas.
 */
import { Module } from "@nestjs/common";
import { EmpresasController } from "./empresas.controller";
import { EmpresasService } from "./empresas.service";
import { EmpresasSqlRepository } from "./repositories/empresas.sql-repository";

/** Registra controlador, servicio y repositorio de empresas. */
@Module({
  controllers: [EmpresasController],
  providers: [EmpresasService, EmpresasSqlRepository],
  exports: [EmpresasService, EmpresasSqlRepository],
})
export class EmpresasModule {}

