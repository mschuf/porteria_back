/**
 * @file auth.module.ts
 * @description Módulo NestJS de autenticación con JWT, Passport y usuarios locales.
 */
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import type { AppConfig } from "../../config/configuration";
import { PostgresModule } from "../postgres/postgres.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";
import { UsuariosSqlRepository } from "./repositories/usuarios.sql-repository";

/**
 * Registra controlador, servicios y estrategia JWT para autenticación local.
 */
@Module({
  imports: [
    ConfigModule,
    PostgresModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      /**
       * Configura el módulo JWT con secreto y expiración desde variables de entorno.
       * @param config - Servicio de configuración de la aplicación.
       * @returns Opciones de registro del módulo JWT.
       * @throws No lanza excepciones explícitas.
       */
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        secret: config.get("jwt.secret", { infer: true }),
        signOptions: { expiresIn: config.get("jwt.expiresIn", { infer: true }) },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, UsuariosSqlRepository],
  exports: [AuthService, UsuariosSqlRepository, JwtModule, PassportModule],
})
export class AuthModule {}
