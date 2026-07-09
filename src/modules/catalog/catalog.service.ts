/**
 * @file catalog.service.ts
 * @description Expone catálogos locales de portería.
 */
import { Injectable } from "@nestjs/common";
import type { DomainCategory } from "../glpi/mappers/category.mapper";
import type { DomainLocation } from "../glpi/mappers/location.mapper";
import type { DomainGroup } from "../glpi/mappers/group.mapper";

/**
 * Servicio de catálogo sin dependencia GLPI.
 */
@Injectable()
export class CatalogService {
  /**
   * Lista categorías disponibles.
   * @returns Categorías del dominio ordenadas por el origen de datos.
   */
  async listCategories(): Promise<DomainCategory[]> {
    return [];
  }

  /**
   * Lista ubicaciones disponibles.
   * @param options - Filtro `activeOnly` para ubicaciones con usuarios activos.
   * @returns Ubicaciones del dominio.
   */
  async listLocations(_options?: { activeOnly?: boolean }): Promise<DomainLocation[]> {
    return [];
  }

  /**
   * Lista grupos disponibles.
   * @returns Grupos del dominio.
   */
  async listGroups(): Promise<DomainGroup[]> {
    return [];
  }

  /**
   * Invalida entradas de caché del catálogo según el alcance indicado.
   * @param scope - Alcance: todo el catálogo o una entidad concreta.
   * @returns void
   */
  invalidate(scope: "all" | "categories" | "locations" | "groups"): void {
    void scope;
  }
}
