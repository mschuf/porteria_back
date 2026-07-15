/**
 * @file cambiar-contrasena.dto.ts
 * @description DTO para que el usuario autenticado cambie su contraseña (cambio forzado incluido).
 */
import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

/** Cuerpo de POST /auth/cambiar-contrasena. */
export class CambiarContrasenaDto {
  @ApiProperty({ description: "Contraseña actual" })
  @IsString()
  @IsNotEmpty()
  contrasenaActual!: string;

  @ApiProperty({ description: "Nueva contraseña", minLength: 8, maxLength: 100 })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  contrasenaNueva!: string;
}
