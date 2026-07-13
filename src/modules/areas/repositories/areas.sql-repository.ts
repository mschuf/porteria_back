import { Injectable } from "@nestjs/common";
import type { PaginatedResult } from "../../../common/dto/pagination.dto";
import { PostgresService } from "../../postgres/postgres.service";
import { normalizeAreaName } from "../area-name-normalization";
import type { AreaListFilters, AreaRow } from "../areas.types";

const SELECT = "a.id, a.sede_id, s.nombre AS sede_nombre, e.nombre AS empresa_nombre, a.nombre, a.activo, a.creado_en, a.actualizado_en";
const FROM = "FROM public.areas a INNER JOIN public.sede s ON s.id = a.sede_id INNER JOIN public.empresa e ON e.id = s.empresa_id";
const SORT = { id: "a.id", sedeId: "s.nombre", nombre: "a.nombre", activo: "a.activo", createdAt: "a.creado_en" } as const;
const NORMALIZED_NAME_SQL = "regexp_replace(translate(lower(btrim(a.nombre)), 'áéíóúüñ', 'aeiouun'), '[[:space:]]+', ' ', 'g')";

@Injectable()
export class AreasSqlRepository {
  constructor(private readonly postgres: PostgresService) {}

  async findAll(filters: AreaListFilters): Promise<PaginatedResult<AreaRow>> {
    const params: unknown[] = []; const clauses: string[] = [];
    if (filters.search?.trim()) { params.push(`%${filters.search.trim()}%`); const p = `$${params.length}`; clauses.push(`(a.id::text ILIKE ${p} OR a.nombre ILIKE ${p} OR s.nombre ILIKE ${p} OR e.nombre ILIKE ${p} OR CASE WHEN a.activo THEN 'activo' ELSE 'inactivo' END ILIKE ${p})`); }
    if (filters.nombre?.trim()) { params.push(`%${filters.nombre.trim()}%`); clauses.push(`a.nombre ILIKE $${params.length}`); }
    if (filters.sedeId !== undefined) { params.push(filters.sedeId); clauses.push(`a.sede_id = $${params.length}`); }
    if (filters.activo !== undefined) { params.push(filters.activo); clauses.push(`a.activo = $${params.length}`); }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const totalRows = await this.postgres.query<{ total: string }>(`SELECT COUNT(*)::text total ${FROM} ${where}`, params);
    const sort = filters.sortBy ? SORT[filters.sortBy] : "a.id"; const direction = filters.sortBy ? (filters.sortOrder === "asc" ? "ASC" : "DESC") : "ASC";
    const listParams = [...params, filters.limit, (filters.page - 1) * filters.limit];
    const items = await this.postgres.query<AreaRow>(`SELECT ${SELECT} ${FROM} ${where} ORDER BY ${sort} ${direction}, a.id ASC LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`, listParams);
    return { items, total: Number(totalRows[0]?.total ?? 0), page: filters.page, limit: filters.limit };
  }

  async findById(id: number): Promise<AreaRow | null> { return (await this.postgres.query<AreaRow>(`SELECT ${SELECT} ${FROM} WHERE a.id = $1`, [id]))[0] ?? null; }
  async findByNombre(sedeId: number, nombre: string): Promise<AreaRow | null> { return (await this.postgres.query<AreaRow>(`SELECT ${SELECT} ${FROM} WHERE a.sede_id = $1 AND ${NORMALIZED_NAME_SQL} = $2`, [sedeId, normalizeAreaName(nombre)]))[0] ?? null; }
  async activeSedeExists(sedeId: number): Promise<boolean> { return (await this.postgres.query<{ id: string }>("SELECT id FROM public.sede WHERE id = $1 AND activo = true", [sedeId])).length > 0; }
  async countAssignments(id: number): Promise<number> { const rows = await this.postgres.query<{ total: string }>("SELECT COUNT(*)::text total FROM public.tarjeta_area WHERE area_id = $1", [id]); return Number(rows[0]?.total ?? 0); }
  async create(sedeId: number, nombre: string, activo: boolean): Promise<AreaRow> { const rows = await this.postgres.query<{ id: string }>("INSERT INTO public.areas (sede_id, nombre, activo) VALUES ($1, $2, $3) RETURNING id", [sedeId, nombre, activo]); return (await this.findById(Number(rows[0].id)))!; }
  async update(id: number, values: { nombre?: string; activo?: boolean }): Promise<AreaRow | null> { const params: unknown[] = []; const assignments: string[] = []; if (values.nombre !== undefined) { params.push(values.nombre); assignments.push(`nombre = $${params.length}`); } if (values.activo !== undefined) { params.push(values.activo); assignments.push(`activo = $${params.length}`); } if (!assignments.length) return this.findById(id); params.push(id); const rows = await this.postgres.query<{ id: string }>(`UPDATE public.areas SET ${assignments.join(", ")}, actualizado_en = now() WHERE id = $${params.length} RETURNING id`, params); return rows[0] ? this.findById(Number(rows[0].id)) : null; }
  async delete(id: number): Promise<boolean> { return (await this.postgres.query<{ id: string }>("DELETE FROM public.areas WHERE id = $1 RETURNING id", [id])).length > 0; }
}
