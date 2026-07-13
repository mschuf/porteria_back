/**
 * @file postgres.service.ts
 * @description Servicio de acceso SQL a PostgreSQL con consultas simples y ping de salud.
 */
import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import type { Pool, PoolClient, QueryResultRow } from "pg";
import { POSTGRES_POOL } from "./postgres.constants";

/**
 * Wrapper del pool PostgreSQL para consultas parametrizadas.
 */
@Injectable()
export class PostgresService implements OnModuleDestroy {
  /** Inyecta el pool PostgreSQL compartido. */
  constructor(@Inject(POSTGRES_POOL) private readonly pool: Pool) {}

  /**
   * Ejecuta una consulta parametrizada y devuelve las filas resultantes.
   * @param sql - Sentencia SQL con placeholders `$1`, `$2`, etc.
   * @param params - Valores de los parámetros en orden.
   * @returns Filas tipadas como `QueryResultRow`.
   */
  async query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]> {
    const result = await this.pool.query<T>(sql, params);
    return result.rows;
  }

  /**
   * Verifica conectividad ejecutando `SELECT 1`.
   * @returns Promesa resuelta si el pool responde.
   * @throws Error de conexión PostgreSQL si el ping falla.
   */
  async ping(): Promise<void> {
    await this.pool.query("SELECT 1");
  }

  /** Ejecuta una operacion atomica usando un cliente dedicado del pool. */
  async transaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await operation(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cierra el pool al destruir el módulo.
   * @returns Promesa resuelta cuando el pool finaliza.
   */
  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
