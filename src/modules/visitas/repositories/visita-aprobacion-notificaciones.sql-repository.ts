import { Injectable } from "@nestjs/common";
import type { PoolClient } from "pg";
import { PostgresService } from "../../postgres/postgres.service";
import type { VisitaAprobacionDecision } from "../dto/update-visita-aprobacion.dto";
import type { VisitaListRow } from "../visitas.types";
import type { VisitaAprobacionNotificacionRow } from "../visita-aprobacion-notificaciones.types";

@Injectable()
export class VisitaAprobacionNotificacionesSqlRepository {
  constructor(private readonly postgres: PostgresService) {}

  async createForVisitRecipients(
    visit: VisitaListRow,
    decision: VisitaAprobacionDecision,
    reason: string | null,
    client: PoolClient,
  ): Promise<VisitaAprobacionNotificacionRow[]> {
    const result = await client.query<VisitaAprobacionNotificacionRow>(
      `WITH recipients AS (
         SELECT DISTINCT u.id
           FROM public.usuario u
           JOIN public.usuario_empresa_seguridad ues
             ON ues.usuario_id=u.id AND ues.activo=true
           JOIN public.sede_empresa_seguridad ses
             ON ses.id=ues.sede_empresa_seguridad_id
            AND ses.empresa_seguridad_id=ues.empresa_seguridad_id
            AND ses.activo=true
          WHERE u.activo=true
            AND u.rol IN ('portero','encargado_porteria')
            AND ses.sede_id=$1
            AND ses.asignado_desde <= now()
            AND (ses.asignado_hasta IS NULL OR ses.asignado_hasta >= now())
         UNION
         SELECT u.id
           FROM public.usuario u
          WHERE u.id=$2 AND u.activo=true AND u.rol IN ('portero','encargado_porteria')
       )
       INSERT INTO public.visita_aprobacion_notificacion (
         visita_id,usuario_destinatario_id,estado_aprobacion,motivo_rechazo,
         visitante_nombre,sede_nombre
       )
       SELECT $3,id,$4,$5,$6,$7 FROM recipients
       RETURNING *`,
      [visit.sede_id,visit.usuario_creador_id,visit.id,decision,reason,visit.visitante,visit.sede_nombre],
    );
    return result.rows;
  }

  async findPending(userId: number): Promise<VisitaAprobacionNotificacionRow[]> {
    return this.postgres.query<VisitaAprobacionNotificacionRow>(
      `SELECT * FROM public.visita_aprobacion_notificacion
        WHERE usuario_destinatario_id=$1 AND confirmado_en IS NULL
        ORDER BY creado_en ASC,id ASC`, [userId],
    );
  }

  async confirm(userId: number, id: number): Promise<boolean> {
    const rows = await this.postgres.query<{ id: string }>(
      `UPDATE public.visita_aprobacion_notificacion
          SET confirmado_en=COALESCE(confirmado_en,now())
        WHERE id=$1 AND usuario_destinatario_id=$2
        RETURNING id`, [id,userId],
    );
    return rows.length > 0;
  }
}
