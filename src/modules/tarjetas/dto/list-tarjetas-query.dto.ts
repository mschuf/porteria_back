import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, IsPositive, IsString } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export const TARJETA_SORT_BY = ["id", "sedeId", "numero", "color", "icono", "activo", "enUso", "createdAt"] as const;
export type TarjetaSortBy = (typeof TARJETA_SORT_BY)[number];
export const TARJETA_SORT_ORDER = ["asc", "desc"] as const;
export type TarjetaSortOrder = (typeof TARJETA_SORT_ORDER)[number];
const boolTransform = ({ value }: { value: unknown }) => value === "true" || value === "1" ? true : value === "false" || value === "0" ? false : value;

export class ListTarjetasQueryDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @IsPositive() sedeId?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @IsPositive() numero?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() icono?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @IsPositive() areaId?: number;
  @ApiPropertyOptional() @IsOptional() @Transform(boolTransform) @IsBoolean() activo?: boolean;
  @ApiPropertyOptional() @IsOptional() @Transform(boolTransform) @IsBoolean() enUso?: boolean;
  @ApiPropertyOptional({ enum: TARJETA_SORT_BY }) @IsOptional() @IsIn(TARJETA_SORT_BY) sortBy?: TarjetaSortBy;
  @ApiPropertyOptional({ enum: TARJETA_SORT_ORDER }) @IsOptional() @IsIn(TARJETA_SORT_ORDER) sortOrder?: TarjetaSortOrder;
}

export const DEFAULT_TARJETAS_PAGE_LIMIT = 15;
