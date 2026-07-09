/**
 * @file me.response.dto.ts
 * @description DTO de respuesta del perfil del usuario autenticado (`GET /users/me`).
 */
import { ApiProperty } from "@nestjs/swagger";

/** Perfil del usuario autenticado con rol local. */
export class MeResponseDto {
  @ApiProperty({ example: 188 })
  id!: number;

  @ApiProperty({ example: "jdoe" })
  login!: string;

  @ApiProperty({ example: "Juan P├®rez" })
  name!: string;

  @ApiProperty({ nullable: true })
  email!: string | null;

  @ApiProperty({ enum: ["super_admin", "admin_empresa", "portero"], example: "portero" })
  role!: "super_admin" | "admin_empresa" | "portero";
}
