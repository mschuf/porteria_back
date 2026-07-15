import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";

export const VISITA_APROBACION_DECISION = ["aprobada", "rechazada"] as const;
export type VisitaAprobacionDecision = (typeof VISITA_APROBACION_DECISION)[number];

export class UpdateVisitaAprobacionDto {
  @ApiProperty({ enum: VISITA_APROBACION_DECISION })
  @IsIn(VISITA_APROBACION_DECISION)
  estadoAprobacion!: VisitaAprobacionDecision;
}
