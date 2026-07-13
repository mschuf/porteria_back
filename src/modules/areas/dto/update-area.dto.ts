import { OmitType, PartialType } from "@nestjs/swagger";
import { CreateAreaDto } from "./create-area.dto";

export class UpdateAreaDto extends PartialType(OmitType(CreateAreaDto, ["sedeId"] as const)) {}
