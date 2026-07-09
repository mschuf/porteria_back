/**
 * @file reset-password.dto.ts
 * @description DTO de validacion para el restablecimiento de contraseña de un usuario.
 */
import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

/** Cuerpo HTTP para resetear la contraseña de un usuario. */
export class ResetPasswordDto {
  @ApiProperty({ example: "NuevaContraseña123" })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;
}
