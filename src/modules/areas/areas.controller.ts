import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-user";
import { AreasService } from "./areas.service";
import { CreateAreaDto } from "./dto/create-area.dto";
import { ListAreasQueryDto } from "./dto/list-areas-query.dto";
import { UpdateAreaDto } from "./dto/update-area.dto";
@ApiTags("areas") @ApiBearerAuth() @Roles("super_admin", "admin_empresa", "encargado_seguridad", "encargado_porteria") @Controller("areas")
export class AreasController { constructor(private readonly service: AreasService) {}
  @Get() list(@CurrentUser() u: AuthenticatedUser, @Query() q: ListAreasQueryDto) { return this.service.list(u, q); }
  @Get(":id") find(@CurrentUser() u: AuthenticatedUser, @Param("id", ParseIntPipe) id: number) { return this.service.findById(u, id); }
  @Post() @Roles("super_admin", "admin_empresa") create(@CurrentUser() u: AuthenticatedUser, @Body() dto: CreateAreaDto) { return this.service.create(u, dto); }
  @Patch(":id") @Roles("super_admin", "admin_empresa") update(@CurrentUser() u: AuthenticatedUser, @Param("id", ParseIntPipe) id: number, @Body() dto: UpdateAreaDto) { return this.service.update(u, id, dto); }
  @Patch(":id/activate") @Roles("super_admin", "admin_empresa") activate(@CurrentUser() u: AuthenticatedUser, @Param("id", ParseIntPipe) id: number) { return this.service.activate(u, id); }
  @Patch(":id/deactivate") @Roles("super_admin", "admin_empresa") deactivate(@CurrentUser() u: AuthenticatedUser, @Param("id", ParseIntPipe) id: number) { return this.service.deactivate(u, id); }
  @Delete(":id") @Roles("super_admin", "admin_empresa") delete(@CurrentUser() u: AuthenticatedUser, @Param("id", ParseIntPipe) id: number) { return this.service.delete(u, id); }
}
