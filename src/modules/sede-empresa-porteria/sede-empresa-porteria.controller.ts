/**
 * @file sede-empresa-porteria.controller.ts
 * @description Endpoints HTTP CRUD de asignaciones sede-empresa de seguridad.
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { ResponseMessage } from "../../common/interceptors/response-message.decorator";
import { SedeEmpresaPorteriaService } from "./sede-empresa-porteria.service";
import { CreateSedeEmpresaPorteriaDto } from "./dto/create-sede-empresa-porteria.dto";
import {
  SedeEmpresaPorteriaListResponseDto,
  SedeEmpresaPorteriaResponseDto,
} from "./dto/sede-empresa-porteria.response.dto";
import { ListSedeEmpresaPorteriaQueryDto } from "./dto/list-sede-empresa-porteria-query.dto";
import { UpdateSedeEmpresaPorteriaDto } from "./dto/update-sede-empresa-porteria.dto";

/** Controlador REST de asignaciones sede-empresa de seguridad restringido a super_admin exacto. */
@ApiTags("sede-empresa-porteria")
@ApiBearerAuth()
@Roles("super_admin")
@Controller("sede-empresa-porteria")
export class SedeEmpresaPorteriaController {
  /** Inyecta el servicio de asignaciones sede-empresa de seguridad. */
  constructor(private readonly sedeEmpresaPorteriaService: SedeEmpresaPorteriaService) {}

  /** Lista asignaciones sede-empresa de seguridad con paginacion, filtros y orden opcional. */
  @Get()
  @ApiOperation({ summary: "List sede-empresa-porteria with pagination, filters and sorting" })
  @ApiResponse({ status: 200, type: SedeEmpresaPorteriaListResponseDto })
  @ResponseMessage("Asignaciones sede-empresa de seguridad retrieved")
  async list(
    @Query() query: ListSedeEmpresaPorteriaQueryDto,
  ): Promise<SedeEmpresaPorteriaListResponseDto> {
    return this.sedeEmpresaPorteriaService.list(query);
  }

  /** Obtiene una asignacion sede-empresa de seguridad por identificador. */
  @Get(":id")
  @ApiOperation({ summary: "Get sede-empresa-porteria by id" })
  @ApiResponse({ status: 200, type: SedeEmpresaPorteriaResponseDto })
  @ResponseMessage("Asignacion sede-empresa de seguridad retrieved")
  async findById(@Param("id", ParseIntPipe) id: number): Promise<SedeEmpresaPorteriaResponseDto> {
    return this.sedeEmpresaPorteriaService.findById(id);
  }

  /** Crea una asignacion sede-empresa de seguridad nueva. */
  @Post()
  @ApiOperation({ summary: "Create sede-empresa-porteria" })
  @ApiResponse({ status: 201, type: SedeEmpresaPorteriaResponseDto })
  @ResponseMessage("Asignacion sede-empresa de seguridad created")
  async create(@Body() dto: CreateSedeEmpresaPorteriaDto): Promise<SedeEmpresaPorteriaResponseDto> {
    return this.sedeEmpresaPorteriaService.create(dto);
  }

  /** Actualiza parcialmente una asignacion sede-empresa de seguridad existente. */
  @Patch(":id")
  @ApiOperation({ summary: "Update sede-empresa-porteria" })
  @ApiResponse({ status: 200, type: SedeEmpresaPorteriaResponseDto })
  @ResponseMessage("Asignacion sede-empresa de seguridad updated")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateSedeEmpresaPorteriaDto,
  ): Promise<SedeEmpresaPorteriaResponseDto> {
    return this.sedeEmpresaPorteriaService.update(id, dto);
  }

  /** Desactiva una asignacion sede-empresa de seguridad. */
  @Patch(":id/deactivate")
  @ApiOperation({ summary: "Deactivate sede-empresa-porteria" })
  @ApiResponse({ status: 200, type: SedeEmpresaPorteriaResponseDto })
  @ResponseMessage("Asignacion sede-empresa de seguridad deactivated")
  async deactivate(@Param("id", ParseIntPipe) id: number): Promise<SedeEmpresaPorteriaResponseDto> {
    return this.sedeEmpresaPorteriaService.deactivate(id);
  }

  /** Reactiva una asignacion sede-empresa de seguridad. */
  @Patch(":id/activate")
  @ApiOperation({ summary: "Activate sede-empresa-porteria" })
  @ApiResponse({ status: 200, type: SedeEmpresaPorteriaResponseDto })
  @ResponseMessage("Asignacion sede-empresa de seguridad activated")
  async activate(@Param("id", ParseIntPipe) id: number): Promise<SedeEmpresaPorteriaResponseDto> {
    return this.sedeEmpresaPorteriaService.activate(id);
  }

  /** Elimina permanentemente una asignacion sede-empresa de seguridad. */
  @Delete(":id")
  @ApiOperation({ summary: "Permanently delete sede-empresa-porteria" })
  @ResponseMessage("Asignacion sede-empresa de seguridad deleted")
  async deletePermanent(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<{ id: number; deleted: true }> {
    return this.sedeEmpresaPorteriaService.deletePermanent(id);
  }
}
