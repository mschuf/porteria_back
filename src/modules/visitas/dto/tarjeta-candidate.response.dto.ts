import { ApiProperty } from "@nestjs/swagger";

export const TARJETA_CANDIDATE_BLOCK_REASON = ["in_use", "different_sede", "inactive"] as const;
export type TarjetaCandidateBlockReason = (typeof TARJETA_CANDIDATE_BLOCK_REASON)[number];

export class TarjetaCandidateAreaResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty() nombre!: string;
}

/** Tarjeta visible para el selector de una visita. */
export class TarjetaCandidateResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty() numero!: number;
  @ApiProperty() sedeId!: number;
  @ApiProperty() sedeNombre!: string;
  @ApiProperty() color!: string;
  @ApiProperty() icono!: string;
  @ApiProperty({ type: () => [TarjetaCandidateAreaResponseDto] })
  areas!: TarjetaCandidateAreaResponseDto[];
  @ApiProperty() activo!: boolean;
  @ApiProperty() enUso!: boolean;
  @ApiProperty() selectable!: boolean;
  @ApiProperty({ enum: TARJETA_CANDIDATE_BLOCK_REASON, nullable: true })
  blockedReason!: TarjetaCandidateBlockReason | null;
}

export class TarjetaCandidateListResponseDto {
  @ApiProperty({ type: () => [TarjetaCandidateResponseDto] })
  items!: TarjetaCandidateResponseDto[];
}
