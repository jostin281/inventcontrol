import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Usuario } from './usuario.entity';

/**
 * Crea un usuario admin de prueba la primera vez que la app arranca contra
 * una base de datos vacía (tabla "usuarios" sin filas).
 *
 * Sin esto, `docker compose up --build` deja la base de datos con el
 * esquema creado (por la migración) pero sin ningún usuario, y la única
 * forma de entrar sería llamando a mano a POST /api/auth/registro. Con
 * este seed, el sistema queda 100% listo para usar apenas levanta.
 *
 * Es idempotente y seguro de dejar corriendo siempre: si ya existe al
 * menos un usuario (el admin sembrado, o cualquier otro creado desde la
 * app), no hace absolutamente nada. Nunca modifica ni borra datos.
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Seed');

  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const totalUsuarios = await this.usuarioRepo.count();
    if (totalUsuarios > 0) return;

    const correo = this.config.get<string>('SEED_ADMIN_EMAIL', 'admin@invencontrol.com');
    const contrasena = this.config.get<string>('SEED_ADMIN_PASSWORD', 'Admin123!');
    const nombre = this.config.get<string>('SEED_ADMIN_NOMBRE', 'Administrador');

    const hash = await bcrypt.hash(contrasena, 10);
    const admin = this.usuarioRepo.create({
      nombre,
      correo: correo.toLowerCase(),
      contrasena: hash,
      rol: 'admin',
      nombreNegocio: 'Mi Negocio',
      activo: true,
    });

    const guardado = await this.usuarioRepo.save(admin);

    // El admin usa su propio id como companyId (misma regla que en el
    // registro normal, ver AuthService.registro).
    guardado.companyId = guardado.id;
    await this.usuarioRepo.save(guardado);

    this.logger.log(
      `🌱 Base de datos vacía: se creó un usuario admin de prueba → correo: ${correo} / contraseña: ${contrasena}`,
    );
    this.logger.warn(
      'Este usuario es solo para pruebas. Define SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD en tu .env antes de usar esto en producción real, o crea tu propio usuario y borra este.',
    );
  }
}
