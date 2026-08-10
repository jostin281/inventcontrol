import 'dotenv/config';
import { DataSource } from 'typeorm';

/**
 * DataSource usado solo por la CLI de TypeORM (generar/correr migraciones).
 * La app en tiempo de ejecución usa database.module.ts (vía Nest DI), que
 * lee las mismas variables de entorno.
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'inventario',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});
