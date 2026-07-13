import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-user";
import { CreateTarjetaDto } from "./dto/create-tarjeta.dto";
import { ListTarjetasQueryDto } from "./dto/list-tarjetas-query.dto";
import { UpdateTarjetaDto } from "./dto/update-tarjeta.dto";
import { TarjetasService } from "./tarjetas.service";
@ApiTags("tarjetas") @ApiBearerAuth() @Roles("super_admin", "admin_empresa") @Controller("tarjetas")
export class TarjetasController { constructor(private readonly service: TarjetasService) {}
  @Get() list(@CurrentUser() u: AuthenticatedUser, @Query() q: ListTarjetasQueryDto) { return this.service.list(u, q); }
  @Get(":id") find(@CurrentUser() u: AuthenticatedUser, @Param("id", ParseIntPipe) id: number) { return this.service.findById(u, id); }
  @Post() create(@CurrentUser() u: AuthenticatedUser, @Body() dto: CreateTarjetaDto) { return this.service.create(u, dto); }
  @Patch(":id") update(@CurrentUser() u: AuthenticatedUser, @Param("id", ParseIntPipe) id: number, @Body() dto: UpdateTarjetaDto) { return this.service.update(u, id, dto); }
  @Patch(":id/activate") activate(@CurrentUser() u: AuthenticatedUser, @Param("id", ParseIntPipe) id: number) { return this.service.activate(u, id); }
  @Patch(":id/deactivate") deactivate(@CurrentUser() u: AuthenticatedUser, @Param("id", ParseIntPipe) id: number) { return this.service.deactivate(u, id); }
  @Delete(":id") delete(@CurrentUser() u: AuthenticatedUser, @Param("id", ParseIntPipe) id: number) { return this.service.delete(u, id); }
}
