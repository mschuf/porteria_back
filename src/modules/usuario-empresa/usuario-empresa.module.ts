/**
 * @file usuario-empresa.module.ts
 * @description Modulo NestJS que registra el CRUD de asignaciones usuario-empresa.
 */
import { Module } from "@nestjs/common";
import { UsuarioEmpresaController } from "./usuario-empresa.controller";
import { UsuarioEmpresaService } from "./usuario-empresa.service";
import { UsuarioEmpresaSqlRepository } from "./repositories/usuario-empresa.sql-repository";

/** Registra controlador, servicio y repositorio de asignaciones usuario-empresa. */
@Module({
  controllers: [UsuarioEmpresaController],
  providers: [UsuarioEmpresaService, UsuarioEmpresaSqlRepository],
  exports: [UsuarioEmpresaService, UsuarioEmpresaSqlRepository],
})
export class UsuarioEmpresaModule {}
