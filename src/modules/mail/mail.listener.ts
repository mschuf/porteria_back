/**
 * @file mail.listener.ts
 * @description Escucha eventos de dominio de tickets y despacha correos con las plantillas correspondientes.
 */
import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import {
  MAIL_EVENTS,
  type TicketAssignedEvent,
  type TicketCreatedEvent,
  type TicketReassignedEvent,
  type TicketStatusChangedEvent,
} from "./mail.events";

/** Resultado detallado del envío de correos al crear un ticket. */
export interface TicketCreatedMailDispatchResult {
  sent: boolean;
  error: string | null;
  userMailSent: boolean;
  supportMailSent: boolean;
}

/**
 * Listener de eventos de correo relacionados con el ciclo de vida de tickets.
 */
@Injectable()
export class MailListener {
  private readonly logger = new Logger(MailListener.name);

  /**
   * Envía correos personalizados a cada destinatario del evento de ticket creado.
   * @param event - Datos del ticket y lista de destinatarios con rol.
   * @returns Estado agregado del envío por rol solicitante/técnico.
   */
  async dispatchTicketCreated(
    event: TicketCreatedEvent,
  ): Promise<TicketCreatedMailDispatchResult> {
    // Envío deshabilitado por alcance del proyecto (solo Portería).
    this.logger.warn(
      `Ticket ${event.ticketId}: envío de correo ticket.created deshabilitado temporalmente.`,
    );

    return {
      sent: true,
      error: null,
      userMailSent: false,
      supportMailSent: false,
    };
  }

  /**
   * Maneja el evento asíncrono de ticket creado y despacha los correos correspondientes.
   * @param event - Payload del evento `mail.ticket.created`.
   * @returns Promesa resuelta tras intentar el envío.
   */
  @OnEvent(MAIL_EVENTS.TICKET_CREATED, { async: true, promisify: true })
  async onTicketCreated(event: TicketCreatedEvent): Promise<void> {
    await this.dispatchTicketCreated(event);
  }

  /**
   * Maneja el evento de cambio de estado y notifica a los destinatarios.
   * @param event - Payload con estados anterior y nuevo.
   * @returns Promesa resuelta tras intentar el envío.
   */
  @OnEvent(MAIL_EVENTS.TICKET_STATUS_CHANGED, { async: true, promisify: true })
  async onTicketStatusChanged(event: TicketStatusChangedEvent): Promise<void> {
    this.logger.warn(
      `Ticket ${event.ticketId}: envío de correo ticket.status_changed deshabilitado temporalmente.`,
    );
  }

  /**
   * Maneja el evento de asignación de ticket al técnico.
   * @param event - Payload con técnico asignado y destinatarios.
   * @returns Promesa resuelta tras intentar el envío.
   */
  @OnEvent(MAIL_EVENTS.TICKET_ASSIGNED, { async: true, promisify: true })
  async onTicketAssigned(event: TicketAssignedEvent): Promise<void> {
    await this.dispatchTicketAssigned(event);
  }

  /**
   * Maneja el evento de reasignación de ticket a otro técnico.
   * @param event - Payload con técnico anterior, nuevo y destinatarios.
   * @returns Promesa resuelta tras intentar el envío.
   */
  @OnEvent(MAIL_EVENTS.TICKET_REASSIGNED, { async: true, promisify: true })
  async onTicketReassigned(event: TicketReassignedEvent): Promise<void> {
    await this.dispatchTicketReassigned(event);
  }

  /**
   * Envía correos de asignación inicial personalizados por rol.
   * @param event - Payload con destinatarios y datos del ticket.
   * @returns void
   */
  async dispatchTicketAssigned(event: TicketAssignedEvent): Promise<void> {
    this.logger.warn(
      `Ticket ${event.ticketId}: envío de correo ticket.assigned deshabilitado temporalmente.`,
    );
  }

  /**
   * Envía correos de reasignación personalizados por rol.
   * @param event - Payload con destinatarios y datos del ticket.
   * @returns void
   */
  async dispatchTicketReassigned(event: TicketReassignedEvent): Promise<void> {
    this.logger.warn(
      `Ticket ${event.ticketId}: envío de correo ticket.reassigned deshabilitado temporalmente.`,
    );
  }
}
