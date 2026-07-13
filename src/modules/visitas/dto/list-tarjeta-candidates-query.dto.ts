import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsPositive, IsString, MaxLength, Min } from "class-validator";

/** Parámetros del buscador de tarjetas disponible en el formulario de visitas. */
export class ListTarjetaCandidatesQueryDto {
  @ApiPropertyOptional({ description: "Texto parcial del número de tarjeta" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  search?: string;

  @ApiPropertyOptional({ description: "Número exacto, usado para resolver el escáner" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  numero?: number;

  @ApiPropertyOptional({ description: "Sede actualmente seleccionada para la visita" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  visitaSedeId?: number;

  @ApiPropertyOptional({ description: "Visita que no debe ocupar su propia tarjeta" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  excludeVisitaId?: number;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
