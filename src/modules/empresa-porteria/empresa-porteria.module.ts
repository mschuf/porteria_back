/**
 * @file empresa-porteria.module.ts
 * @description Modulo NestJS que registra el CRUD de empresas de porteria.
 */
import { Module } from "@nestjs/common";
import { EmpresaPorteriaController } from "./empresa-porteria.controller";
import { EmpresaPorteriaService } from "./empresa-porteria.service";
import { EmpresaPorteriaSqlRepository } from "./repositories/empresa-porteria.sql-repository";

/** Registra controlador, servicio y repositorio de empresas de porteria. */
@Module({
  controllers: [EmpresaPorteriaController],
  providers: [EmpresaPorteriaService, EmpresaPorteriaSqlRepository],
  exports: [EmpresaPorteriaService, EmpresaPorteriaSqlRepository],
})
export class EmpresaPorteriaModule {}
