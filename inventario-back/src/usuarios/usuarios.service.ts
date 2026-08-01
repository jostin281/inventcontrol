import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Usuario } from './usuario.entity';

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
    const hash = await bcrypt.hash(data.contrasena, 10);
    const nuevo = this.repo.create({
      ...data,
      companyId,
      correo: data.correo?.toLowerCase(),
      contrasena: hash,
      rol: data.rol ?? 'usuario',
    });
    const guardado = await this.repo.save(nuevo);
    return this.omitPassword(guardado);
  }

  async update(id: number, data: Partial<Usuario> & { contrasena?: string }, companyId: number) {
    const usuario = await this.repo.findOne({ where: { id, companyId } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const update: any = { ...data };
    if (data.correo) update.correo = data.correo.toLowerCase();
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
