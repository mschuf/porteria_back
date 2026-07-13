import { OmitType, PartialType } from "@nestjs/swagger";
import { CreateTarjetaDto } from "./create-tarjeta.dto";

export class UpdateTarjetaDto extends PartialType(OmitType(CreateTarjetaDto, ["sedeId"] as const)) {}
