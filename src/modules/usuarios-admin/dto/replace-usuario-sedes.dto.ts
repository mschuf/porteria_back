import { ApiProperty } from "@nestjs/swagger";
import { ArrayUnique, IsArray, IsInt, IsPositive } from "class-validator";

export class ReplaceUsuarioSedesDto {
  @ApiProperty({ type: [Number], example: [2, 5] })
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  sedeIds!: number[];
}
