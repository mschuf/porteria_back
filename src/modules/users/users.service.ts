/**
 * @file users.service.ts
 * @description Orquesta consultas de usuarios locales del sistema.
 */
import { Injectable } from "@nestjs/common";
import type { PaginatedResult } from "../../common/dto/pagination.dto";
import { UsuariosSqlRepository, type UsuarioAuthRow } from "../auth/repositories/usuarios.sql-repository";
import type { DomainUser } from "../glpi/mappers/user.mapper";
import { emailsMatch, matchesUserSearch } from "../glpi/user-search.utils";
import {
  DEFAULT_USERS_PAGE_LIMIT,
  type ListUsersQueryDto,
} from "./dto/list-users-query.dto";

/**
 * Servicio de consulta de usuarios locales.
 */
@Injectable()
export class UsersService {
  /** Inyecta el repositorio local de usuarios. */
  constructor(private readonly usuariosRepo: UsuariosSqlRepository) {}

  /**
   * Devuelve todos los usuarios activos sin paginación.
   * @returns Lista completa de usuarios activos locales.
   */
  async listAll(): Promise<DomainUser[]> {
    const users = await this.usuariosRepo.listActive();
    return users.map((user) => this.toDomainUser(user));
  }

  /**
   * Lista usuarios activos con paginación y búsqueda opcional.
   * @param query - Parámetros de paginación y texto de búsqueda.
   * @returns Resultado paginado de usuarios que coinciden con el filtro.
   */
  async list(query: ListUsersQueryDto): Promise<PaginatedResult<DomainUser>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_USERS_PAGE_LIMIT;
    const search = query.search?.trim();
    const allUsers = await this.listAll();
    const filtered = search
      ? allUsers.filter((user) => matchesUserSearch(user, search))
      : allUsers;
    const start = (page - 1) * limit;

    return {
      items: filtered.slice(start, start + limit),
      total: filtered.length,
      page,
      limit,
    };
  }

  /**
   * Lista técnicos elegibles activos con paginación y búsqueda opcional.
   * @param query - Parámetros opcionales de paginación y búsqueda.
   * @returns Resultado paginado de técnicos activos.
   */
  async listTechnicians(query?: ListUsersQueryDto): Promise<PaginatedResult<DomainUser>> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? DEFAULT_USERS_PAGE_LIMIT;
    const search = query?.search?.trim();
    const allTechnicians = (await this.listAll()).filter((user) => user.isActive);
    const filtered = search
      ? allTechnicians.filter((user) => matchesUserSearch(user, search))
      : allTechnicians;
    const start = (page - 1) * limit;

    return {
      items: filtered.slice(start, start + limit),
      total: filtered.length,
      page,
      limit,
    };
  }

  /**
   * Busca un usuario por su identificador local.
   * @param id - ID numérico del usuario.
   * @returns Usuario encontrado o `null` si no existe.
   */
  async findById(id: number): Promise<DomainUser | null> {
    const user = await this.usuariosRepo.findActiveById(id);
    return user ? this.toDomainUser(user) : null;
  }

  /**
   * Busca un usuario por login local.
   * @param login - Nombre de usuario (se recorta espacios).
   * @returns Usuario encontrado o `null` si el login está vacío o no existe.
   */
  async findByLogin(login: string): Promise<DomainUser | null> {
    const trimmed = login.trim();
    if (!trimmed) {
      return null;
    }
    const user = await this.usuariosRepo.findActiveByUsuario(trimmed);
    return user ? this.toDomainUser(user) : null;
  }

  /**
   * Busca un usuario por correo electrónico.
   * @param email - Dirección de correo (se recorta espacios).
   * @returns Usuario encontrado o `null` si el email es inválido o no existe.
   */
  async findByEmail(email: string): Promise<DomainUser | null> {
    const trimmed = email.trim();
    if (!trimmed.includes("@")) {
      return null;
    }

    const cached = await this.listAll();
    const fromCache = cached.find(
      (user) => user.email && emailsMatch(user.email, trimmed),
    );
    if (fromCache) {
      return fromCache;
    }

    const user = await this.usuariosRepo.findActiveByCorreo(trimmed);
    return user ? this.toDomainUser(user) : null;
  }

  /**
   * Indica si un usuario pertenece al conjunto de técnicos elegibles.
   * @param userId - ID del usuario a verificar.
   * @returns `true` si el usuario es técnico elegible.
   */
  async isEligibleTechnician(userId: number): Promise<boolean> {
    const user = await this.findById(userId);
    return Boolean(user?.isActive);
  }

  private toDomainUser(user: UsuarioAuthRow): DomainUser {
    return {
      id: user.id,
      login: user.usuario,
      firstName: null,
      lastName: null,
      fullName: user.nombre,
      email: user.correo,
      phone: null,
      mobile: null,
      locationId: null,
      primaryGroupId: null,
      entityId: null,
      userTitle: user.rol,
      isActive: true,
    };
  }
}
