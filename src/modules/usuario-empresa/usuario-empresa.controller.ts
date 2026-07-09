/**
 * @file usuario-empresa.controller.ts
 * @description Endpoints HTTP CRUD de asignaciones usuario-empresa.
 */
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { ResponseMessage } from "../../common/interceptors/response-message.decorator";
import { UsuarioEmpresaService } from "./usuario-empresa.service";
import { CreateUsuarioEmpresaDto } from "./dto/create-usuario-empresa.dto";
import { UsuarioEmpresaListResponseDto, UsuarioEmpresaResponseDto } from "./dto/usuario-empresa.response.dto";
import { ListUsuarioEmpresaQueryDto } from "./dto/list-usuario-empresa-query.dto";
import { UpdateUsuarioEmpresaDto } from "./dto/update-usuario-empresa.dto";

/** Controlador REST de asignaciones usuario-empresa restringido a super_admin exacto. */
@ApiTags("usuario-empresa")
@ApiBearerAuth()
@Roles("super_admin")
@Controller("usuario-empresa")
export class UsuarioEmpresaController {
  /** Inyecta el servicio de asignaciones usuario-empresa. */
  constructor(private readonly usuarioEmpresaService: UsuarioEmpresaService) {}

  /** Lista asignaciones usuario-empresa con paginacion, filtros y orden opcional. */
  @Get()
  @ApiOperation({ summary: "List usuario-empresa with pagination, filters and sorting" })
  @ApiResponse({ status: 200, type: UsuarioEmpresaListResponseDto })
  @ResponseMessage("Asignaciones usuario-empresa retrieved")
  async list(@Query() query: ListUsuarioEmpresaQueryDto): Promise<UsuarioEmpresaListResponseDto> {
    return this.usuarioEmpresaService.list(query);
  }

  /** Obtiene una asignacion usuario-empresa por identificador. */
  @Get(":id")
  @ApiOperation({ summary: "Get usuario-empresa by id" })
  @ApiResponse({ status: 200, type: UsuarioEmpresaResponseDto })
  @ResponseMessage("Asignacion usuario-empresa retrieved")
  async findById(@Param("id", ParseIntPipe) id: number): Promise<UsuarioEmpresaResponseDto> {
    return this.usuarioEmpresaService.findById(id);
  }

  /** Crea una asignacion usuario-empresa nueva. */
  @Post()
  @ApiOperation({ summary: "Create usuario-empresa" })
  @ApiResponse({ status: 201, type: UsuarioEmpresaResponseDto })
  @ResponseMessage("Asignacion usuario-empresa created")
  async create(@Body() dto: CreateUsuarioEmpresaDto): Promise<UsuarioEmpresaResponseDto> {
    return this.usuarioEmpresaService.create(dto);
  }

  /** Actualiza parcialmente una asignacion usuario-empresa existente. */
  @Patch(":id")
  @ApiOperation({ summary: "Update usuario-empresa" })
  @ApiResponse({ status: 200, type: UsuarioEmpresaResponseDto })
  @ResponseMessage("Asignacion usuario-empresa updated")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateUsuarioEmpresaDto,
  ): Promise<UsuarioEmpresaResponseDto> {
    return this.usuarioEmpresaService.update(id, dto);
  }

  /** Desactiva una asignacion usuario-empresa. */
  @Patch(":id/deactivate")
  @ApiOperation({ summary: "Deactivate usuario-empresa" })
  @ApiResponse({ status: 200, type: UsuarioEmpresaResponseDto })
  @ResponseMessage("Asignacion usuario-empresa deactivated")
  async deactivate(@Param("id", ParseIntPipe) id: number): Promise<UsuarioEmpresaResponseDto> {
    return this.usuarioEmpresaService.deactivate(id);
  }

  /** Reactiva una asignacion usuario-empresa. */
  @Patch(":id/activate")
  @ApiOperation({ summary: "Activate usuario-empresa" })
  @ApiResponse({ status: 200, type: UsuarioEmpresaResponseDto })
  @ResponseMessage("Asignacion usuario-empresa activated")
  async activate(@Param("id", ParseIntPipe) id: number): Promise<UsuarioEmpresaResponseDto> {
    return this.usuarioEmpresaService.activate(id);
  }

  /** Elimina permanentemente una asignacion usuario-empresa. */
  @Delete(":id")
  @ApiOperation({ summary: "Permanently delete usuario-empresa" })
  @ResponseMessage("Asignacion usuario-empresa deleted")
  async deletePermanent(@Param("id", ParseIntPipe) id: number): Promise<{ id: number; deleted: true }> {
    return this.usuarioEmpresaService.deletePermanent(id);
  }
}
