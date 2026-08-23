import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './usuario.entity';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';
import { SeedService } from './seed.service';
import { OrganizacionService } from './organizacion.service';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario])],
  providers: [UsuariosService, SeedService, OrganizacionService],
  controllers: [UsuariosController],
  exports: [UsuariosService],
})
export class UsuariosModule {}
