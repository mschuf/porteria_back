/**
 * @file update-usuario-admin.dto.ts
 * @description DTO de validacion para actualizacion parcial de un usuario existente.
 */
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateNested } from "class-validator";
import type { UserRole } from "../../../common/types/authenticated-user";
import { USUARIO_ADMIN_ROLES } from "./list-usuarios-admin-query.dto";
import { PorteriaAssignmentDto } from "./create-usuario-admin.dto";

/** Cuerpo HTTP para actualizar un usuario existente. */
export class UpdateUsuarioAdminDto {
  @ApiPropertyOptional({ example: "jperez" })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: "usuario solo puede contener letras, numeros, puntos, guiones y guiones bajos",
  })
  usuario?: string;

  @ApiPropertyOptional({ example: "Juan Perez" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  nombre?: string;

  @ApiPropertyOptional({ example: "jperez@empresa.com.py" })
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  correo?: string;

  @ApiPropertyOptional({ enum: USUARIO_ADMIN_ROLES, example: "portero" })
  @IsOptional()
  @IsIn(USUARIO_ADMIN_ROLES)
  rol?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ type: () => PorteriaAssignmentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PorteriaAssignmentDto)
  porteriaAssignment?: PorteriaAssignmentDto;
}
