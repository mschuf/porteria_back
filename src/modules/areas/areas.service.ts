import { HttpStatus, Injectable } from "@nestjs/common";
import { SedeAccessService } from "../../common/sede-access/sede-access.service";
import { BusinessException } from "../../common/exceptions/business.exception";
import { API_ERROR_CODE } from "../../common/types/api-error-code";
import type { AuthenticatedUser } from "../../common/types/authenticated-user";
import { CreateAreaDto } from "./dto/create-area.dto";
import { DEFAULT_AREAS_PAGE_LIMIT, ListAreasQueryDto } from "./dto/list-areas-query.dto";
import { UpdateAreaDto } from "./dto/update-area.dto";
import type { AreaResponseDto } from "./dto/area.response.dto";
import type { AreaRow } from "./areas.types";
import { AreasSqlRepository } from "./repositories/areas.sql-repository";

const mapArea = (row: AreaRow): AreaResponseDto => ({ id: Number(row.id), sedeId: Number(row.sede_id), sedeNombre: row.sede_nombre, empresaNombre: row.empresa_nombre, nombre: row.nombre, activo: row.activo, createdAt: new Date(row.creado_en).toISOString(), updatedAt: new Date(row.actualizado_en).toISOString() });

@Injectable()
export class AreasService {
  constructor(private readonly repo: AreasSqlRepository, private readonly access: SedeAccessService) {}
  async list(user: AuthenticatedUser, query: ListAreasQueryDto) { const result = await this.repo.findAll({ page: query.page ?? 1, limit: query.limit ?? DEFAULT_AREAS_PAGE_LIMIT, search: query.search, nombre: query.nombre, sedeId: query.sedeId, activo: query.activo, sortBy: query.sortBy, sortOrder: query.sortOrder, sedeIds: await this.access.resolveCardSedeIds(user) }); return { ...result, items: result.items.map(mapArea) }; }
  async findById(user: AuthenticatedUser, id: number) { return mapArea(await this.required(user, id)); }
  async create(user: AuthenticatedUser, dto: CreateAreaDto) { await this.access.assertSede(user, dto.sedeId); const nombre = dto.nombre.trim(); if (!await this.repo.activeSedeExists(dto.sedeId)) this.conflict("La sede seleccionada no existe o esta inactiva"); if (await this.repo.findByNombre(dto.sedeId, nombre)) this.conflict("Ya existe un area con ese nombre en la sede"); return mapArea(await this.repo.create(dto.sedeId, nombre, dto.activo ?? true)); }
  async update(user: AuthenticatedUser, id: number, dto: UpdateAreaDto) { const current = await this.required(user, id); if (dto.nombre !== undefined) { const found = await this.repo.findByNombre(Number(current.sede_id), dto.nombre.trim()); if (found && Number(found.id) !== id) this.conflict("Ya existe un area con ese nombre en la sede"); } if (dto.activo === false && current.activo && await this.repo.countAssignments(id) > 0) this.conflict("No se puede desactivar un area asignada a tarjetas"); return mapArea((await this.repo.update(id, { nombre: dto.nombre?.trim(), activo: dto.activo }))!); }
  activate(user: AuthenticatedUser, id: number) { return this.update(user, id, { activo: true }); }
  deactivate(user: AuthenticatedUser, id: number) { return this.update(user, id, { activo: false }); }
  async delete(user: AuthenticatedUser, id: number) { await this.required(user, id); if (await this.repo.countAssignments(id) > 0) this.conflict("No se puede eliminar un area asignada a tarjetas"); await this.repo.delete(id); return { id, deleted: true as const }; }
  private async required(user: AuthenticatedUser, id: number) { const row = await this.repo.findById(id); if (!row) throw new BusinessException({ message: `Area ${id} no encontrada`, code: API_ERROR_CODE.NOT_FOUND, status: HttpStatus.NOT_FOUND }); await this.access.assertCardSede(user, Number(row.sede_id)); return row; }
  private conflict(message: string): never { throw new BusinessException({ message, code: API_ERROR_CODE.CONFLICT, status: HttpStatus.CONFLICT }); }
}
