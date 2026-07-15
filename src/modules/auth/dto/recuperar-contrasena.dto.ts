/**
 * @file recuperar-contrasena.dto.ts
 * @description DTO de entrada para solicitar la recuperación de contraseña.
 */
import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

/** Cuerpo de POST /auth/recuperar-contrasena. */
export class RecuperarContrasenaDto {
  @ApiProperty({
    description: "Usuario (login) o correo electrónico de la cuenta a recuperar",
    example: "nombre.apellido",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  identificador!: string;
}
