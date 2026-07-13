import { Global, Module } from "@nestjs/common";
import { PostgresModule } from "../../modules/postgres/postgres.module";
import { SedeAccessService } from "./sede-access.service";

@Global()
@Module({ imports: [PostgresModule], providers: [SedeAccessService], exports: [SedeAccessService] })
export class SedeAccessModule {}
