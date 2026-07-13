import { Module } from "@nestjs/common";
import { TarjetasController } from "./tarjetas.controller";
import { TarjetasService } from "./tarjetas.service";
import { TarjetasSqlRepository } from "./repositories/tarjetas.sql-repository";

@Module({ controllers: [TarjetasController], providers: [TarjetasService, TarjetasSqlRepository], exports: [TarjetasService] })
export class TarjetasModule {}
