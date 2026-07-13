import { ApiProperty } from "@nestjs/swagger";
import { AreaResponseDto } from "../../areas/dto/area.response.dto";

export class TarjetaResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty() sedeId!: number;
  @ApiProperty() sedeNombre!: string;
  @ApiProperty() empresaNombre!: string;
  @ApiProperty() numero!: number;
  @ApiProperty() color!: string;
  @ApiProperty() icono!: string;
  @ApiProperty() activo!: boolean;
  @ApiProperty() enUso!: boolean;
  @ApiProperty({ type: () => [AreaResponseDto] }) areas!: AreaResponseDto[];
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class TarjetaListResponseDto {
  @ApiProperty({ type: () => [TarjetaResponseDto] }) items!: TarjetaResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
}
