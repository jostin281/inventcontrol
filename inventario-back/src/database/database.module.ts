import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: join(process.cwd(), 'inventario.db'),
      autoLoadEntities: true,
      synchronize: true, // Solo para desarrollo
    }),
  ],
})
export class DatabaseModule {}
