import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { AreasService } from "./areas.service";
import { CreateAreaDto } from "./dto/create-area.dto";
import { ListAreasQueryDto } from "./dto/list-areas-query.dto";
import { UpdateAreaDto } from "./dto/update-area.dto";

@ApiTags("areas") @ApiBearerAuth() @Roles("super_admin") @Controller("areas")
export class AreasController {
  constructor(private readonly service: AreasService) {}
  @Get() list(@Query() query: ListAreasQueryDto) { return this.service.list(query); }
  @Get(":id") find(@Param("id", ParseIntPipe) id: number) { return this.service.findById(id); }
  @Post() create(@Body() dto: CreateAreaDto) { return this.service.create(dto); }
  @Patch(":id") update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateAreaDto) { return this.service.update(id, dto); }
  @Patch(":id/activate") activate(@Param("id", ParseIntPipe) id: number) { return this.service.activate(id); }
  @Patch(":id/deactivate") deactivate(@Param("id", ParseIntPipe) id: number) { return this.service.deactivate(id); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number) { return this.service.delete(id); }
}
