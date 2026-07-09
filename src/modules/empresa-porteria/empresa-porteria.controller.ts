/**
 * @file empresa-porteria.controller.ts
 * @description Endpoints HTTP CRUD de empresas de porteria (seguridad).
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
import { EmpresaPorteriaService } from "./empresa-porteria.service";
import { CreateEmpresaPorteriaDto } from "./dto/create-empresa-porteria.dto";
import {
  EmpresaPorteriaListResponseDto,
  EmpresaPorteriaResponseDto,
} from "./dto/empresa-porteria.response.dto";
import { ListEmpresaPorteriaQueryDto } from "./dto/list-empresa-porteria-query.dto";
import { UpdateEmpresaPorteriaDto } from "./dto/update-empresa-porteria.dto";

/** Controlador REST de empresas de porteria restringido a super_admin exacto. */
@ApiTags("empresa-porteria")
@ApiBearerAuth()
@Roles("super_admin")
@Controller("empresa-porteria")
export class EmpresaPorteriaController {
  /** Inyecta el servicio de empresas de porteria. */
  constructor(private readonly empresaPorteriaService: EmpresaPorteriaService) {}

  /** Lista empresas de porteria con paginacion, filtros y orden opcional. */
  @Get()
  @ApiOperation({ summary: "List empresa-porteria with pagination, filters and sorting" })
  @ApiResponse({ status: 200, type: EmpresaPorteriaListResponseDto })
  @ResponseMessage("Empresas de porteria retrieved")
  async list(@Query() query: ListEmpresaPorteriaQueryDto): Promise<EmpresaPorteriaListResponseDto> {
    return this.empresaPorteriaService.list(query);
  }

  /** Obtiene una empresa de porteria por identificador. */
  @Get(":id")
  @ApiOperation({ summary: "Get empresa-porteria by id" })
  @ApiResponse({ status: 200, type: EmpresaPorteriaResponseDto })
  @ResponseMessage("Empresa de porteria retrieved")
  async findById(@Param("id", ParseIntPipe) id: number): Promise<EmpresaPorteriaResponseDto> {
    return this.empresaPorteriaService.findById(id);
  }

  /** Crea una empresa de porteria nueva. */
  @Post()
  @ApiOperation({ summary: "Create empresa-porteria" })
  @ApiResponse({ status: 201, type: EmpresaPorteriaResponseDto })
  @ResponseMessage("Empresa de porteria created")
  async create(@Body() dto: CreateEmpresaPorteriaDto): Promise<EmpresaPorteriaResponseDto> {
    return this.empresaPorteriaService.create(dto);
  }

  /** Actualiza parcialmente una empresa de porteria existente. */
  @Patch(":id")
  @ApiOperation({ summary: "Update empresa-porteria" })
  @ApiResponse({ status: 200, type: EmpresaPorteriaResponseDto })
  @ResponseMessage("Empresa de porteria updated")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateEmpresaPorteriaDto,
  ): Promise<EmpresaPorteriaResponseDto> {
    return this.empresaPorteriaService.update(id, dto);
  }

  /** Desactiva una empresa de porteria. */
  @Patch(":id/deactivate")
  @ApiOperation({ summary: "Deactivate empresa-porteria" })
  @ApiResponse({ status: 200, type: EmpresaPorteriaResponseDto })
  @ResponseMessage("Empresa de porteria deactivated")
  async deactivate(@Param("id", ParseIntPipe) id: number): Promise<EmpresaPorteriaResponseDto> {
    return this.empresaPorteriaService.deactivate(id);
  }

  /** Reactiva una empresa de porteria. */
  @Patch(":id/activate")
  @ApiOperation({ summary: "Activate empresa-porteria" })
  @ApiResponse({ status: 200, type: EmpresaPorteriaResponseDto })
  @ResponseMessage("Empresa de porteria activated")
  async activate(@Param("id", ParseIntPipe) id: number): Promise<EmpresaPorteriaResponseDto> {
    return this.empresaPorteriaService.activate(id);
  }

  /** Elimina permanentemente una empresa de porteria sin relaciones. */
  @Delete(":id")
  @ApiOperation({ summary: "Permanently delete empresa-porteria" })
  @ResponseMessage("Empresa de porteria deleted")
  async deletePermanent(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<{ id: number; deleted: true }> {
    return this.empresaPorteriaService.deletePermanent(id);
  }
}
