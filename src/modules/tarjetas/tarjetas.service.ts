import { HttpStatus, Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/exceptions/business.exception";
import { API_ERROR_CODE } from "../../common/types/api-error-code";
import { CreateTarjetaDto } from "./dto/create-tarjeta.dto";
import { DEFAULT_TARJETAS_PAGE_LIMIT, ListTarjetasQueryDto } from "./dto/list-tarjetas-query.dto";
import { UpdateTarjetaDto } from "./dto/update-tarjeta.dto";
import type { TarjetaResponseDto } from "./dto/tarjeta.response.dto";
import { TarjetasSqlRepository } from "./repositories/tarjetas.sql-repository";
import type { TarjetaAreaJson, TarjetaRow } from "./tarjetas.types";

function mapTarjeta(row: TarjetaRow): TarjetaResponseDto {
  const rawAreas = typeof row.areas === "string" ? JSON.parse(row.areas) as TarjetaAreaJson[] : row.areas;
  return {
    id: Number(row.id), sedeId: Number(row.sede_id), sedeNombre: row.sede_nombre, empresaNombre: row.empresa_nombre, numero: Number(row.numero), color: row.color.toUpperCase(), icono: row.icono,
    activo: row.activo, enUso: row.en_uso,
    areas: rawAreas.map((area) => ({ ...area, id: Number(area.id), createdAt: new Date(area.createdAt).toISOString(), updatedAt: new Date(area.updatedAt).toISOString() })),
    createdAt: new Date(row.creado_en).toISOString(), updatedAt: new Date(row.actualizado_en).toISOString(),
  };
}

@Injectable()
export class TarjetasService {
  constructor(private readonly repo: TarjetasSqlRepository) {}

  async list(query: ListTarjetasQueryDto) {
    const result = await this.repo.findAll({ page: query.page ?? 1, limit: query.limit ?? DEFAULT_TARJETAS_PAGE_LIMIT, search: query.search, sedeId: query.sedeId, numero: query.numero, color: query.color, icono: query.icono, areaId: query.areaId, activo: query.activo, enUso: query.enUso, sortBy: query.sortBy, sortOrder: query.sortOrder });
    return { ...result, items: result.items.map(mapTarjeta) };
  }
  async findById(id: number) { return mapTarjeta(await this.required(id)); }

  async create(dto: CreateTarjetaDto) {
    if (!await this.repo.activeSedeExists(dto.sedeId)) this.conflict("La sede seleccionada no existe o esta inactiva");
    await this.ensureNumeroUnique(dto.sedeId, dto.numero);
    await this.ensureAreas(dto.sedeId, dto.areaIds);
    const activo = dto.activo ?? true;
    const enUso = dto.enUso ?? false;
    if (enUso && !activo) this.conflict("Una tarjeta inactiva no puede estar en uso");
    return mapTarjeta(await this.repo.create({ sedeId: dto.sedeId, numero: dto.numero, color: dto.color.toUpperCase(), icono: dto.icono, areaIds: dto.areaIds, activo, enUso }));
  }

  async update(id: number, dto: UpdateTarjetaDto) {
    const current = await this.required(id);
    const sedeId = Number(current.sede_id);
    if (dto.numero !== undefined && dto.numero !== Number(current.numero)) await this.ensureNumeroUnique(sedeId, dto.numero, id);
    if (dto.areaIds !== undefined) await this.ensureAreas(sedeId, dto.areaIds);
    const nextActivo = dto.activo ?? current.activo;
    const nextEnUso = dto.enUso ?? current.en_uso;
    if (nextEnUso && !nextActivo) this.conflict("Una tarjeta en uso no puede desactivarse");
    const updated = await this.repo.update(id, { numero: dto.numero, color: dto.color?.toUpperCase(), icono: dto.icono, areaIds: dto.areaIds, activo: dto.activo, enUso: dto.enUso });
    return mapTarjeta(updated!);
  }

  activate(id: number) { return this.update(id, { activo: true }); }
  deactivate(id: number) { return this.update(id, { activo: false }); }

  async delete(id: number) {
    const current = await this.required(id);
    if (current.en_uso) this.conflict("No se puede eliminar una tarjeta en uso");
    await this.repo.delete(id);
    return { id, deleted: true as const };
  }

  private async ensureNumeroUnique(sedeId: number, numero: number, exceptId?: number) {
    const found = await this.repo.findByNumero(sedeId, numero);
    if (found && Number(found.id) !== exceptId) this.conflict(`Ya existe una tarjeta con numero ${numero} en la sede`);
  }
  private async ensureAreas(sedeId: number, areaIds: number[]) {
    const unique = [...new Set(areaIds)];
    const active = await this.repo.findActiveAreas(sedeId, unique);
    if (active.length !== unique.length) this.conflict("Todas las areas deben estar activas y pertenecer a la sede de la tarjeta");
  }
  private async required(id: number) {
    const row = await this.repo.findById(id);
    if (!row) throw new BusinessException({ message: `Tarjeta ${id} no encontrada`, code: API_ERROR_CODE.NOT_FOUND, status: HttpStatus.NOT_FOUND });
    return row;
  }
  private conflict(message: string): never { throw new BusinessException({ message, code: API_ERROR_CODE.CONFLICT, status: HttpStatus.CONFLICT }); }
}
