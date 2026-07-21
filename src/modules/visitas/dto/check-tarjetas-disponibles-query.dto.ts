import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsPositive } from "class-validator";

/** Parámetros para comprobar si existe alguna tarjeta disponible. */
export class CheckTarjetasDisponiblesQueryDto {
  @ApiPropertyOptional({ description: "Sede para la que se registrará la visita" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  visitaSedeId?: number;
}
