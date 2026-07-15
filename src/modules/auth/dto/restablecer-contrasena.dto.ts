/**
 * @file restablecer-contrasena.dto.ts
 * @description DTO para restablecer la contraseña con un token recibido por correo.
 */
import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

/** Cuerpo de POST /auth/restablecer-contrasena. */
export class RestablecerContrasenaDto {
  @ApiProperty({ description: "Token de restablecimiento recibido por correo" })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ description: "Nueva contraseña", minLength: 8, maxLength: 100 })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  contrasena!: string;
}
