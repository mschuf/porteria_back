/**
 * @file mail.module.ts
 * @description Módulo global NestJS que registra servicios, listener y controlador de correo.
 */
import { Global, Module } from "@nestjs/common";
import { MailListener } from "./mail.listener";
import { MailService } from "./mail.service";

/**
 * Módulo global de correo con envío SMTP y despacho desde eventos de tickets.
 */
@Global()
@Module({
  providers: [MailService, MailListener],
  exports: [MailService],
})
export class MailModule {}
