import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, IsPositive, IsString } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export const AREA_SORT_BY = ["id", "sedeId", "nombre", "activo", "createdAt"] as const;
export type AreaSortBy = (typeof AREA_SORT_BY)[number];
export const AREA_SORT_ORDER = ["asc", "desc"] as const;
export type AreaSortOrder = (typeof AREA_SORT_ORDER)[number];

export class ListAreasQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  sedeId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === "1" ? true : value === "false" || value === "0" ? false : value)
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ enum: AREA_SORT_BY })
  @IsOptional()
  @IsIn(AREA_SORT_BY)
  sortBy?: AreaSortBy;

  @ApiPropertyOptional({ enum: AREA_SORT_ORDER })
  @IsOptional()
  @IsIn(AREA_SORT_ORDER)
  sortOrder?: AreaSortOrder;
}

export const DEFAULT_AREAS_PAGE_LIMIT = 15;
