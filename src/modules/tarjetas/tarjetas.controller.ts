import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { CreateTarjetaDto } from "./dto/create-tarjeta.dto";
import { ListTarjetasQueryDto } from "./dto/list-tarjetas-query.dto";
import { UpdateTarjetaDto } from "./dto/update-tarjeta.dto";
import { TarjetasService } from "./tarjetas.service";

@ApiTags("tarjetas") @ApiBearerAuth() @Roles("super_admin") @Controller("tarjetas")
export class TarjetasController {
  constructor(private readonly service: TarjetasService) {}
  @Get() list(@Query() query: ListTarjetasQueryDto) { return this.service.list(query); }
  @Get(":id") find(@Param("id", ParseIntPipe) id: number) { return this.service.findById(id); }
  @Post() create(@Body() dto: CreateTarjetaDto) { return this.service.create(dto); }
  @Patch(":id") update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateTarjetaDto) { return this.service.update(id, dto); }
  @Patch(":id/activate") activate(@Param("id", ParseIntPipe) id: number) { return this.service.activate(id); }
  @Patch(":id/deactivate") deactivate(@Param("id", ParseIntPipe) id: number) { return this.service.deactivate(id); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number) { return this.service.delete(id); }
}
