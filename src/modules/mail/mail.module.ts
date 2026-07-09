/**
 * @file mail.module.ts
 * @description Módulo global NestJS que registra servicios de correo.
 */
import { Global, Module } from "@nestjs/common";
import { MailService } from "./mail.service";

/**
 * Módulo global de correo con envío SMTP.
 */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
