/**
 * @file usuario-empresa-porteria.module.ts
 * @description Modulo NestJS que registra el CRUD de asignaciones usuario-empresa-porteria.
 */
import { Module } from "@nestjs/common";
import { UsuarioEmpresaPorteriaController } from "./usuario-empresa-porteria.controller";
import { UsuarioEmpresaPorteriaService } from "./usuario-empresa-porteria.service";
import { UsuarioEmpresaPorteriaSqlRepository } from "./repositories/usuario-empresa-porteria.sql-repository";

/** Registra controlador, servicio y repositorio de asignaciones usuario-empresa-porteria. */
@Module({
  controllers: [UsuarioEmpresaPorteriaController],
  providers: [UsuarioEmpresaPorteriaService, UsuarioEmpresaPorteriaSqlRepository],
  exports: [UsuarioEmpresaPorteriaService, UsuarioEmpresaPorteriaSqlRepository],
})
export class UsuarioEmpresaPorteriaModule {}
