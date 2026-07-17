import { Injectable } from "@nestjs/common";
import type { PoolClient } from "pg";
import { PostgresService } from "../../postgres/postgres.service";
import type { VisitaAprobacionDecision } from "../dto/update-visita-aprobacion.dto";
import type { VisitaListRow } from "../visitas.types";
import type { VisitaAprobacionConfirmacionRow, VisitaAprobacionNotificacionRow } from "../visita-aprobacion-notificaciones.types";

@Injectable()
export class VisitaAprobacionNotificacionesSqlRepository {
  constructor(private readonly postgres: PostgresService) {}

  async createForVisitRecipients(
    visit: VisitaListRow,
    decision: VisitaAprobacionDecision,
    reason: string | null,
    actorUserId: number,
    client: PoolClient,
  ): Promise<VisitaAprobacionNotificacionRow[]> {
    const result = await client.query<VisitaAprobacionNotificacionRow>(
      `WITH notification_group AS (
         SELECT nextval('public.visita_aprobacion_notificacion_grupo_seq') AS id
       ), recipients AS (
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
          WHERE u.id=$2 AND u.activo=true
         UNION
         SELECT u.id
           FROM public.usuario u
          WHERE u.id=$8 AND u.id<>$9 AND u.activo=true
       )
       INSERT INTO public.visita_aprobacion_notificacion (
         grupo_decision_id,visita_id,usuario_destinatario_id,estado_aprobacion,motivo_rechazo,
         visitante_nombre,sede_nombre
       )
       SELECT notification_group.id,$3,recipients.id,$4,$5,$6,$7
         FROM recipients CROSS JOIN notification_group
       RETURNING *`,
      [visit.sede_id,visit.usuario_creador_id,visit.id,decision,reason,visit.visitante,visit.sede_nombre,visit.responsable_usuario_id,actorUserId],
    );
    return result.rows;
  }

  async findPending(userId: number): Promise<VisitaAprobacionNotificacionRow[]> {
    return this.postgres.query<VisitaAprobacionNotificacionRow>(
      `SELECT * FROM public.visita_aprobacion_notificacion
        WHERE usuario_destinatario_id=$1
          AND confirmado_en IS NULL
          AND NOT EXISTS (
            SELECT 1
              FROM public.visita_aprobacion_notificacion sibling
             WHERE sibling.grupo_decision_id=visita_aprobacion_notificacion.grupo_decision_id
               AND sibling.confirmado_en IS NOT NULL
          )
        ORDER BY creado_en ASC,id ASC`, [userId],
    );
  }

  async confirm(userId: number, id: number): Promise<VisitaAprobacionConfirmacionRow | null> {
    const rows = await this.postgres.query<{ grupo_decision_id: string; destinatario_ids: string[] }>(
      `WITH target AS (
         SELECT grupo_decision_id
           FROM public.visita_aprobacion_notificacion
          WHERE id=$1 AND usuario_destinatario_id=$2
       ), updated AS (
         UPDATE public.visita_aprobacion_notificacion notification
            SET confirmado_en=COALESCE(notification.confirmado_en,now())
           FROM target
          WHERE notification.grupo_decision_id=target.grupo_decision_id
         RETURNING notification.grupo_decision_id,notification.usuario_destinatario_id
       )
       SELECT grupo_decision_id,
              array_agg(usuario_destinatario_id ORDER BY usuario_destinatario_id) AS destinatario_ids
         FROM updated
        GROUP BY grupo_decision_id`, [id,userId],
    );
    const row=rows[0];
    return row ? {
      grupoDecisionId:Number(row.grupo_decision_id),
      destinatarioIds:row.destinatario_ids.map(Number),
    } : null;
  }
}
