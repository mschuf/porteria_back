import { Body,Controller,Get,Param,ParseIntPipe,Patch,Query,UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/auth.guard";
import { EncargadoVisitaGuard } from "../../common/guards/encargado-visita.guard";
import type { AuthenticatedUser } from "../../common/types/authenticated-user";
import { ListEncargadoVisitaQueryDto } from "./dto/list-encargado-visita-query.dto";
import { UpdateVisitaAprobacionDto } from "./dto/update-visita-aprobacion.dto";
import { EncargadoVisitaVisitasService } from "./encargado-visita-visitas.service";

@UseGuards(JwtAuthGuard,EncargadoVisitaGuard)
@Controller("encargado-visita/visitas")
export class EncargadoVisitaVisitasController{
  constructor(private readonly service:EncargadoVisitaVisitasService){}
  @Get("resumen") summary(@CurrentUser() user:AuthenticatedUser){return this.service.summary(user);}
  @Get("historial") history(@CurrentUser() user:AuthenticatedUser,@Query() query:ListEncargadoVisitaQueryDto){return this.service.history(user,query);}
  @Get(":id") find(@CurrentUser() user:AuthenticatedUser,@Param("id",ParseIntPipe) id:number){return this.service.find(user,id);}
  @Patch(":id/aprobacion") decide(@CurrentUser() user:AuthenticatedUser,@Param("id",ParseIntPipe) id:number,@Body() dto:UpdateVisitaAprobacionDto){return this.service.decide(user,id,dto.estadoAprobacion);}
}
