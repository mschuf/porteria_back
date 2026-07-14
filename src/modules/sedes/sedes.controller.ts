/**
 * @file sedes.controller.ts
 * @description Endpoints HTTP CRUD de sedes.
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
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ResponseMessage } from "../../common/interceptors/response-message.decorator";
import { SedeAccessService } from "../../common/sede-access/sede-access.service";
import type { AuthenticatedUser } from "../../common/types/authenticated-user";
import { SedesService } from "./sedes.service";
import { CreateSedeDto } from "./dto/create-sede.dto";
import { SedeListResponseDto, SedeResponseDto } from "./dto/sede.response.dto";
import { ListSedesQueryDto } from "./dto/list-sedes-query.dto";
import { UpdateSedeDto } from "./dto/update-sede.dto";

/** Controlador REST de sedes restringido a super_admin exacto. */
@ApiTags("sedes")
@ApiBearerAuth()
@Roles("super_admin")
@Controller("sedes")
export class SedesController {
  /** Inyecta el servicio de sedes. */
  constructor(
    private readonly sedesService: SedesService,
    private readonly sedeAccess: SedeAccessService,
  ) {}

  /** Lista sedes con paginacion, filtros y orden opcional. */
  @Get()
  @Roles("super_admin", "admin_empresa", "encargado_seguridad", "encargado_porteria")
  @ApiOperation({ summary: "List sedes with pagination, filters and sorting" })
  @ApiResponse({ status: 200, type: SedeListResponseDto })
  @ResponseMessage("Sedes retrieved")
  async list(
    @Query() query: ListSedesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SedeListResponseDto> {
    const sedeIds = await this.sedeAccess.resolveCardSedeIds(user);
    return this.sedesService.list(query, sedeIds);
  }

  /** Obtiene una sede por identificador. */
  @Get(":id")
  @Roles("super_admin", "admin_empresa", "encargado_seguridad", "encargado_porteria")
  @ApiOperation({ summary: "Get sede by id" })
  @ApiResponse({ status: 200, type: SedeResponseDto })
  @ResponseMessage("Sede retrieved")
  async findById(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SedeResponseDto> {
    await this.sedeAccess.assertCardSede(user, id);
    return this.sedesService.findById(id);
  }

  /** Crea una sede nueva. */
  @Post()
  @ApiOperation({ summary: "Create sede" })
  @ApiResponse({ status: 201, type: SedeResponseDto })
  @ResponseMessage("Sede created")
  async create(@Body() dto: CreateSedeDto): Promise<SedeResponseDto> {
    return this.sedesService.create(dto);
  }

  /** Actualiza parcialmente una sede existente. */
  @Patch(":id")
  @ApiOperation({ summary: "Update sede" })
  @ApiResponse({ status: 200, type: SedeResponseDto })
  @ResponseMessage("Sede updated")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateSedeDto,
  ): Promise<SedeResponseDto> {
    return this.sedesService.update(id, dto);
  }

  /** Desactiva una sede. */
  @Patch(":id/deactivate")
  @ApiOperation({ summary: "Deactivate sede" })
  @ApiResponse({ status: 200, type: SedeResponseDto })
  @ResponseMessage("Sede deactivated")
  async deactivate(@Param("id", ParseIntPipe) id: number): Promise<SedeResponseDto> {
    return this.sedesService.deactivate(id);
  }

  /** Reactiva una sede. */
  @Patch(":id/activate")
  @ApiOperation({ summary: "Activate sede" })
  @ApiResponse({ status: 200, type: SedeResponseDto })
  @ResponseMessage("Sede activated")
  async activate(@Param("id", ParseIntPipe) id: number): Promise<SedeResponseDto> {
    return this.sedesService.activate(id);
  }

  /** Elimina permanentemente una sede sin relaciones. */
  @Delete(":id")
  @ApiOperation({ summary: "Permanently delete sede" })
  @ResponseMessage("Sede deleted")
  async deletePermanent(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<{ id: number; deleted: true }> {
    return this.sedesService.deletePermanent(id);
  }
}
