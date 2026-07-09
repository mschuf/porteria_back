/**
 * @file empresas.controller.ts
 * @description Endpoints HTTP CRUD de empresas receptoras.
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
import { EmpresasService } from "./empresas.service";
import { CreateEmpresaDto } from "./dto/create-empresa.dto";
import { EmpresaListResponseDto, EmpresaResponseDto } from "./dto/empresa.response.dto";
import { ListEmpresasQueryDto } from "./dto/list-empresas-query.dto";
import { UpdateEmpresaDto } from "./dto/update-empresa.dto";

/** Controlador REST de empresas restringido a super_admin exacto. */
@ApiTags("empresas")
@ApiBearerAuth()
@Roles("super_admin")
@Controller("empresas")
export class EmpresasController {
  /** Inyecta el servicio de empresas. */
  constructor(private readonly empresasService: EmpresasService) {}

  /** Lista empresas con paginacion, filtros y orden opcional. */
  @Get()
  @ApiOperation({ summary: "List empresas with pagination, filters and sorting" })
  @ApiResponse({ status: 200, type: EmpresaListResponseDto })
  @ResponseMessage("Empresas retrieved")
  async list(@Query() query: ListEmpresasQueryDto): Promise<EmpresaListResponseDto> {
    return this.empresasService.list(query);
  }

  /** Obtiene una empresa por identificador. */
  @Get(":id")
  @ApiOperation({ summary: "Get empresa by id" })
  @ApiResponse({ status: 200, type: EmpresaResponseDto })
  @ResponseMessage("Empresa retrieved")
  async findById(@Param("id", ParseIntPipe) id: number): Promise<EmpresaResponseDto> {
    return this.empresasService.findById(id);
  }

  /** Crea una empresa nueva. */
  @Post()
  @ApiOperation({ summary: "Create empresa" })
  @ApiResponse({ status: 201, type: EmpresaResponseDto })
  @ResponseMessage("Empresa created")
  async create(@Body() dto: CreateEmpresaDto): Promise<EmpresaResponseDto> {
    return this.empresasService.create(dto);
  }

  /** Actualiza parcialmente una empresa existente. */
  @Patch(":id")
  @ApiOperation({ summary: "Update empresa" })
  @ApiResponse({ status: 200, type: EmpresaResponseDto })
  @ResponseMessage("Empresa updated")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateEmpresaDto,
  ): Promise<EmpresaResponseDto> {
    return this.empresasService.update(id, dto);
  }

  /** Desactiva una empresa. */
  @Patch(":id/deactivate")
  @ApiOperation({ summary: "Deactivate empresa" })
  @ApiResponse({ status: 200, type: EmpresaResponseDto })
  @ResponseMessage("Empresa deactivated")
  async deactivate(@Param("id", ParseIntPipe) id: number): Promise<EmpresaResponseDto> {
    return this.empresasService.deactivate(id);
  }

  /** Reactiva una empresa. */
  @Patch(":id/activate")
  @ApiOperation({ summary: "Activate empresa" })
  @ApiResponse({ status: 200, type: EmpresaResponseDto })
  @ResponseMessage("Empresa activated")
  async activate(@Param("id", ParseIntPipe) id: number): Promise<EmpresaResponseDto> {
    return this.empresasService.activate(id);
  }

  /** Elimina permanentemente una empresa sin relaciones. */
  @Delete(":id")
  @ApiOperation({ summary: "Permanently delete empresa" })
  @ResponseMessage("Empresa deleted")
  async deletePermanent(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<{ id: number; deleted: true }> {
    return this.empresasService.deletePermanent(id);
  }
}

