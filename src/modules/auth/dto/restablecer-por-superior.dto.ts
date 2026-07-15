/**
 * @file restablecer-por-superior.dto.ts
 * @description DTO para que un superior confirme el reseteo de un subordinado con un token.
 */
import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

/** Cuerpo de POST /auth/restablecer-por-superior. */
export class RestablecerPorSuperiorDto {
  @ApiProperty({ description: "Token de reseteo recibido por el superior" })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
