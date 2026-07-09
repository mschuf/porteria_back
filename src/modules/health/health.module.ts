/**
 * @file health.module.ts
 * @description Módulo de health checks con Terminus e indicadores de infraestructura.
 */
import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { PostgresModule } from "../postgres/postgres.module";
import { HealthController } from "./health.controller";
import { SmtpHealthIndicator } from "./indicators/smtp.indicator";
import { PostgresHealthIndicator } from "../postgres/postgres.health.indicator";

/**
 * Registra el controlador de salud y los indicadores de SMTP y PostgreSQL.
 */
@Module({
  imports: [TerminusModule, PostgresModule],
  controllers: [HealthController],
  providers: [SmtpHealthIndicator, PostgresHealthIndicator],
})
export class HealthModule {}
