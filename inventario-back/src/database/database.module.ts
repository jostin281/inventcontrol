import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER', 'postgres'),
        password: config.get<string>('DB_PASSWORD', 'postgres'),
        database: config.get<string>('DB_NAME', 'inventario'),
        autoLoadEntities: true,
        // En producción el esquema se gestiona con migraciones, nunca con
        // synchronize (podría borrar/alterar datos reales sin control).
        synchronize: config.get<string>('NODE_ENV') !== 'production',
        // Corre las migraciones pendientes automáticamente al arrancar en
        // producción (útil en Docker: no hace falta un paso manual aparte).
        migrationsRun: config.get<string>('NODE_ENV') === 'production',
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        ssl: config.get<string>('DB_SSL') === 'true'
          ? { rejectUnauthorized: false }
          : false,
      }),
    }),
  ],
})
export class DatabaseModule {}
