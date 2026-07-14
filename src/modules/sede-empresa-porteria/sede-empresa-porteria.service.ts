/**
 * @file sede-empresa-porteria.service.ts
 * @description Orquesta el CRUD de asignaciones sede-empresa de seguridad contra Postgres y aplica reglas de negocio.
 */
import { HttpStatus, Injectable } from "@nestjs/common";
import type { PaginatedResult } from "../../common/dto/pagination.dto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { API_ERROR_CODE } from "../../common/types/api-error-code";
import type {
  CreateSedeEmpresaPorteriaInput,
  UpdateSedeEmpresaPorteriaInput,
} from "./sede-empresa-porteria.types";
import type { SedeEmpresaPorteriaResponseDto } from "./dto/sede-empresa-porteria.response.dto";
import { CreateSedeEmpresaPorteriaDto } from "./dto/create-sede-empresa-porteria.dto";
import {
  DEFAULT_SEDE_EMPRESA_PORTERIA_PAGE_LIMIT,
  type ListSedeEmpresaPorteriaQueryDto,
} from "./dto/list-sede-empresa-porteria-query.dto";
import { UpdateSedeEmpresaPorteriaDto } from "./dto/update-sede-empresa-porteria.dto";
import { mapSedeEmpresaPorteriaRowToResponse } from "./mappers/sede-empresa-porteria.mapper";
import { SedeEmpresaPorteriaSqlRepository } from "./repositories/sede-empresa-porteria.sql-repository";

/** Servicio de gestion de asignaciones sede-empresa de seguridad con persistencia en Postgres. */
@Injectable()
export class SedeEmpresaPorteriaService {
  /** Inyecta el repositorio de asignaciones sede-empresa de seguridad. */
  constructor(private readonly repo: SedeEmpresaPorteriaSqlRepository) {}

  /** Lista asignaciones sede-empresa de seguridad paginadas aplicando busqueda y filtros. */
  async list(
    query: ListSedeEmpresaPorteriaQueryDto,
  ): Promise<PaginatedResult<SedeEmpresaPorteriaResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_SEDE_EMPRESA_PORTERIA_PAGE_LIMIT;
    const result = await this.repo.findAll({
      page,
      limit,
      search: query.search,
      sedeId: query.sedeId,
      empresaPorteriaId: query.empresaPorteriaId,
      activo: query.activo,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return {
      items: result.items.map(mapSedeEmpresaPorteriaRowToResponse),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  /** Obtiene una asignacion sede-empresa de seguridad por su identificador. */
  async findById(id: number): Promise<SedeEmpresaPorteriaResponseDto> {
    const asignacion = await this.repo.findById(id);
    if (!asignacion) {
      throw new BusinessException({
        message: `Asignacion sede-empresa de seguridad ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return mapSedeEmpresaPorteriaRowToResponse(asignacion);
  }

  /** Crea una asignacion sede-empresa de seguridad nueva. */
  async create(dto: CreateSedeEmpresaPorteriaDto): Promise<SedeEmpresaPorteriaResponseDto> {
    await this.ensureSedeExists(dto.sedeId);
    await this.ensureEmpresaPorteriaExists(dto.empresaPorteriaId);

    const activo = dto.activo ?? true;
    const asignadoDesde = dto.asignadoDesde ? new Date(dto.asignadoDesde) : new Date();
    const asignadoHasta = dto.asignadoHasta ? new Date(dto.asignadoHasta) : null;
    this.assertDateOrder(asignadoDesde, asignadoHasta);

    if (activo) {
      await this.ensureNoActiveAssignment(dto.sedeId);
    }

    const input: CreateSedeEmpresaPorteriaInput = {
      sedeId: dto.sedeId,
      empresaPorteriaId: dto.empresaPorteriaId,
      activo,
      asignadoDesde,
      asignadoHasta,
    };

    const created = await this.repo.create(input);
    return mapSedeEmpresaPorteriaRowToResponse(created);
  }

  /** Actualiza parcialmente una asignacion sede-empresa de seguridad existente. */
  async update(id: number, dto: UpdateSedeEmpresaPorteriaDto): Promise<SedeEmpresaPorteriaResponseDto> {
    const current = await this.repo.findById(id);
    if (!current) {
      throw new BusinessException({
        message: `Asignacion sede-empresa de seguridad ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    if (dto.sedeId !== undefined) {
      await this.ensureSedeExists(dto.sedeId);
    }
    if (dto.empresaPorteriaId !== undefined) {
      await this.ensureEmpresaPorteriaExists(dto.empresaPorteriaId);
    }

    const resultingSedeId = dto.sedeId ?? Number(current.sede_id);
    const resultingActivo = dto.activo ?? current.activo;
    const resultingAsignadoDesde =
      dto.asignadoDesde !== undefined ? new Date(dto.asignadoDesde) : new Date(current.asignado_desde);
    const resultingAsignadoHasta =
      dto.asignadoHasta !== undefined
        ? dto.asignadoHasta === null
          ? null
          : new Date(dto.asignadoHasta)
        : current.asignado_hasta
          ? new Date(current.asignado_hasta)
          : null;

    this.assertDateOrder(resultingAsignadoDesde, resultingAsignadoHasta);

    if (resultingActivo) {
      await this.ensureNoActiveAssignment(resultingSedeId, id);
    }

    const input: UpdateSedeEmpresaPorteriaInput = {};
    if (dto.sedeId !== undefined) input.sedeId = dto.sedeId;
    if (dto.empresaPorteriaId !== undefined) input.empresaPorteriaId = dto.empresaPorteriaId;
    if (dto.activo !== undefined) input.activo = dto.activo;
    if (dto.asignadoDesde !== undefined) input.asignadoDesde = resultingAsignadoDesde;
    if (dto.asignadoHasta !== undefined) input.asignadoHasta = resultingAsignadoHasta;

    const updated = await this.repo.update(id, input);
    if (!updated) {
      throw new BusinessException({
        message: `Asignacion sede-empresa de seguridad ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return mapSedeEmpresaPorteriaRowToResponse(updated);
  }

  /** Desactiva una asignacion sede-empresa de seguridad. */
  async deactivate(id: number): Promise<SedeEmpresaPorteriaResponseDto> {
    await this.ensureExists(id);
    const updated = await this.repo.softDelete(id);
    if (!updated) {
      throw new BusinessException({
        message: `Asignacion sede-empresa de seguridad ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return mapSedeEmpresaPorteriaRowToResponse(updated);
  }

  /** Reactiva una asignacion sede-empresa de seguridad. */
  async activate(id: number): Promise<SedeEmpresaPorteriaResponseDto> {
    const current = await this.repo.findById(id);
    if (!current) {
      throw new BusinessException({
        message: `Asignacion sede-empresa de seguridad ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    await this.ensureNoActiveAssignment(Number(current.sede_id), id);

    const updated = await this.repo.activate(id);
    if (!updated) {
      throw new BusinessException({
        message: `Asignacion sede-empresa de seguridad ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return mapSedeEmpresaPorteriaRowToResponse(updated);
  }

  /** Elimina permanentemente una asignacion sede-empresa de seguridad. */
  async deletePermanent(id: number): Promise<{ id: number; deleted: true }> {
    await this.ensureExists(id);

    const deletedId = await this.repo.hardDelete(id);
    if (deletedId == null) {
      throw new BusinessException({
        message: `Asignacion sede-empresa de seguridad ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return { id: deletedId, deleted: true };
  }

  /** Verifica que una asignacion exista antes de operaciones de escritura. */
  private async ensureExists(id: number): Promise<void> {
    const asignacion = await this.repo.findById(id);
    if (!asignacion) {
      throw new BusinessException({
        message: `Asignacion sede-empresa de seguridad ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }
  }

  /** Verifica que la sede referenciada exista. */
  private async ensureSedeExists(sedeId: number): Promise<void> {
    const exists = await this.repo.sedeExists(sedeId);
    if (!exists) {
      throw new BusinessException({
        message: `Sede ${sedeId} not found`,
        code: API_ERROR_CODE.VALIDATION,
        status: HttpStatus.BAD_REQUEST,
      });
    }
  }

  /** Verifica que la empresa de seguridad referenciada exista. */
  private async ensureEmpresaPorteriaExists(empresaPorteriaId: number): Promise<void> {
    const exists = await this.repo.empresaPorteriaExists(empresaPorteriaId);
    if (!exists) {
      throw new BusinessException({
        message: `Empresa de seguridad ${empresaPorteriaId} not found`,
        code: API_ERROR_CODE.VALIDATION,
        status: HttpStatus.BAD_REQUEST,
      });
    }
  }

  /** Rechaza fechas de fin anteriores a la fecha de inicio. */
  private assertDateOrder(asignadoDesde: Date, asignadoHasta: Date | null): void {
    if (asignadoHasta !== null && asignadoHasta.getTime() < asignadoDesde.getTime()) {
      throw new BusinessException({
        message: "La fecha de fin debe ser posterior o igual a la fecha de inicio",
        code: API_ERROR_CODE.VALIDATION,
        status: HttpStatus.BAD_REQUEST,
      });
    }
  }

  /** Verifica que la sede no tenga ya otra asignacion activa (sin importar sus fechas). */
  private async ensureNoActiveAssignment(sedeId: number, excludeId?: number): Promise<void> {
    const existingId = await this.repo.findActiveBySede(sedeId, excludeId);
    if (existingId != null) {
      throw new BusinessException({
        message: `La sede ${sedeId} ya tiene una asignacion de empresa de seguridad activa`,
        code: API_ERROR_CODE.CONFLICT,
        status: HttpStatus.CONFLICT,
      });
    }
  }
}
