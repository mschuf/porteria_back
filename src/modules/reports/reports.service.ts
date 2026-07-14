/**
 * @file reports.service.ts
 * @description Orquesta reportes superadmin con persistencia en Postgres.
 */
import { Injectable } from "@nestjs/common";
import type { PaginatedResult } from "../../common/dto/pagination.dto";
import { UsersService } from "../users/users.service";
import {
  DEFAULT_VISITAS_REPORT_PAGE_LIMIT,
  MAX_VISITAS_REPORT_PAGE_LIMIT,
  type ListVisitasReportQueryDto,
} from "./dto/list-visitas-report-query.dto";
import {
  DEFAULT_PORTERIA_AUDIT_PAGE_LIMIT,
  type ListPorteriaAuditQueryDto,
} from "./dto/list-porteria-audit-query.dto";
import type { PorteriaAuditLogResponseDto } from "./dto/porteria-audit.response.dto";
import type { VisitaReportLogResponseDto } from "./dto/visita-report.response.dto";
import type { ExportVisitasReportQueryDto } from "./dto/export-visitas-report-query.dto";
import type { VisitaReportExportResult } from "./reports.types";
import { VisitasExportService } from "./visitas-export.service";
import { mapVisitaListRowToReportResponse } from "./mappers/visita-report.mapper";
import { VisitaAuditSqlRepository } from "../visitas/repositories/visita-audit.sql-repository";
import { VisitasSqlRepository } from "../visitas/repositories/visitas.sql-repository";
import type { VisitaAuditLogRow, VisitaListFilters } from "../visitas/visitas.types";
import type { AuthenticatedUser } from "../../common/types/authenticated-user";
import { SedeAccessService } from "../../common/sede-access/sede-access.service";

/**
 * Servicio de reportes restringidos a super administradores.
 */
@Injectable()
export class ReportsService {
  /**
   * Inyecta repositorios de visitas y servicios de exportación/usuarios.
   * @param users - Usuarios GLPI cacheados.
   */
  constructor(
    private readonly visitasExportService: VisitasExportService,
    private readonly visitasSqlRepo: VisitasSqlRepository,
    private readonly visitaAuditSqlRepo: VisitaAuditSqlRepository,
    private readonly users: UsersService,
    private readonly sedeAccess: SedeAccessService,
  ) {}

  /**
   * Lista visitas de portería con filtros y paginación.
   * @param query - Parámetros de consulta validados.
   * @returns Resultado paginado con DTOs del reporte.
   */
  async listVisitasReport(
    user: AuthenticatedUser,
    query: ListVisitasReportQueryDto,
  ): Promise<PaginatedResult<VisitaReportLogResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_VISITAS_REPORT_PAGE_LIMIT;
    const result = await this.visitasSqlRepo.findAll(
      await this.buildVisitaReportFilters(user, query, page, limit),
    );

    return {
      items: result.items.map(mapVisitaListRowToReportResponse),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  /**
   * Exporta visitas de portería a PDF o Excel.
   * @param query - Filtros y formato de exportación.
   * @returns Buffer, nombre de archivo y MIME type.
   */
  async exportVisitasReport(
    user: AuthenticatedUser,
    query: ExportVisitasReportQueryDto,
  ): Promise<VisitaReportExportResult> {
    const { items } = await this.visitasSqlRepo.findAll(
      await this.buildVisitaReportFilters(user, query, 1, MAX_VISITAS_REPORT_PAGE_LIMIT),
    );

    return this.visitasExportService.exportFromRows(items, query);
  }

  /**
   * Lista auditoría completa de portería con filtros, orden y paginación server-side.
   * @param query - Parámetros de consulta validados.
   * @returns Resultado paginado con eventos de auditoría.
   */
  async listPorteriaAuditLogs(
    user: AuthenticatedUser,
    query: ListPorteriaAuditQueryDto,
  ): Promise<{
    items: PorteriaAuditLogResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_PORTERIA_AUDIT_PAGE_LIMIT;
    const result = await this.visitaAuditSqlRepo.findAll({
      page,
      limit,
      q: query.q,
      action: query.action,
      actorUserId: query.actorUserId,
      visitaId: query.visitaId,
      visitante: query.visitante,
      documento: query.documento,
      occurredFrom: query.occurredFrom,
      occurredTo: query.occurredTo,
      estadoBefore: query.estadoBefore,
      estadoAfter: query.estadoAfter,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      sedeIds: await this.sedeAccess.resolveReportSedeIds(user),
    });

    const users = await this.users.listAll();
    const userNameById = new Map<number, string>(
      users.map((user) => [user.id, user.fullName || user.login]),
    );

    return {
      items: result.items.map((row) => this.mapAuditRow(row, userNameById)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: Math.max(1, Math.ceil(result.total / result.limit)),
    };
  }

  private mapAuditRow(
    row: VisitaAuditLogRow,
    userNameById: Map<number, string>,
  ): PorteriaAuditLogResponseDto {
    const actorUserId = Number(row.actor_user_id);
    return {
      id: Number(row.id),
      visitaId: Number(row.visita_id),
      action: row.action,
      actorUserId,
      actorName: actorUserId === 0 ? "Sistema" : (userNameById.get(actorUserId) ?? null),
      occurredAt: new Date(row.occurred_at).toISOString(),
      visitante: row.visitante ?? null,
      documento: row.documento ?? null,
      estadoBefore: row.estado_before ?? null,
      estadoAfter: row.estado_after ?? null,
      changedFields: Array.isArray(row.changed_fields) ? row.changed_fields : [],
      beforeState:
        row.before_state && typeof row.before_state === "object"
          ? (row.before_state as unknown as Record<string, unknown>)
          : null,
      afterState:
        row.after_state && typeof row.after_state === "object"
          ? (row.after_state as unknown as Record<string, unknown>)
          : null,
      metadata: row.metadata && typeof row.metadata === "object" ? row.metadata : {},
    };
  }

  /**
   * Mapea query del reporte de visitas a filtros del repositorio SQL.
   * @param query - Parámetros de consulta o exportación.
   * @param page - Página solicitada.
   * @param limit - Límite de registros.
   * @returns Filtros normalizados para Postgres.
   */
  private async buildVisitaReportFilters(
    user: AuthenticatedUser,
    query: ListVisitasReportQueryDto | ExportVisitasReportQueryDto,
    page: number,
    limit: number,
  ): Promise<VisitaListFilters> {
    const hasDateRange = Boolean(query.entradaFrom && query.entradaTo);

    return {
      page,
      limit,
      entradaFrom: query.entradaFrom,
      entradaTo: query.entradaTo,
      includeProgramadasSinEntrada: hasDateRange ? true : undefined,
      estado: query.estado,
      empresa: query.empresa,
      visitante: query.visitante,
      documento: query.documento,
      motivo: query.motivo,
      responsable: query.responsable,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      sedeIds: await this.sedeAccess.resolveReportSedeIds(user),
    };
  }
}
