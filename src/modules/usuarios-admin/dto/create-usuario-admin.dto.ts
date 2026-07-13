/**
 * @file create-usuario-admin.dto.ts
 * @description DTO de validacion para la creacion de un usuario del sistema.
 */
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsArray,
  ArrayUnique,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { Type } from "class-transformer";
import type { UserRole } from "../../../common/types/authenticated-user";
import { USUARIO_ADMIN_ROLES } from "./list-usuarios-admin-query.dto";

/** Asignacion activa de empresa de porteria y sede para un usuario portero. */
export class PorteriaAssignmentDto {
  @ApiProperty()
  @IsInt()
  empresaPorteriaId!: number;

  @ApiProperty()
  @IsInt()
  sedeEmpresaPorteriaId!: number;
}

/** Cuerpo HTTP para crear un usuario del sistema. */
export class CreateUsuarioAdminDto {
  @ApiProperty({ example: "jperez" })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: "usuario solo puede contener letras, numeros, puntos, guiones y guiones bajos",
  })
  usuario!: string;

  @ApiProperty({ example: "Juan Perez" })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  nombre!: string;

  @ApiPropertyOptional({ example: "jperez@empresa.com.py" })
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  correo?: string;

  @ApiProperty({ enum: USUARIO_ADMIN_ROLES, example: "portero" })
  @IsIn(USUARIO_ADMIN_ROLES)
  rol!: UserRole;

  @ApiProperty({ example: "ContraseñaSegura123" })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ type: () => PorteriaAssignmentDto })
  @IsOptional() @ValidateNested() @Type(() => PorteriaAssignmentDto)
  porteriaAssignment?: PorteriaAssignmentDto;

  @ApiPropertyOptional({ type: [Number], description: "Sedes iniciales del admin_empresa" })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  sedeIds?: number[];
}
