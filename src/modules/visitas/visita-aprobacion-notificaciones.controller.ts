import { Controller, Get, MessageEvent, Param, ParseIntPipe, Patch, Sse } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { DisableRequestTimeout } from "../../common/interceptors/request-timeout.decorator";
import { SkipResponseEnvelope } from "../../common/interceptors/response-message.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-user";
import type { Observable } from "rxjs";
import { VisitaAprobacionNotificacionesService } from "./visita-aprobacion-notificaciones.service";

@Roles("super_admin","admin_empresa","encargado_seguridad","encargado_porteria","encargado_visita","portero")
@Controller("porteria/notificaciones-aprobacion")
export class VisitaAprobacionNotificacionesController {
  constructor(private readonly service:VisitaAprobacionNotificacionesService){}
  @Get("pendientes") pending(@CurrentUser() user:AuthenticatedUser){return this.service.pending(user.id);}
  @Patch(":id/confirmacion") confirm(@CurrentUser() user:AuthenticatedUser,@Param("id",ParseIntPipe) id:number){return this.service.confirm(user.id,id);}
  @Sse("stream") @SkipResponseEnvelope() @DisableRequestTimeout()
  stream(@CurrentUser() user:AuthenticatedUser):Observable<MessageEvent>{return this.service.stream(user.id);}
}
