/**
 * @file usuario-empresa-porteria.controller.ts
 * @description Endpoints HTTP CRUD de asignaciones usuario-empresa-porteria.
 */
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-user";
import { ResponseMessage } from "../../common/interceptors/response-message.decorator";
import { UsuarioEmpresaPorteriaService } from "./usuario-empresa-porteria.service";
import { CreateUsuarioEmpresaPorteriaDto } from "./dto/create-usuario-empresa-porteria.dto";
import {
  UsuarioEmpresaPorteriaListResponseDto,
  UsuarioEmpresaPorteriaResponseDto,
} from "./dto/usuario-empresa-porteria.response.dto";
import { ListUsuarioEmpresaPorteriaQueryDto } from "./dto/list-usuario-empresa-porteria-query.dto";
import { UpdateUsuarioEmpresaPorteriaDto } from "./dto/update-usuario-empresa-porteria.dto";

/** Controlador REST de asignaciones usuario-empresa-porteria restringido a super_admin exacto. */
@ApiTags("usuario-empresa-porteria")
@ApiBearerAuth()
@Roles("super_admin", "admin_empresa", "encargado_seguridad", "encargado_porteria")
@Controller("usuario-empresa-porteria")
export class UsuarioEmpresaPorteriaController {
  /** Inyecta el servicio de asignaciones usuario-empresa-porteria. */
  constructor(private readonly usuarioEmpresaPorteriaService: UsuarioEmpresaPorteriaService) {}

  /** Lista asignaciones usuario-empresa-porteria con paginacion, filtros y orden opcional. */
  @Get()
  @ApiOperation({ summary: "List usuario-empresa-porteria with pagination, filters and sorting" })
  @ApiResponse({ status: 200, type: UsuarioEmpresaPorteriaListResponseDto })
  @ResponseMessage("Asignaciones usuario-empresa-porteria retrieved")
  async list(@CurrentUser() current: AuthenticatedUser, @Query() query: ListUsuarioEmpresaPorteriaQueryDto): Promise<UsuarioEmpresaPorteriaListResponseDto> {
    return this.usuarioEmpresaPorteriaService.list(query, current);
  }

  /** Obtiene una asignacion usuario-empresa-porteria por identificador. */
  @Get(":id")
  @ApiOperation({ summary: "Get usuario-empresa-porteria by id" })
  @ApiResponse({ status: 200, type: UsuarioEmpresaPorteriaResponseDto })
  @ResponseMessage("Asignacion usuario-empresa-porteria retrieved")
  async findById(@CurrentUser() current: AuthenticatedUser, @Param("id", ParseIntPipe) id: number): Promise<UsuarioEmpresaPorteriaResponseDto> {
    return this.usuarioEmpresaPorteriaService.findById(id, current);
  }

  /** Crea una asignacion usuario-empresa-porteria nueva. */
  @Post()
  @Roles("super_admin")
  @ApiOperation({ summary: "Create usuario-empresa-porteria" })
  @ApiResponse({ status: 201, type: UsuarioEmpresaPorteriaResponseDto })
  @ResponseMessage("Asignacion usuario-empresa-porteria created")
  async create(@Body() dto: CreateUsuarioEmpresaPorteriaDto): Promise<UsuarioEmpresaPorteriaResponseDto> {
    return this.usuarioEmpresaPorteriaService.create(dto);
  }

  /** Actualiza parcialmente una asignacion usuario-empresa-porteria existente. */
  @Patch(":id")
  @ApiOperation({ summary: "Update usuario-empresa-porteria" })
  @ApiResponse({ status: 200, type: UsuarioEmpresaPorteriaResponseDto })
  @ResponseMessage("Asignacion usuario-empresa-porteria updated")
  async update(
    @CurrentUser() current: AuthenticatedUser,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateUsuarioEmpresaPorteriaDto,
  ): Promise<UsuarioEmpresaPorteriaResponseDto> {
    return this.usuarioEmpresaPorteriaService.update(id, dto, current);
  }

  /** Desactiva una asignacion usuario-empresa-porteria. */
  @Patch(":id/deactivate")
  @ApiOperation({ summary: "Deactivate usuario-empresa-porteria" })
  @ApiResponse({ status: 200, type: UsuarioEmpresaPorteriaResponseDto })
  @ResponseMessage("Asignacion usuario-empresa-porteria deactivated")
  async deactivate(@CurrentUser() current: AuthenticatedUser, @Param("id", ParseIntPipe) id: number): Promise<UsuarioEmpresaPorteriaResponseDto> {
    return this.usuarioEmpresaPorteriaService.deactivate(id, current);
  }

  /** Reactiva una asignacion usuario-empresa-porteria. */
  @Patch(":id/activate")
  @ApiOperation({ summary: "Activate usuario-empresa-porteria" })
  @ApiResponse({ status: 200, type: UsuarioEmpresaPorteriaResponseDto })
  @ResponseMessage("Asignacion usuario-empresa-porteria activated")
  async activate(@CurrentUser() current: AuthenticatedUser, @Param("id", ParseIntPipe) id: number): Promise<UsuarioEmpresaPorteriaResponseDto> {
    return this.usuarioEmpresaPorteriaService.activate(id, current);
  }

  /** Elimina permanentemente una asignacion usuario-empresa-porteria. */
  @Delete(":id")
  @Roles("super_admin")
  @ApiOperation({ summary: "Permanently delete usuario-empresa-porteria" })
  @ResponseMessage("Asignacion usuario-empresa-porteria deleted")
  async deletePermanent(@Param("id", ParseIntPipe) id: number): Promise<{ id: number; deleted: true }> {
    return this.usuarioEmpresaPorteriaService.deletePermanent(id);
  }
}
