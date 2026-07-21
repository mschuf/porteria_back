/**
 * @file visitas.service.ts
 * @description Orquesta el CRUD de visitas contra Postgres y aplica reglas de negocio.
 */
import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { PaginatedResult } from "../../common/dto/pagination.dto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { API_ERROR_CODE } from "../../common/types/api-error-code";
import type { AuthenticatedUser } from "../../common/types/authenticated-user";
import { SedeAccessService } from "../../common/sede-access/sede-access.service";
import type { AppConfig } from "../../config/configuration";
import type { DomainUser } from "../glpi/mappers/user.mapper";
import { MotivosVisitaService } from "../motivos-visita/motivos-visita.service";
import { PersonasSqlRepository } from "../personas/repositories/personas.sql-repository";
import type { PersonaRow } from "../personas/personas.types";
import { PROVEEDOR_SIN_ASIGNAR_NOMBRE } from "../personas/personas.types";
import { processPersonaPhoto } from "../personas/persona-photo.processor";
import { validatePersonaPhotoUpload } from "../personas/persona-photo-validation";
import { UsersService } from "../users/users.service";
import { MailService } from "../mail/mail.service";
import { buildVisitaAssignmentHtml, buildVisitaAssignmentSubject, buildVisitaAssignmentText } from "../mail/templates/visita-assignment.template";
import type { CreateVisitaInput, UpdateVisitaInput, VisitaMetricsRange } from "./visitas.types";
import type { VisitaMetricsResponseDto } from "./dto/visita-metrics.response.dto";
import type { VisitaMetricsQueryDto } from "./dto/visita-metrics-query.dto";
import type { CreateVisitaResponseDto, VisitaResponseDto } from "./dto/visita.response.dto";
import { CreateVisitaDto } from "./dto/create-visita.dto";
import {
  DEFAULT_VISITAS_PAGE_LIMIT,
  type ListVisitasQueryDto,
} from "./dto/list-visitas-query.dto";
import { UpdateVisitaDto } from "./dto/update-visita.dto";
import {
  DEFAULT_RESPONSABLE_CANDIDATES_LIMIT,
  type ListResponsableCandidatesQueryDto,
} from "./dto/list-responsable-candidates-query.dto";
import type { ResponsableCandidateListResponseDto } from "./dto/responsable-candidate.response.dto";
import type { ListTarjetaCandidatesQueryDto } from "./dto/list-tarjeta-candidates-query.dto";
import type {
  TarjetaCandidateBlockReason,
  TarjetaCandidateListResponseDto,
} from "./dto/tarjeta-candidate.response.dto";
import {
  isVisitaTarjetaColor,
  resolveZonasFromTarjetaColor,
  zonasMatchTarjetaColor,
  type VisitaTarjetaColor,
} from "./domain/visita-tarjeta-color";
import {
  diffVisitaAuditFields,
  resolveVisitaAuditAction,
} from "./domain/visita-audit.helpers";
import { isVisitaAbierta, requiereCancelacionAlEliminar } from "./domain/visita-estado.helpers";
import { requiresTarjetaDisponibilidad } from "./domain/visita-tarjeta-disponibilidad";
import type { VisitaEstado } from "./domain/visita-estado";
import type { VisitaZona } from "./domain/visita-zona";
import { mapVisitaRowToResponse } from "./mappers/visita.mapper";
import { VisitaAuditSqlRepository } from "./repositories/visita-audit.sql-repository";
import { VisitasSqlRepository } from "./repositories/visitas.sql-repository";
import { VisitaAprobacionNotificacionesService } from "./visita-aprobacion-notificaciones.service";
import type {
  VisitaAuditAction,
  VisitaAuditSnapshot,
  VisitaListRow,
} from "./visitas.types";

/** Servicio de gestión de visitas con persistencia en Postgres. */
@Injectable()
export class VisitasService {
  private readonly logger = new Logger(VisitasService.name);
  private staleSyncDayKey: string | null = null;

  /** Inyecta repositorios SQL de visitas y personas. */
  constructor(
    private readonly repo: VisitasSqlRepository,
    private readonly auditRepo: VisitaAuditSqlRepository,
    private readonly personasRepo: PersonasSqlRepository,
    private readonly motivosVisitaService: MotivosVisitaService,
    private readonly usersService: UsersService,
    private readonly sedeAccess: SedeAccessService,
    private readonly mail: MailService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly notifications: VisitaAprobacionNotificacionesService,
  ) {}

  private async resolveSedeScope(user: AuthenticatedUser): Promise<number[] | undefined> {
    return this.sedeAccess.resolveSedeIds(user);
  }

  private async resolveCreateSedeId(user: AuthenticatedUser, requestedSedeId?: number): Promise<number> {
    if (user.role === "portero") return user.sedeId!;
    const allowed = await this.resolveSedeScope(user) ?? await this.repo.findAllActiveSedeIds();
    if (!requestedSedeId || !allowed.includes(requestedSedeId)) {
      throw new BusinessException({
        message: "Seleccione una sede activa autorizada",
        code: API_ERROR_CODE.FORBIDDEN,
        status: HttpStatus.FORBIDDEN,
      });
    }
    return requestedSedeId;
  }

  private toAuditSnapshot(row: VisitaListRow): VisitaAuditSnapshot {
    const dto = mapVisitaRowToResponse(row);
    return {
      id: dto.id,
      personaId: dto.personaId,
      visitante: dto.visitante,
      documento: dto.documento,
      empresa: dto.empresa,
      sedeId: dto.sedeId,
      sedeNombre: dto.sedeNombre,
      responsableId: dto.responsableId,
      motivo: dto.motivo,
      responsableNombre: dto.responsableNombre,
      usuarioCreadorId: dto.usuarioCreadorId,
      usuarioCreadorNombre: dto.usuarioCreadorNombre,
      estado: dto.estado,
      estadoAprobacion: row.estado_aprobacion,
      motivoRechazo: row.motivo_rechazo,
      estadoSeguimiento: dto.estadoSeguimiento,
      zonasPermitidas: [...dto.zonasPermitidas],
      credencialNumero: dto.credencialNumero,
      tarjetaColor: dto.tarjetaColor,
      entradaAt: dto.entradaAt,
      salidaAt: dto.salidaAt,
      observaciones: dto.observaciones,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    };
  }

  private async logAuditEvent(input: {
    visitaId: number;
    actorUserId: number;
    action: VisitaAuditAction;
    before: VisitaListRow | null;
    after: VisitaListRow | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const beforeState = input.before ? this.toAuditSnapshot(input.before) : null;
    const afterState = input.after ? this.toAuditSnapshot(input.after) : null;
    const changedFields = diffVisitaAuditFields(beforeState, afterState);
    await this.logAuditSnapshots({
      visitaId: input.visitaId,
      actorUserId: input.actorUserId,
      action: input.action,
      beforeState,
      afterState,
      changedFields,
      metadata: input.metadata,
    });
  }

  private async logAuditSnapshots(input: {
    visitaId: number;
    actorUserId: number;
    action: VisitaAuditAction;
    beforeState: VisitaAuditSnapshot | null;
    afterState: VisitaAuditSnapshot | null;
    changedFields: string[];
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.auditRepo.create({
      visitaId: input.visitaId,
      actorUserId: input.actorUserId,
      action: input.action,
      beforeState: input.beforeState,
      afterState: input.afterState,
      changedFields: input.changedFields,
      metadata: input.metadata,
    });
  }

  private rejectInconsistentZonas(tarjetaColor: VisitaTarjetaColor, zonas: VisitaZona[]): void {
    if (!zonasMatchTarjetaColor(tarjetaColor, zonas)) {
      throw new BusinessException({
        message: "Las zonas permitidas no coinciden con el color de tarjeta seleccionado",
        code: API_ERROR_CODE.VALIDATION,
        status: HttpStatus.BAD_REQUEST,
      });
    }
  }

  private resolveCurrentTarjetaColor(
    currentColor: string | null,
    dtoColor: VisitaTarjetaColor | undefined,
  ): VisitaTarjetaColor | null {
    if (dtoColor !== undefined) return dtoColor;
    return isVisitaTarjetaColor(currentColor) ? currentColor : null;
  }

  private async assertTarjetaDisponible(
    sedeId: number,
    credencialNumero: string,
    excludeVisitaId?: number,
    allowEnUsoFromExcludedVisit = false,
  ): Promise<void> {
    const normalized = credencialNumero.trim();
    const numero = Number(normalized);
    if (!normalized || !Number.isSafeInteger(numero) || numero < 1 || String(numero) !== normalized) {
      throw new BusinessException({
        message: "Seleccione una tarjeta válida del catálogo",
        code: API_ERROR_CODE.VALIDATION,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    const [tarjeta] = await this.repo.findTarjetaCandidates({
      sedeIds: [sedeId],
      numero,
      excludeVisitaId,
      limit: 1,
    });
    if (!tarjeta) {
      throw new BusinessException({
        message: `La tarjeta Nº ${normalized} no existe en la sede de la visita`,
        code: API_ERROR_CODE.VALIDATION,
        status: HttpStatus.BAD_REQUEST,
      });
    }
    if (!tarjeta.activo) {
      throw new BusinessException({
        message: `La tarjeta Nº ${normalized} está inactiva`,
        code: API_ERROR_CODE.CONFLICT,
        status: HttpStatus.CONFLICT,
      });
    }
    if ((tarjeta.en_uso && !allowEnUsoFromExcludedVisit) || tarjeta.ocupada_por_visita) {
      throw new BusinessException({
        message: `La tarjeta Nº ${normalized} ya está en uso`,
        code: API_ERROR_CODE.CONFLICT,
        status: HttpStatus.CONFLICT,
      });
    }
  }

  private async assertPersonaSinVisitaActiva(
    personaId: number,
    referenceDate: Date,
    excludeVisitaId?: number,
  ): Promise<void> {
    const { start, end } = this.getLocalDayBounds(referenceDate);
    const conflict = await this.repo.findActiveByPersonaId(personaId, excludeVisitaId, start, end);
    if (!conflict) return;

    throw new BusinessException({
      message: `El visitante ${conflict.visitante} ya tiene una visita activa (visita #${conflict.id}).`,
      code: API_ERROR_CODE.CONFLICT,
      status: HttpStatus.CONFLICT,
    });
  }

  private async assertPersonaConProveedorValido(persona: PersonaRow): Promise<void> {
    if (persona.proveedor_nombre === PROVEEDOR_SIN_ASIGNAR_NOMBRE) {
      throw new BusinessException({
        message: `La persona ${persona.id} no tiene proveedor asignado. Edítela en Personas y seleccione un proveedor.`,
        code: API_ERROR_CODE.CONFLICT,
        status: HttpStatus.CONFLICT,
      });
    }

    if (!persona.proveedor_activo) {
      throw new BusinessException({
        message: `El proveedor de la persona ${persona.id} está inactivo`,
        code: API_ERROR_CODE.CONFLICT,
        status: HttpStatus.CONFLICT,
      });
    }
  }

  private rejectManualSinSalidaEstado(estado: VisitaEstado | undefined): void {
    if (estado === "sin_salida") {
      throw new BusinessException({
        message: "El estado sin_salida solo se asigna automáticamente",
        code: API_ERROR_CODE.VALIDATION,
        status: HttpStatus.BAD_REQUEST,
      });
    }
  }

  private getLocalDayKey(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
  }

  private getStartOfToday(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  }

  private getLocalDayBounds(reference: Date): { start: Date; end: Date } {
    const start = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate(), 0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  private async syncStaleVisitasIfNeeded(): Promise<void> {
    const dayKey = this.getLocalDayKey();
    if (this.staleSyncDayKey === dayKey) return;

    const startOfToday = this.getStartOfToday();
    const beforeRows = await this.repo.findStaleCandidates(startOfToday);
    const beforeSnapshotsById = new Map(
      beforeRows.map((row) => [String(row.id), this.toAuditSnapshot(row)]),
    );

    const afterRows = await this.repo.markStaleWithoutCheckout(startOfToday);

    for (const afterRow of afterRows) {
      const beforeSnapshot = beforeSnapshotsById.get(String(afterRow.id));
      if (!beforeSnapshot) continue;

      const afterSnapshot = this.toAuditSnapshot(afterRow);
      const changedFields = diffVisitaAuditFields(beforeSnapshot, afterSnapshot);
      if (changedFields.length === 0) continue;

      await this.logAuditSnapshots({
        visitaId: Number(afterRow.id),
        actorUserId: 0,
        action: "visita.updated",
        beforeState: beforeSnapshot,
        afterState: afterSnapshot,
        changedFields,
        metadata: { source: "daily_stale_sync" },
      });
    }

    this.staleSyncDayKey = dayKey;
  }

  /**
   * @param query - Rango opcional de entrada_at (por defecto últimos 7 días).
   * @returns Contadores de visitas por período, último día y zonas activas.
   */
  async getMetrics(user: AuthenticatedUser, query: VisitaMetricsQueryDto = {}): Promise<VisitaMetricsResponseDto> {
    await this.syncStaleVisitasIfNeeded();
    const range = this.resolveMetricsRange(query);
    const row = await this.repo.getMetrics(range, await this.resolveSedeScope(user));

    return {
      monthVisits: Number(row.month_visits ?? 0),
      dayVisits: Number(row.day_visits ?? 0),
      activeOnlyAdmin: Number(row.active_only_admin ?? 0),
      activeOnlyFactory: Number(row.active_only_factory ?? 0),
      activeBothZones: Number(row.active_both_zones ?? 0),
      activeStaleWithoutCheckout: Number(row.active_stale_without_checkout ?? 0),
    };
  }

  private resolveMetricsRange(query: VisitaMetricsQueryDto): VisitaMetricsRange {
    const now = new Date();
    const defaultTo = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );
    const defaultFrom = new Date(defaultTo);
    defaultFrom.setDate(defaultFrom.getDate() - 6);
    defaultFrom.setHours(0, 0, 0, 0);

    const entradaTo = query.entradaTo ? new Date(query.entradaTo) : defaultTo;
    const entradaFrom = query.entradaFrom ? new Date(query.entradaFrom) : defaultFrom;

    if (Number.isNaN(entradaFrom.getTime()) || Number.isNaN(entradaTo.getTime())) {
      throw new BusinessException({
        message: "Las fechas del rango de métricas no son válidas",
        code: API_ERROR_CODE.VALIDATION,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    if (entradaFrom.getTime() > entradaTo.getTime()) {
      throw new BusinessException({
        message: "La fecha desde no puede ser posterior a la fecha hasta",
        code: API_ERROR_CODE.VALIDATION,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    const lastDayStart = new Date(entradaTo);
    lastDayStart.setHours(0, 0, 0, 0);

    return { entradaFrom, entradaTo, lastDayStart };
  }

  /**
   * Lista visitas paginadas aplicando búsqueda y filtros.
   * @param query - Parámetros de paginación, búsqueda y orden.
   * @returns Resultado paginado con DTOs de respuesta.
   */
  async list(user: AuthenticatedUser, query: ListVisitasQueryDto): Promise<PaginatedResult<VisitaResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_VISITAS_PAGE_LIMIT;
    const result = await this.repo.findAll({
      page,
      limit,
      search: query.search,
      visitante: query.visitante,
      documento: query.documento,
      empresa: query.empresa,
      sede: query.sede,
      motivo: query.motivo,
      responsable: query.responsable,
      creador: query.creador,
      estado: query.estado,
      estadoAprobacion: query.estadoAprobacion,
      personaId: query.personaId,
      entradaFrom: query.entradaFrom,
      entradaTo: query.entradaTo,
      includeProgramadasSinEntrada: query.includeProgramadasSinEntrada,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      sedeIds: await this.resolveSedeScope(user),
    });

    return {
      items: result.items.map(mapVisitaRowToResponse),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  /** Lista sedes activas autorizadas para el selector de creación. */
  async listSedeCandidates(user: AuthenticatedUser, search?: string) {
    return this.repo.findSedeCandidates(await this.resolveSedeScope(user), search);
  }

  /** Lista tarjetas autorizadas y su disponibilidad para el selector de visitas. */
  async listTarjetaCandidates(
    user: AuthenticatedUser,
    query: ListTarjetaCandidatesQueryDto,
  ): Promise<TarjetaCandidateListResponseDto> {
    const sedeIds = await this.resolveSedeScope(user) ?? await this.repo.findAllActiveSedeIds();
    let excludeVisitaId: number | undefined;
    let excludedCard: { sedeId: number; numero: string } | null = null;
    if (query.excludeVisitaId !== undefined) {
      const visita = await this.repo.findById(query.excludeVisitaId, sedeIds);
      if (visita) {
        excludeVisitaId = query.excludeVisitaId;
        if (requiresTarjetaDisponibilidad(visita.estado as VisitaEstado) && visita.credencial_numero?.trim()) {
          excludedCard = {
            sedeId: Number(visita.sede_id),
            numero: visita.credencial_numero.trim(),
          };
        }
      }
    }

    const rows = await this.repo.findTarjetaCandidates({
      sedeIds,
      search: query.search,
      numero: query.numero,
      excludeVisitaId,
      limit: Math.min(query.limit ?? 50, 50),
    });
    return {
      items: rows.map((row) => {
        const rawAreas: Array<{ id: number | string; nombre: string }> =
          typeof row.areas === "string" ? JSON.parse(row.areas) : row.areas;
        const isExcludedVisitCard = excludedCard !== null
          && Number(row.sede_id) === excludedCard.sedeId
          && String(row.numero) === excludedCard.numero;
        const enUso = row.ocupada_por_visita || (row.en_uso && !isExcludedVisitCard);
        let blockedReason: TarjetaCandidateBlockReason | null = null;
        if (!row.activo) blockedReason = "inactive";
        else if (query.visitaSedeId !== undefined && Number(row.sede_id) !== query.visitaSedeId) {
          blockedReason = "different_sede";
        } else if (enUso) blockedReason = "in_use";

        return {
          id: Number(row.id),
          numero: Number(row.numero),
          sedeId: Number(row.sede_id),
          sedeNombre: row.sede_nombre,
          color: row.color.toUpperCase(),
          icono: row.icono,
          areas: rawAreas.map((area) => ({ id: Number(area.id), nombre: area.nombre })),
          activo: row.activo,
          enUso,
          selectable: blockedReason === null,
          blockedReason,
        };
      }),
    };
  }

  /** Comprueba disponibilidad con una consulta SQL independiente del selector. */
  async checkTarjetasDisponibles(
    user: AuthenticatedUser,
    visitaSedeId?: number,
  ): Promise<{ available: boolean }> {
    const sedeIds = await this.resolveSedeScope(user) ?? await this.repo.findAllActiveSedeIds();
    const candidateSedeIds = visitaSedeId === undefined
      ? sedeIds
      : sedeIds.filter((sedeId) => sedeId === visitaSedeId);
    if (candidateSedeIds.length === 0) return { available: false };
    return { available: await this.repo.hasTarjetaDisponible(candidateSedeIds) };
  }

  /**
   * Obtiene una visita por su identificador.
   * @param id - ID numérico de la visita.
   * @returns DTO de la visita encontrada.
   */
  async findById(user: AuthenticatedUser, id: number): Promise<VisitaResponseDto> {
    const visita = await this.repo.findById(id, await this.resolveSedeScope(user));
    if (!visita) {
      throw new BusinessException({
        message: `Visita ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return mapVisitaRowToResponse(visita);
  }

  /**
   * Procesa y guarda la foto de una visita existente.
   * @param id - ID de la visita.
   * @param file - Archivo recibido por Multer en memoria.
   * @returns DTO de la visita actualizada.
   */
  async setPhoto(
    user: AuthenticatedUser,
    id: number,
    file: Pick<Express.Multer.File, "buffer" | "mimetype" | "originalname" | "size">,
  ): Promise<VisitaResponseDto> {
    await this.findById(user, id);

    validatePersonaPhotoUpload({
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    if (!file.buffer?.length) {
      throw new BusinessException({
        message: "No file received under field 'file'",
        code: API_ERROR_CODE.VALIDATION,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    const processed = await processPersonaPhoto(file.buffer);
    const updated = await this.repo.updatePhoto(id, processed.buffer, processed.mimeType);
    if (!updated) {
      throw new BusinessException({
        message: `Visita ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return mapVisitaRowToResponse(updated);
  }

  /**
   * Resuelve la foto almacenada de una visita para descarga binaria.
   * @param id - ID de la visita.
   * @returns Buffer, MIME type y tamaño en bytes.
   */
  async getPhoto(user: AuthenticatedUser, id: number): Promise<{ buffer: Buffer; mimeType: string; size: number }> {
    await this.findById(user, id);
    const photo = await this.repo.findPhotoById(id);
    if (!photo) {
      throw new BusinessException({
        message: `Visita ${id} does not have a photo`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return {
      buffer: photo.foto,
      mimeType: photo.foto_mime_type || "image/jpeg",
      size: photo.foto.length,
    };
  }

  /**
   * Crea una visita nueva.
   * @param dto - Datos de creación validados por el DTO.
   * @returns DTO de la visita creada.
   */
  async create(actorUser: AuthenticatedUser, dto: CreateVisitaDto): Promise<CreateVisitaResponseDto> {
    if (dto.personaId == null || dto.personaId < 1) {
      throw new BusinessException({
        message: "La persona es obligatoria para crear una visita",
        code: API_ERROR_CODE.VALIDATION,
        status: HttpStatus.BAD_REQUEST,
      });
    }
    if (dto.motivoVisitaId == null || dto.motivoVisitaId < 1) {
      throw new BusinessException({
        message: "El motivo es obligatorio para crear una visita",
        code: API_ERROR_CODE.VALIDATION,
        status: HttpStatus.BAD_REQUEST,
      });
    }
    if (dto.responsableId == null || dto.responsableId < 1) {
      throw new BusinessException({
        message: "El responsable es obligatorio para crear una visita",
        code: API_ERROR_CODE.VALIDATION,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    const persona = await this.personasRepo.findById(dto.personaId);
    if (!persona) {
      throw new BusinessException({
        message: `Persona ${dto.personaId} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    if (!persona.activo) {
      throw new BusinessException({
        message: `La persona ${dto.personaId} está inactiva`,
        code: API_ERROR_CODE.CONFLICT,
        status: HttpStatus.CONFLICT,
      });
    }

    await this.assertPersonaConProveedorValido(persona);
    const responsable = await this.assertResponsableActivo(dto.responsableId);
    const sedeId = await this.resolveCreateSedeId(actorUser, dto.sedeId);
    if (Number(persona.sede_id) !== sedeId) {
      throw new BusinessException({ message: "La persona no pertenece a la sede de la visita", code: API_ERROR_CODE.FORBIDDEN, status: HttpStatus.FORBIDDEN });
    }

    this.rejectManualSinSalidaEstado(dto.estado);

    const zonasPermitidas = resolveZonasFromTarjetaColor(dto.tarjetaColor);
    if (dto.zonasPermitidas !== undefined) {
      this.rejectInconsistentZonas(dto.tarjetaColor, dto.zonasPermitidas);
    }

    if (responsable.userTitle === "encargado_visita" && !(await this.repo.isEncargadoVisitaAssignedToSede(responsable.id, sedeId))) {
      throw new BusinessException({
        message: "El encargado de visita no está asignado a la sede seleccionada",
        code: API_ERROR_CODE.FORBIDDEN,
        status: HttpStatus.FORBIDDEN,
      });
    }
    // Las sedes sin aprobación manual dejan la visita lista para portería al instante:
    // mismo resultado que una aprobación desde /aprobacion-visitas.
    const requiereAprobacion = await this.repo.findSedeRequiereAprobacion(sedeId);
    const estado: VisitaEstado = requiereAprobacion ? "programada" : "activa";
    const credencialNumero = dto.credencialNumero?.trim() || null;
    if (!credencialNumero) {
      throw new BusinessException({
        message: "El número de tarjeta es obligatorio para crear una visita",
        code: API_ERROR_CODE.VALIDATION,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    if (requiresTarjetaDisponibilidad(estado) && credencialNumero) {
      await this.assertTarjetaDisponible(sedeId, credencialNumero);
    }

    if (isVisitaAbierta(estado)) {
      const referenceDate = dto.entradaAt ? new Date(dto.entradaAt) : new Date();
      await this.assertPersonaSinVisitaActiva(dto.personaId, referenceDate);
    }

    const motivoVisita = await this.motivosVisitaService.assertActiveMotivoVisita(dto.motivoVisitaId);
    if (motivoVisita.sedeId !== sedeId) {
      throw new BusinessException({ message: "El motivo no pertenece a la sede de la visita", code: API_ERROR_CODE.FORBIDDEN, status: HttpStatus.FORBIDDEN });
    }

    const input: CreateVisitaInput = {
      personaId: dto.personaId,
      sedeId,
      usuarioCreadorId: actorUser.id,
      motivoVisitaId: dto.motivoVisitaId,
      motivo: motivoVisita.nombre,
      responsableUsuarioId: responsable.id,
      estado,
      estadoAprobacion: requiereAprobacion ? "pendiente" : "aprobada",
      motivoRechazo: null,
      estadoSeguimiento: dto.estadoSeguimiento ?? null,
      zonasPermitidas,
      credencialNumero,
      tarjetaColor: dto.tarjetaColor,
      entradaAt: dto.entradaAt ? new Date(dto.entradaAt) : new Date(),
      salidaAt: dto.salidaAt ? new Date(dto.salidaAt) : null,
      observaciones: dto.observaciones?.trim() || null,
    };

    const created = await this.repo.create(input);
    if (requiresTarjetaDisponibilidad(estado)) {
      await this.repo.setTarjetaEnUso(sedeId, credencialNumero, true);
    }
    await this.personasRepo.updateUltimosVisita(dto.personaId, {
      ultimoMotivo: dto.motivoVisitaId,
      ultimoResponsable: dto.responsableId,
    });
    await this.logAuditEvent({
      visitaId: Number(created.id),
      actorUserId: actorUser.id,
      action: "visita.created",
      before: null,
      after: created,
    });
    const visit = mapVisitaRowToResponse(created);
    this.scheduleResponsableAssignmentNotification(responsable, visit, input.entradaAt ?? null, actorUser.id, requiereAprobacion);
    return {
      ...visit,
      notificacionCorreo: { requerida: true, programada: true, enviada: false, advertencia: null },
    };
  }

  /**
   * Programa el correo de asignación fuera del camino crítico de la respuesta HTTP.
   * El envío sigue siendo best-effort y cualquier fallo queda registrado en el log.
   */
  private scheduleResponsableAssignmentNotification(
    responsable: DomainUser,
    visit: VisitaResponseDto,
    entradaAt: Date | null,
    notifyUserId: number,
    requiereAprobacion: boolean,
  ): void {
    setImmediate(() => {
      void this.notifyResponsableAssignment(responsable, visit, entradaAt, requiereAprobacion).then((sent) => {
        if (!sent) this.notifications.publishCorreoFallido(notifyUserId, visit.id);
      });
    });
  }

  /**
   * Notifica por correo al responsable que fue asignado a una visita (al crearla o al reasignarla).
   * Best-effort: nunca lanza; si el responsable no tiene correo o el envío falla, registra un `warn`.
   * @param responsable - Usuario asignado como responsable.
   * @param visit - Visita ya persistida (DTO de respuesta).
   * @param entradaAt - Fecha/hora de entrada para el cuerpo del correo.
   * @param requiereAprobacion - Si es `false` el correo omite el enlace de revisión: no hay nada que aprobar.
   * @returns `true` si el correo se envió.
   */
  private async notifyResponsableAssignment(
    responsable: DomainUser,
    visit: VisitaResponseDto,
    entradaAt: Date | null,
    requiereAprobacion: boolean,
  ): Promise<boolean> {
    if (!responsable.email?.trim()) {
      this.logger.warn(`No se notificó por correo la visita ${visit.id}: responsable sin correo`);
      return false;
    }
    const baseUrl = this.config.get("frontend.baseUrl", { infer: true }).replace(/\/+$/, "");
    const approvalUrl = requiereAprobacion ? `${baseUrl}/aprobacion-visitas` : undefined;
    const fechaHora = new Intl.DateTimeFormat("es-PY", {
      dateStyle: "long", timeStyle: "short", timeZone: "America/Asuncion",
    }).format(entradaAt ?? new Date());
    const template = {
      responsableNombre: responsable.fullName,
      visitante: visit.visitante,
      documento: visit.documento,
      sede: visit.sedeNombre,
      motivo: visit.motivo,
      fechaHora,
      creador: visit.usuarioCreadorNombre,
      approvalUrl,
    };
    try {
      const result = await this.mail.send({
        subject: buildVisitaAssignmentSubject(),
        recipients: [{ name: responsable.fullName, email: responsable.email.trim() }],
        html: buildVisitaAssignmentHtml(template),
        text: buildVisitaAssignmentText(template),
      });
      if (!result.sent) this.logger.warn(`No se notificó por correo la visita ${visit.id}: ${result.error ?? "SMTP deshabilitado"}`);
      return result.sent;
    } catch (error) {
      this.logger.warn(`Error al notificar por correo la visita ${visit.id}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Actualiza parcialmente una visita existente.
   * @param id - ID de la visita a modificar.
   * @param dto - Campos a actualizar.
   * @returns DTO de la visita actualizada.
   */
  async update(actorUser: AuthenticatedUser, id: number, dto: UpdateVisitaDto): Promise<VisitaResponseDto> {
    const current = await this.repo.findById(id, await this.resolveSedeScope(actorUser));
    if (!current) {
      throw new BusinessException({
        message: `Visita ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    if (dto.personaId !== undefined) {
      const persona = await this.personasRepo.findById(dto.personaId);
      if (!persona) {
        throw new BusinessException({
          message: `Persona ${dto.personaId} not found`,
          code: API_ERROR_CODE.NOT_FOUND,
          status: HttpStatus.NOT_FOUND,
        });
      }
      if (!persona.activo) {
        throw new BusinessException({
          message: `La persona ${dto.personaId} está inactiva`,
          code: API_ERROR_CODE.CONFLICT,
          status: HttpStatus.CONFLICT,
        });
      }
      await this.assertPersonaConProveedorValido(persona);
    }

    this.rejectManualSinSalidaEstado(dto.estado);

    const input: UpdateVisitaInput = {};
    const nextTarjetaColor = this.resolveCurrentTarjetaColor(current.tarjeta_color, dto.tarjetaColor);
    let nextEstado = (dto.estado ?? current.estado) as VisitaEstado;
    const requestedResponsable = dto.responsableId !== undefined
      ? await this.assertResponsableActivo(dto.responsableId)
      : null;
    if (dto.estado === "activa" && current.estado !== "activa" && current.estado_aprobacion !== "aprobada" && (requestedResponsable === null || requestedResponsable.userTitle === "encargado_visita")) {
      throw new BusinessException({
        message: "La visita debe estar aprobada antes de registrar el ingreso",
        code: API_ERROR_CODE.CONFLICT,
        status: HttpStatus.CONFLICT,
      });
    }
    const isClosingVisit = dto.estado === "finalizada" && current.estado !== "finalizada";
    const nextPersonaId = dto.personaId ?? Number(current.persona_id);
    const nextSedeId = dto.sedeId !== undefined
      ? await this.resolveCreateSedeId(actorUser, dto.sedeId)
      : Number(current.sede_id);
    if (dto.sedeId !== undefined) {
      const currentResponsable = await this.usersService.findById(Number(current.responsable_usuario_id));
      if (currentResponsable?.userTitle === "encargado_visita" && !(await this.repo.isEncargadoVisitaAssignedToSede(currentResponsable.id, nextSedeId))) {
        throw new BusinessException({ message: "El encargado de visita no está asignado a la sede seleccionada", code: API_ERROR_CODE.FORBIDDEN, status: HttpStatus.FORBIDDEN });
      }
    }
    // Reasignar al responsable reabre la aprobación. La sede decide si la visita vuelve a la
    // cola o se aprueba sola; se resuelve antes de validar la tarjeta porque determina nextEstado.
    const responsableReasignado = dto.responsableId !== undefined;
    const sedeRequiereAprobacion = responsableReasignado
      ? await this.repo.findSedeRequiereAprobacion(nextSedeId)
      : true;
    if (responsableReasignado) {
      nextEstado = sedeRequiereAprobacion ? "programada" : "activa";
    }

    const nextCredencialNumero =
      dto.credencialNumero !== undefined
        ? dto.credencialNumero?.trim() || null
        : current.credencial_numero?.trim() || null;

    if (requiresTarjetaDisponibilidad(nextEstado) && nextCredencialNumero) {
      const keepsCurrentOccupiedCard =
        requiresTarjetaDisponibilidad(current.estado as VisitaEstado)
        && Number(current.sede_id) === nextSedeId
        && current.credencial_numero?.trim() === nextCredencialNumero;
      await this.assertTarjetaDisponible(
        nextSedeId,
        nextCredencialNumero,
        id,
        keepsCurrentOccupiedCard,
      );
    }

    if (isVisitaAbierta(nextEstado)) {
      const referenceDate = dto.entradaAt
        ? new Date(dto.entradaAt)
        : current.entrada_at
          ? new Date(current.entrada_at)
          : new Date();
      await this.assertPersonaSinVisitaActiva(nextPersonaId, referenceDate, id);
    }

    if (dto.personaId !== undefined) input.personaId = dto.personaId;
    if (dto.motivoVisitaId !== undefined) {
      const motivoVisita = await this.motivosVisitaService.assertActiveMotivoVisita(dto.motivoVisitaId);
      input.motivoVisitaId = dto.motivoVisitaId;
      input.motivo = motivoVisita.nombre;
    }
    if (dto.responsableId !== undefined) {
      const responsable = requestedResponsable!;
      if (responsable.userTitle === "encargado_visita") {
        if (!(await this.repo.isEncargadoVisitaAssignedToSede(responsable.id, nextSedeId))) {
          throw new BusinessException({ message: "El encargado de visita no está asignado a la sede seleccionada", code: API_ERROR_CODE.FORBIDDEN, status: HttpStatus.FORBIDDEN });
        }
      }
      input.estadoAprobacion = sedeRequiereAprobacion ? "pendiente" : "aprobada";
      input.motivoRechazo = null;
      input.estado = nextEstado;
      input.responsableUsuarioId = responsable.id;
    }
    if (dto.sedeId !== undefined) {
      input.sedeId = nextSedeId;
    }
    if (dto.estado !== undefined && dto.responsableId === undefined) {
      input.estado = dto.estado;
      if (dto.estado === "cancelada") {
        input.estadoAprobacion = "cancelada";
        input.motivoRechazo = null;
      }
    }
    if (dto.estadoSeguimiento !== undefined) {
      input.estadoSeguimiento = dto.estadoSeguimiento;
    } else if (isClosingVisit) {
      input.estadoSeguimiento = null;
    }
    if (dto.credencialNumero !== undefined) input.credencialNumero = dto.credencialNumero?.trim() || null;
    if (dto.entradaAt !== undefined) input.entradaAt = dto.entradaAt ? new Date(dto.entradaAt) : null;
    if (isClosingVisit) {
      input.salidaAt = new Date();
    } else if (dto.salidaAt !== undefined) {
      input.salidaAt = dto.salidaAt ? new Date(dto.salidaAt) : null;
    }
    if (dto.observaciones !== undefined) input.observaciones = dto.observaciones?.trim() || null;

    if (dto.tarjetaColor !== undefined) {
      input.tarjetaColor = dto.tarjetaColor;
    }

    if (dto.zonasPermitidas !== undefined || dto.tarjetaColor !== undefined) {
      if (!nextTarjetaColor) {
        throw new BusinessException({
          message: "Debe seleccionar un color de tarjeta válido para definir las zonas permitidas",
          code: API_ERROR_CODE.VALIDATION,
          status: HttpStatus.BAD_REQUEST,
        });
      }

      if (dto.zonasPermitidas !== undefined) {
        this.rejectInconsistentZonas(nextTarjetaColor, dto.zonasPermitidas);
      }

      input.zonasPermitidas = resolveZonasFromTarjetaColor(nextTarjetaColor);
    }

    const updated = await this.repo.update(id, input);
    if (!updated) {
      throw new BusinessException({
        message: `Visita ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    await this.syncTarjetaEnUso({
      previousSedeId: Number(current.sede_id),
      previousCredencial: requiresTarjetaDisponibilidad(current.estado as VisitaEstado)
        ? current.credencial_numero?.trim() || null
        : null,
      nextSedeId,
      nextCredencial: requiresTarjetaDisponibilidad(nextEstado) ? nextCredencialNumero : null,
    });

    if (input.responsableUsuarioId !== undefined && requestedResponsable) {
      this.scheduleResponsableAssignmentNotification(
        requestedResponsable,
        mapVisitaRowToResponse(updated),
        input.entradaAt ?? (updated.entrada_at ? new Date(updated.entrada_at) : null),
        actorUser.id,
        sedeRequiereAprobacion,
      );
    }

    const action = resolveVisitaAuditAction(current, updated, "visita.updated");
    const beforeSnapshot = this.toAuditSnapshot(current);
    const afterSnapshot = this.toAuditSnapshot(updated);
    const changedFields = diffVisitaAuditFields(beforeSnapshot, afterSnapshot);
    if (changedFields.length > 0) {
      await this.logAuditEvent({
        visitaId: id,
        actorUserId: actorUser.id,
        action,
        before: current,
        after: updated,
      });
    }

    return mapVisitaRowToResponse(updated);
  }

  /**
   * Busca usuarios activos locales para el selector de responsable al crear visitas.
   * Restringe los candidatos a la empresa y sede del usuario autenticado, cubriendo
   * tanto la relación de empresa receptora como la de empresa de portería.
   * @param actorUser - Usuario autenticado (alcance de sedes derivado del rol).
   * @param query - Texto de búsqueda, ID puntual o límite de resultados.
   * @returns Candidatos responsables ordenados por nombre.
   */
  async searchResponsableCandidates(
    actorUser: AuthenticatedUser,
    query: ListResponsableCandidatesQueryDto,
  ): Promise<ResponsableCandidateListResponseDto> {
    if (query.id != null) {
      const user = await this.usersService.findById(query.id);
      const contexts = user?.isActive
        ? await this.repo.findResponsableContexts([user.id])
        : new Map();
      const items = user?.isActive && user.userTitle !== "portero"
        ? [VisitasService.toResponsableCandidate(user, contexts.get(user.id))]
        : [];
      return { items, total: items.length };
    }

    const limit = query.limit ?? DEFAULT_RESPONSABLE_CANDIDATES_LIMIT;
    const search = query.search?.trim();
    const sedeIds = await this.resolveSedeScope(actorUser);
    let candidates = (await this.repo.findResponsableCandidates(sedeIds)).map((candidate) => ({
      id: candidate.id,
      fullName: candidate.fullName,
      subtitle: [candidate.companyName, candidate.sedeName].filter(Boolean).join(" — "),
      requiereAprobacion: true,
    }));

    if (search) {
      const normalizedSearch = search.toLocaleLowerCase("es");
      candidates = candidates.filter((candidate) =>
        `${candidate.fullName} ${candidate.subtitle}`
          .toLocaleLowerCase("es")
          .includes(normalizedSearch),
      );
    }

    const items = candidates.slice(0, limit);

    return {
      items,
      total: items.length,
    };
  }

  /**
   * Elimina una visita: cancela las abiertas (activa/sin_salida) o borra permanentemente el resto.
   * @param id - ID de la visita.
   * @returns Confirmación de cancelación o eliminación definitiva.
   */
  async deletePermanent(
    actorUser: AuthenticatedUser,
    id: number,
  ): Promise<{ id: number; deleted: true } | { id: number; cancelled: true }> {
    const visita = await this.repo.findById(id, await this.resolveSedeScope(actorUser));
    if (!visita) {
      throw new BusinessException({
        message: `Visita ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    const updated = await this.repo.update(id, {
      estado: "cancelada",
      estadoAprobacion: "cancelada",
      motivoRechazo: null,
      estadoSeguimiento: null,
    });
    if (!updated) {
      throw new BusinessException({
        message: `Visita ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    if (requiresTarjetaDisponibilidad(visita.estado as VisitaEstado)) {
      await this.repo.setTarjetaEnUso(Number(visita.sede_id), visita.credencial_numero, false);
    }

    await this.logAuditEvent({
      visitaId: id,
      actorUserId: actorUser.id,
      action: "visita.deleted",
      before: visita,
      after: updated,
    });
    return { id, cancelled: true };
  }

  /**
   * Sincroniza el flag `en_uso` de las tarjetas al cambiar la ocupación de una visita:
   * libera la tarjeta previa y ocupa la nueva. Si la tarjeta no cambia y sigue ocupada,
   * no realiza escrituras. Solo debe recibir credenciales de estados que reservan tarjeta.
   */
  private async syncTarjetaEnUso(input: {
    previousSedeId: number;
    previousCredencial: string | null;
    nextSedeId: number;
    nextCredencial: string | null;
  }): Promise<void> {
    const sameCard =
      input.previousCredencial !== null &&
      input.nextCredencial !== null &&
      input.previousSedeId === input.nextSedeId &&
      input.previousCredencial === input.nextCredencial;
    if (sameCard) return;

    if (input.previousCredencial !== null) {
      await this.repo.setTarjetaEnUso(input.previousSedeId, input.previousCredencial, false);
    }
    if (input.nextCredencial !== null) {
      await this.repo.setTarjetaEnUso(input.nextSedeId, input.nextCredencial, true);
    }
  }

  private static toResponsableCandidate(
    user: DomainUser,
    context?: { companyName: string; sedeName: string },
  ) {
    const subtitle = [context?.companyName, context?.sedeName].filter(Boolean).join(" — ");
    return {
      id: user.id,
      fullName: user.fullName,
      subtitle,
      requiereAprobacion: user.userTitle !== "portero",
    };
  }

  private async assertResponsableActivo(responsableId: number): Promise<DomainUser> {
    const user = await this.usersService.findById(responsableId);
    if (!user?.isActive) {
      throw new BusinessException({
        message: "El responsable debe ser un usuario activo",
        code: API_ERROR_CODE.VALIDATION,
        status: HttpStatus.BAD_REQUEST,
      });
    }
    if (user.userTitle === "portero") {
      throw new BusinessException({
        message: "Un portero no puede ser responsable de una visita",
        code: API_ERROR_CODE.VALIDATION,
        status: HttpStatus.BAD_REQUEST,
      });
    }
    return user;
  }
}
