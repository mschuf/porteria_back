/**
 * @file visita.response.dto.ts
 * @description DTOs de respuesta de visita individual y listado paginado.
 */
import { ApiProperty } from "@nestjs/swagger";
import { VISITA_ESTADO, type VisitaEstado } from "../domain/visita-estado";
import { VISITA_SEGUIMIENTO, type VisitaSeguimiento } from "../domain/visita-seguimiento";
import { VISITA_TARJETA_COLOR, type VisitaTarjetaColor } from "../domain/visita-tarjeta-color";
import { VISITA_ZONA, type VisitaZona } from "../domain/visita-zona";
import { VISITA_APROBACION, type VisitaAprobacion } from "../domain/visita-aprobacion";

/** Representación serializable de una visita para la API. */
export class VisitaResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  personaId!: number;

  @ApiProperty({ example: "Maria Gonzalez" })
  visitante!: string;

  @ApiProperty({ example: false, description: "Indica si la persona visitante tiene foto almacenada." })
  hasFoto!: boolean;

  @ApiProperty({ example: false, description: "Indica si la visita tiene foto capturada al ingreso." })
  hasVisitaFoto!: boolean;

  @ApiProperty({ example: "30.123.456" })
  documento!: string;

  @ApiProperty({ nullable: true, example: "Logistica Norte SA" })
  empresa!: string | null;

  @ApiProperty({ example: 1 })
  sedeId!: number;

  @ApiProperty({ example: "Planta Central" })
  sedeNombre!: string;

  @ApiProperty({ example: "Entrega de materiales" })
  motivo!: string;

  @ApiProperty({ nullable: true, example: 1 })
  motivoVisitaId!: number | null;

  @ApiProperty({ example: 10 })
  responsableId!: number;

  @ApiProperty({ example: "Juan Perez" })
  responsableNombre!: string;

  @ApiProperty({ example: 7 })
  usuarioCreadorId!: number;

  @ApiProperty({ example: "Portero Central" })
  usuarioCreadorNombre!: string;

  @ApiProperty({ enum: VISITA_ESTADO, example: "activa" })
  estado!: VisitaEstado;

  @ApiProperty({ enum: VISITA_APROBACION, example: "aprobada" })
  estadoAprobacion!: VisitaAprobacion;

  @ApiProperty({ nullable: true, maxLength: 250, example: "No se autorizó el acceso." })
  motivoRechazo!: string | null;

  @ApiProperty({ nullable: true, enum: VISITA_SEGUIMIENTO })
  estadoSeguimiento!: VisitaSeguimiento | null;

  @ApiProperty({ type: [String], example: ["porteria", "fabrica"] })
  zonasPermitidas!: VisitaZona[];

  @ApiProperty({ nullable: true, example: "T-1024" })
  credencialNumero!: string | null;

  @ApiProperty({ nullable: true, enum: VISITA_TARJETA_COLOR, example: "rojo" })
  tarjetaColor!: VisitaTarjetaColor | null;

  @ApiProperty({ nullable: true })
  entradaAt!: string | null;

  @ApiProperty({ nullable: true })
  salidaAt!: string | null;

  @ApiProperty({ nullable: true })
  observaciones!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

/** Contenedor paginado de visitas para respuestas HTTP. */
export class VisitaListResponseDto {
  @ApiProperty({ type: () => [VisitaResponseDto] })
  items!: VisitaResponseDto[];

  @ApiProperty({ example: 1 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 15 })
  limit!: number;
}
