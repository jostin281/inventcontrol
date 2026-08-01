import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categoria } from './categoria.entity';

@Injectable()
export class CategoriasService {
  constructor(
    @InjectRepository(Categoria)
    private readonly repo: Repository<Categoria>,
  ) {}

  findAll(companyId: number): Promise<Categoria[]> {
    return this.repo.find({ where: { companyId }, order: { nombre: 'ASC' } });
  }

  async findOne(id: number, companyId: number): Promise<Categoria> {
    const c = await this.repo.findOne({ where: { id, companyId } });
    if (!c) throw new NotFoundException('Categoría no encontrada');
    return c;
  }

  create(data: Partial<Categoria>, companyId: number): Promise<Categoria> {
    return this.repo.save(this.repo.create({ ...data, companyId }));
  }

  async update(id: number, data: Partial<Categoria>, companyId: number): Promise<Categoria> {
    await this.findOne(id, companyId); // verifica pertenencia
    await this.repo.update(id, data);
    return this.findOne(id, companyId);
  }

  async remove(id: number, companyId: number): Promise<{ eliminado: boolean }> {
    await this.findOne(id, companyId); // verifica pertenencia
    await this.repo.delete(id);
    return { eliminado: true };
  }
}
