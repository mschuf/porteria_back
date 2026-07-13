import { HttpStatus, Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/exceptions/business.exception";
import { API_ERROR_CODE } from "../../common/types/api-error-code";
import { CreateAreaDto } from "./dto/create-area.dto";
import { DEFAULT_AREAS_PAGE_LIMIT, ListAreasQueryDto } from "./dto/list-areas-query.dto";
import { UpdateAreaDto } from "./dto/update-area.dto";
import type { AreaResponseDto } from "./dto/area.response.dto";
import type { AreaRow } from "./areas.types";
import { AreasSqlRepository } from "./repositories/areas.sql-repository";

const mapArea = (row: AreaRow): AreaResponseDto => ({ id: Number(row.id), sedeId: Number(row.sede_id), sedeNombre: row.sede_nombre, empresaNombre: row.empresa_nombre, nombre: row.nombre, activo: row.activo, createdAt: new Date(row.creado_en).toISOString(), updatedAt: new Date(row.actualizado_en).toISOString() });

@Injectable()
export class AreasService {
  constructor(private readonly repo: AreasSqlRepository) {}

  async list(query: ListAreasQueryDto) {
    const result = await this.repo.findAll({ page: query.page ?? 1, limit: query.limit ?? DEFAULT_AREAS_PAGE_LIMIT, search: query.search, nombre: query.nombre, sedeId: query.sedeId, activo: query.activo, sortBy: query.sortBy, sortOrder: query.sortOrder });
    return { ...result, items: result.items.map(mapArea) };
  }

  async findById(id: number) { return mapArea(await this.required(id)); }

  async create(dto: CreateAreaDto) {
    const nombre = dto.nombre.trim();
    if (!await this.repo.activeSedeExists(dto.sedeId)) this.conflict("La sede seleccionada no existe o está inactiva");
    if (await this.repo.findByNombre(dto.sedeId, nombre)) this.conflict("Ya existe un área con ese nombre en la sede");
    return mapArea(await this.repo.create(dto.sedeId, nombre, dto.activo ?? true));
  }

  async update(id: number, dto: UpdateAreaDto) {
    const current = await this.required(id);
    if (dto.nombre !== undefined) {
      const found = await this.repo.findByNombre(Number(current.sede_id), dto.nombre.trim());
      if (found && Number(found.id) !== id) this.conflict("Ya existe un área con ese nombre en la sede");
    }
    if (dto.activo === false && current.activo && await this.repo.countAssignments(id) > 0) this.conflict("No se puede desactivar un área asignada a tarjetas");
    return mapArea((await this.repo.update(id, { nombre: dto.nombre?.trim(), activo: dto.activo }))!);
  }

  activate(id: number) { return this.update(id, { activo: true }); }
  deactivate(id: number) { return this.update(id, { activo: false }); }

  async delete(id: number) {
    await this.required(id);
    if (await this.repo.countAssignments(id) > 0) this.conflict("No se puede eliminar un área asignada a tarjetas");
    await this.repo.delete(id);
    return { id, deleted: true as const };
  }

  private async required(id: number) {
    const row = await this.repo.findById(id);
    if (!row) throw new BusinessException({ message: `Área ${id} no encontrada`, code: API_ERROR_CODE.NOT_FOUND, status: HttpStatus.NOT_FOUND });
    return row;
  }
  private conflict(message: string): never { throw new BusinessException({ message, code: API_ERROR_CODE.CONFLICT, status: HttpStatus.CONFLICT }); }
}
