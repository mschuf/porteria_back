/**
 * @file usuarios-admin.module.ts
 * @description Modulo NestJS que registra el CRUD de usuarios.
 */
import { Module } from "@nestjs/common";
import { UsuariosAdminController } from "./usuarios-admin.controller";
import { UsuariosAdminService } from "./usuarios-admin.service";
import { UsuariosAdminSqlRepository } from "./repositories/usuarios-admin.sql-repository";

/** Registra controlador, servicio y repositorio de usuarios. */
@Module({
  controllers: [UsuariosAdminController],
  providers: [UsuariosAdminService, UsuariosAdminSqlRepository],
  exports: [UsuariosAdminService, UsuariosAdminSqlRepository],
})
export class UsuariosAdminModule {}
