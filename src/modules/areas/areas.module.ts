import { Module } from "@nestjs/common";
import { AreasController } from "./areas.controller";
import { AreasService } from "./areas.service";
import { AreasSqlRepository } from "./repositories/areas.sql-repository";

@Module({ controllers: [AreasController], providers: [AreasService, AreasSqlRepository], exports: [AreasService, AreasSqlRepository] })
export class AreasModule {}
