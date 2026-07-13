import { ApiProperty } from "@nestjs/swagger";

export class AreaResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty() sedeId!: number;
  @ApiProperty() sedeNombre!: string;
  @ApiProperty() empresaNombre!: string;
  @ApiProperty() nombre!: string;
  @ApiProperty() activo!: boolean;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class AreaListResponseDto {
  @ApiProperty({ type: () => [AreaResponseDto] }) items!: AreaResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
}
