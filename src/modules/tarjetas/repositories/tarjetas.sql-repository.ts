import { Injectable } from "@nestjs/common";
import type { PaginatedResult } from "../../../common/dto/pagination.dto";
import { PostgresService } from "../../postgres/postgres.service";
import type { AreaRow } from "../../areas/areas.types";
import type { TarjetaListFilters, TarjetaRow, TarjetaValues } from "../tarjetas.types";

const SORT = { id: "t.id", sedeId: "s.nombre", numero: "t.numero", color: "t.color", icono: "t.icono", activo: "t.activo", enUso: "t.en_uso", createdAt: "t.creado_en" } as const;
const FROM = "FROM public.tarjetas t INNER JOIN public.sede s ON s.id = t.sede_id INNER JOIN public.empresa e ON e.id = s.empresa_id";
const SELECT = `t.id, t.sede_id, s.nombre AS sede_nombre, e.nombre AS empresa_nombre, t.numero, t.color, t.icono, t.activo, t.en_uso, t.creado_en, t.actualizado_en,
  COALESCE(jsonb_agg(jsonb_build_object('id', a.id, 'sedeId', a.sede_id, 'sedeNombre', s.nombre, 'empresaNombre', e.nombre, 'nombre', a.nombre, 'activo', a.activo, 'createdAt', a.creado_en, 'updatedAt', a.actualizado_en) ORDER BY a.nombre) FILTER (WHERE a.id IS NOT NULL), '[]'::jsonb) AS areas`;

@Injectable()
export class TarjetasSqlRepository {
  constructor(private readonly postgres: PostgresService) {}

  async findAll(filters: TarjetaListFilters): Promise<PaginatedResult<TarjetaRow>> {
    const params: unknown[] = []; const clauses: string[] = [];
    if (filters.search?.trim()) { params.push(`%${filters.search.trim()}%`); const p = `$${params.length}`; clauses.push(`(t.id::text ILIKE ${p} OR t.numero::text ILIKE ${p} OR t.color ILIKE ${p} OR t.icono ILIKE ${p} OR s.nombre ILIKE ${p} OR e.nombre ILIKE ${p} OR CASE WHEN t.activo THEN 'activo' ELSE 'inactivo' END ILIKE ${p} OR CASE WHEN t.en_uso THEN 'en uso' ELSE 'disponible' END ILIKE ${p} OR EXISTS (SELECT 1 FROM public.tarjeta_area sx JOIN public.areas ax ON ax.id = sx.area_id WHERE sx.tarjeta_id = t.id AND ax.nombre ILIKE ${p}))`); }
    if (filters.sedeId !== undefined) { params.push(filters.sedeId); clauses.push(`t.sede_id = $${params.length}`); }
    if (filters.numero !== undefined) { params.push(filters.numero); clauses.push(`t.numero = $${params.length}`); }
    if (filters.color?.trim()) { params.push(`%${filters.color.trim()}%`); clauses.push(`t.color ILIKE $${params.length}`); }
    if (filters.icono?.trim()) { params.push(`%${filters.icono.trim()}%`); clauses.push(`t.icono ILIKE $${params.length}`); }
    if (filters.areaId !== undefined) { params.push(filters.areaId); clauses.push(`EXISTS (SELECT 1 FROM public.tarjeta_area sx WHERE sx.tarjeta_id = t.id AND sx.area_id = $${params.length})`); }
    if (filters.activo !== undefined) { params.push(filters.activo); clauses.push(`t.activo = $${params.length}`); }
    if (filters.enUso !== undefined) { params.push(filters.enUso); clauses.push(`t.en_uso = $${params.length}`); }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const totalRows = await this.postgres.query<{ total: string }>(`SELECT COUNT(*)::text total ${FROM} ${where}`, params);
    const sort = filters.sortBy ? SORT[filters.sortBy] : "t.id"; const direction = filters.sortBy ? (filters.sortOrder === "asc" ? "ASC" : "DESC") : "ASC";
    const listParams = [...params, filters.limit, (filters.page - 1) * filters.limit];
    const items = await this.postgres.query<TarjetaRow>(`SELECT ${SELECT} ${FROM} LEFT JOIN public.tarjeta_area ta ON ta.tarjeta_id = t.id LEFT JOIN public.areas a ON a.id = ta.area_id ${where} GROUP BY t.id, s.id, e.id ORDER BY ${sort} ${direction}, t.id ASC LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`, listParams);
    return { items, total: Number(totalRows[0]?.total ?? 0), page: filters.page, limit: filters.limit };
  }

  async findById(id: number): Promise<TarjetaRow | null> { return (await this.postgres.query<TarjetaRow>(`SELECT ${SELECT} ${FROM} LEFT JOIN public.tarjeta_area ta ON ta.tarjeta_id = t.id LEFT JOIN public.areas a ON a.id = ta.area_id WHERE t.id = $1 GROUP BY t.id, s.id, e.id`, [id]))[0] ?? null; }
  async findByNumero(sedeId: number, numero: number): Promise<TarjetaRow | null> { const rows = await this.postgres.query<{ id: string }>("SELECT id FROM public.tarjetas WHERE sede_id = $1 AND numero = $2", [sedeId, numero]); return rows[0] ? this.findById(Number(rows[0].id)) : null; }
  async activeSedeExists(sedeId: number): Promise<boolean> { return (await this.postgres.query<{ id: string }>("SELECT id FROM public.sede WHERE id = $1 AND activo = true", [sedeId])).length > 0; }
  async findActiveAreas(sedeId: number, ids: number[]): Promise<AreaRow[]> { return this.postgres.query<AreaRow>("SELECT a.id, a.sede_id, s.nombre AS sede_nombre, e.nombre AS empresa_nombre, a.nombre, a.activo, a.creado_en, a.actualizado_en FROM public.areas a INNER JOIN public.sede s ON s.id = a.sede_id INNER JOIN public.empresa e ON e.id = s.empresa_id WHERE a.sede_id = $1 AND a.activo = true AND a.id = ANY($2::bigint[])", [sedeId, ids]); }

  async create(values: Required<TarjetaValues>): Promise<TarjetaRow> {
    const id = await this.postgres.transaction(async (client) => { const inserted = await client.query<{ id: string }>("INSERT INTO public.tarjetas (sede_id, numero, color, icono, activo, en_uso) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id", [values.sedeId, values.numero, values.color, values.icono, values.activo, values.enUso]); const tarjetaId = Number(inserted.rows[0].id); await client.query("INSERT INTO public.tarjeta_area (tarjeta_id, area_id, sede_id) SELECT $1, unnest($2::bigint[]), $3", [tarjetaId, values.areaIds, values.sedeId]); return tarjetaId; });
    return (await this.findById(id))!;
  }

  async update(id: number, values: TarjetaValues): Promise<TarjetaRow | null> {
    const current = await this.findById(id); if (!current) return null; const sedeId = Number(current.sede_id);
    await this.postgres.transaction(async (client) => { const params: unknown[] = []; const set: string[] = []; const entries: Array<[keyof TarjetaValues, string]> = [["numero", "numero"], ["color", "color"], ["icono", "icono"], ["activo", "activo"], ["enUso", "en_uso"]]; for (const [key, column] of entries) if (values[key] !== undefined) { params.push(values[key]); set.push(`${column} = $${params.length}`); } if (set.length) { params.push(id); await client.query(`UPDATE public.tarjetas SET ${set.join(", ")}, actualizado_en = now() WHERE id = $${params.length}`, params); } if (values.areaIds !== undefined) { await client.query("DELETE FROM public.tarjeta_area WHERE tarjeta_id = $1", [id]); await client.query("INSERT INTO public.tarjeta_area (tarjeta_id, area_id, sede_id) SELECT $1, unnest($2::bigint[]), $3", [id, values.areaIds, sedeId]); } });
    return this.findById(id);
  }
  async delete(id: number): Promise<boolean> { return (await this.postgres.query<{ id: string }>("DELETE FROM public.tarjetas WHERE id = $1 RETURNING id", [id])).length > 0; }
}
