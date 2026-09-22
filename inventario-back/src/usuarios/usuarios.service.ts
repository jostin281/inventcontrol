import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Usuario } from './usuario.entity';
import { sanitizeUpdate } from '../common/sanitize-update';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly repo: Repository<Usuario>,
  ) {}

  async findAll(companyId: number) {
    const list = await this.repo.find({ where: { companyId } });
    return list.map(u => this.omitPassword(u));
  }

  async findOne(id: number, companyId: number) {
    const u = await this.repo.findOne({ where: { id, companyId } });
    if (!u) throw new NotFoundException('Usuario no encontrado');
    return this.omitPassword(u);
  }

  async create(data: Partial<Usuario> & { contrasena: string }, companyId: number) {
    if (!data.correo) {
      throw new BadRequestException('El correo es requerido');
    }
    if (!data.contrasena || typeof data.contrasena !== 'string' || data.contrasena.trim().length < 6) {
      throw new BadRequestException('La contraseña es requerida y debe tener al menos 6 caracteres');
    }
    const correoLower = data.correo.toLowerCase();
    const existe = await this.repo.findOne({ where: { correo: correoLower } });
    if (existe) {
      throw new BadRequestException('El correo ya está registrado por otro usuario');
    }

    const hash = await bcrypt.hash(data.contrasena, 10);
    const nuevo = this.repo.create({
      ...data,
      companyId,
      correo: correoLower,
      contrasena: hash,
      rol: data.rol ?? 'usuario',
    });
    const guardado = await this.repo.save(nuevo);
    return this.omitPassword(guardado);
  }

  async update(id: number, data: Partial<Usuario> & { contrasena?: string }, companyId: number) {
    const usuario = await this.repo.findOne({ where: { id, companyId } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const update: any = sanitizeUpdate(data);
    if (data.correo) {
      const correoLower = data.correo.toLowerCase();
      if (correoLower !== usuario.correo) {
        const existe = await this.repo.findOne({ where: { correo: correoLower } });
        if (existe && existe.id !== id) {
          throw new BadRequestException('El correo ya está registrado por otro usuario');
        }
      }
      update.correo = correoLower;
    }
    if (data.contrasena) {
      update.contrasena = await bcrypt.hash(data.contrasena, 10);
    }

    await this.repo.update(id, update);
    return this.findOne(id, companyId);
  }

  async remove(id: number, solicitanteId: number, companyId: number) {
    if (id === solicitanteId) throw new ForbiddenException('No puedes eliminarte a ti mismo');
    const u = await this.repo.findOne({ where: { id, companyId } });
    if (!u) throw new NotFoundException('Usuario no encontrado');
    await this.repo.delete(id);
    return { eliminado: true };
  }

  private omitPassword(u: Usuario) {
    const { contrasena, ...rest } = u;
    return rest;
  }
}
