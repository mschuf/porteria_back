import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayNotEmpty, ArrayUnique, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsPositive, IsString, Matches } from "class-validator";
import { TARJETA_ICONOS, type TarjetaIcono } from "../domain/tarjeta-iconos";

export class CreateTarjetaDto {
  @ApiProperty({ example: 1 }) @Type(() => Number) @IsInt() @IsPositive() sedeId!: number;
  @ApiProperty({ example: 25 }) @Type(() => Number) @IsInt() @IsPositive() numero!: number;
  @ApiProperty({ example: "#2563EB" }) @IsString() @Matches(/^#[0-9A-Fa-f]{6}$/) color!: string;
  @ApiProperty({ enum: TARJETA_ICONOS }) @IsIn(TARJETA_ICONOS) icono!: TarjetaIcono;
  @ApiProperty({ type: [Number] }) @IsArray() @ArrayNotEmpty() @ArrayUnique() @IsInt({ each: true }) @IsPositive({ each: true }) areaIds!: number[];
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() activo?: boolean;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() enUso?: boolean;
}
