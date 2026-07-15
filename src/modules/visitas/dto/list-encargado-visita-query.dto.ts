import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";
import { ListVisitasQueryDto } from "./list-visitas-query.dto";
import { VISITA_APROBACION, type VisitaAprobacion } from "../domain/visita-aprobacion";

export class ListEncargadoVisitaQueryDto extends ListVisitasQueryDto {
  @ApiPropertyOptional({ enum: VISITA_APROBACION })
  @IsOptional()
  @IsIn(VISITA_APROBACION)
  estadoAprobacion?: VisitaAprobacion;
}
