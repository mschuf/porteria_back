/**
 * @file usuarios-admin.controller.ts
 * @description Endpoints HTTP CRUD de usuarios del sistema.
 */
import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
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

/** Controlador REST de usuarios restringido a super_admin exacto. */
@ApiTags("usuarios-admin")
@ApiBearerAuth()
@Roles("super_admin")
@Controller("usuarios-admin")
export class UsuariosAdminController {
  /** Inyecta el servicio de usuarios. */
  constructor(private readonly usuariosAdminService: UsuariosAdminService) {}

  /** Lista usuarios con paginacion, filtros y orden opcional. */
  @Get()
  @ApiOperation({ summary: "List usuarios with pagination, filters and sorting" })
  @ApiResponse({ status: 200, type: UsuarioAdminListResponseDto })
  @ResponseMessage("Usuarios retrieved")
  async list(@Query() query: ListUsuariosAdminQueryDto): Promise<UsuarioAdminListResponseDto> {
    return this.usuariosAdminService.list(query);
  }

  /** Explica las asignaciones vigentes que determinan el acceso de un usuario. */
  @Get(":id/asignacion")
  @ApiOperation({ summary: "Explain the active assignment of a usuario according to its role" })
  @ApiResponse({ status: 200, type: UsuarioAdminAsignacionResponseDto })
  @ResponseMessage("Usuario assignment retrieved")
  async explainAssignment(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<UsuarioAdminAsignacionResponseDto> {
    return this.usuariosAdminService.explainAssignment(id);
  }

  /** Obtiene un usuario por identificador. */
  @Get(":id")
  @ApiOperation({ summary: "Get usuario by id" })
  @ApiResponse({ status: 200, type: UsuarioAdminResponseDto })
  @ResponseMessage("Usuario retrieved")
  async findById(@Param("id", ParseIntPipe) id: number): Promise<UsuarioAdminResponseDto> {
    return this.usuariosAdminService.findById(id);
  }

  /** Crea un usuario nuevo. */
  @Post()
  @ApiOperation({ summary: "Create usuario" })
  @ApiResponse({ status: 201, type: UsuarioAdminResponseDto })
  @ResponseMessage("Usuario created")
  async create(@Body() dto: CreateUsuarioAdminDto): Promise<UsuarioAdminResponseDto> {
    return this.usuariosAdminService.create(dto);
  }

  /** Actualiza parcialmente un usuario existente. */
  @Patch(":id")
  @ApiOperation({ summary: "Update usuario" })
  @ApiResponse({ status: 200, type: UsuarioAdminResponseDto })
  @ResponseMessage("Usuario updated")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateUsuarioAdminDto,
  ): Promise<UsuarioAdminResponseDto> {
    return this.usuariosAdminService.update(id, dto);
  }

  /** Restablece la contraseña de un usuario. */
  @Patch(":id/reset-password")
  @ApiOperation({ summary: "Reset usuario password" })
  @ApiResponse({ status: 200, type: UsuarioAdminResponseDto })
  @ResponseMessage("Password reset")
  async resetPassword(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ResetPasswordDto,
  ): Promise<UsuarioAdminResponseDto> {
    return this.usuariosAdminService.resetPassword(id, dto.password);
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
    return this.usuariosAdminService.deactivate(id, current.id);
  }

  /** Reactiva un usuario. */
  @Patch(":id/activate")
  @ApiOperation({ summary: "Activate usuario" })
  @ApiResponse({ status: 200, type: UsuarioAdminResponseDto })
  @ResponseMessage("Usuario activated")
  async activate(@Param("id", ParseIntPipe) id: number): Promise<UsuarioAdminResponseDto> {
    return this.usuariosAdminService.activate(id);
  }
}
