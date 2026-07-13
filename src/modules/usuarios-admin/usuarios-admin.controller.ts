/**
 * @file usuarios-admin.controller.ts
 * @description Endpoints HTTP CRUD de usuarios del sistema.
 */
import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ResponseMessage } from "../../common/interceptors/response-message.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-user";
import { CreateUsuarioAdminDto } from "./dto/create-usuario-admin.dto";
import { ListUsuariosAdminQueryDto } from "./dto/list-usuarios-admin-query.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { UpdateUsuarioAdminDto } from "./dto/update-usuario-admin.dto";
import { UsuarioAdminListResponseDto, UsuarioAdminResponseDto } from "./dto/usuario-admin.response.dto";
import { UsuarioAdminAsignacionResponseDto } from "./dto/usuario-admin-asignacion.response.dto";
import { UsuariosAdminService } from "./usuarios-admin.service";
import { ReplaceUsuarioSedesDto } from "./dto/replace-usuario-sedes.dto";

/** Controlador REST de usuarios restringido a super_admin exacto. */
@ApiTags("usuarios-admin")
@ApiBearerAuth()
@Roles("super_admin", "admin_empresa")
@Controller("usuarios-admin")
export class UsuariosAdminController {
  /** Inyecta el servicio de usuarios. */
  constructor(private readonly usuariosAdminService: UsuariosAdminService) {}

  @Get("porteria-assignment-candidates")
  async porteriaCandidates(@CurrentUser() current: AuthenticatedUser, @Query("search") search?: string) {
    return this.usuariosAdminService.listPorteriaCandidates(current, search);
  }

  /** Lista usuarios con paginacion, filtros y orden opcional. */
  @Get()
  @ApiOperation({ summary: "List usuarios with pagination, filters and sorting" })
  @ApiResponse({ status: 200, type: UsuarioAdminListResponseDto })
  @ResponseMessage("Usuarios retrieved")
  async list(@CurrentUser() current: AuthenticatedUser, @Query() query: ListUsuariosAdminQueryDto): Promise<UsuarioAdminListResponseDto> {
    return this.usuariosAdminService.list(query, current);
  }

  /** Explica las asignaciones vigentes que determinan el acceso de un usuario. */
  @Get(":id/asignacion")
  @ApiOperation({ summary: "Explain the active assignment of a usuario according to its role" })
  @ApiResponse({ status: 200, type: UsuarioAdminAsignacionResponseDto })
  @ResponseMessage("Usuario assignment retrieved")
  async explainAssignment(
    @CurrentUser() current: AuthenticatedUser,
    @Param("id", ParseIntPipe) id: number,
  ): Promise<UsuarioAdminAsignacionResponseDto> {
    return this.usuariosAdminService.explainAssignment(id, current);
  }

  /** Reemplaza atomically las sedes explicitas de un admin_empresa. */
  @Put(":id/sedes")
  @Roles("super_admin")
  @ResponseMessage("Usuario sedes updated")
  async replaceSedes(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ReplaceUsuarioSedesDto,
  ): Promise<UsuarioAdminAsignacionResponseDto> {
    await this.usuariosAdminService.replaceSedes(id, dto.sedeIds);
    return this.usuariosAdminService.explainAssignment(id);
  }

  /** Obtiene un usuario por identificador. */
  @Get(":id")
  @ApiOperation({ summary: "Get usuario by id" })
  @ApiResponse({ status: 200, type: UsuarioAdminResponseDto })
  @ResponseMessage("Usuario retrieved")
  async findById(@CurrentUser() current: AuthenticatedUser, @Param("id", ParseIntPipe) id: number): Promise<UsuarioAdminResponseDto> {
    return this.usuariosAdminService.findById(id, current);
  }

  /** Crea un usuario nuevo. */
  @Post()
  @ApiOperation({ summary: "Create usuario" })
  @ApiResponse({ status: 201, type: UsuarioAdminResponseDto })
  @ResponseMessage("Usuario created")
  async create(@CurrentUser() current: AuthenticatedUser, @Body() dto: CreateUsuarioAdminDto): Promise<UsuarioAdminResponseDto> {
    return this.usuariosAdminService.create(dto, current);
  }

  /** Actualiza parcialmente un usuario existente. */
  @Patch(":id")
  @ApiOperation({ summary: "Update usuario" })
  @ApiResponse({ status: 200, type: UsuarioAdminResponseDto })
  @ResponseMessage("Usuario updated")
  async update(
    @CurrentUser() current: AuthenticatedUser,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateUsuarioAdminDto,
  ): Promise<UsuarioAdminResponseDto> {
    return this.usuariosAdminService.update(id, dto, current);
  }

  /** Restablece la contraseña de un usuario. */
  @Patch(":id/reset-password")
  @ApiOperation({ summary: "Reset usuario password" })
  @ApiResponse({ status: 200, type: UsuarioAdminResponseDto })
  @ResponseMessage("Password reset")
  async resetPassword(
    @CurrentUser() current: AuthenticatedUser,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ResetPasswordDto,
  ): Promise<UsuarioAdminResponseDto> {
    return this.usuariosAdminService.resetPassword(id, dto.password, current);
  }

  /** Desactiva un usuario. */
  @Patch(":id/deactivate")
  @ApiOperation({ summary: "Deactivate usuario" })
  @ApiResponse({ status: 200, type: UsuarioAdminResponseDto })
  @ResponseMessage("Usuario deactivated")
  async deactivate(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<UsuarioAdminResponseDto> {
    return this.usuariosAdminService.deactivate(id, current);
  }

  /** Reactiva un usuario. */
  @Patch(":id/activate")
  @ApiOperation({ summary: "Activate usuario" })
  @ApiResponse({ status: 200, type: UsuarioAdminResponseDto })
  @ResponseMessage("Usuario activated")
  async activate(@CurrentUser() current: AuthenticatedUser, @Param("id", ParseIntPipe) id: number): Promise<UsuarioAdminResponseDto> {
    return this.usuariosAdminService.activate(id, current);
  }
}
