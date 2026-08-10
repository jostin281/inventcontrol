import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venta } from './venta.entity';
import { sanitizeUpdate } from '../common/sanitize-update';

@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta)
    private readonly repo: Repository<Venta>,
  ) {}

  findAll(companyId: number): Promise<Venta[]> {
    return this.repo.find({ where: { companyId }, order: { id: 'DESC' } });
  }

  async findOne(id: number, companyId: number): Promise<Venta> {
    const v = await this.repo.findOne({ where: { id, companyId } });
    if (!v) throw new NotFoundException('Venta no encontrada');
    return v;
  }

  create(data: Partial<Venta>, companyId: number): Promise<Venta> {
    return this.repo.save(this.repo.create({ ...data, companyId }));
  }

  async update(id: number, data: Partial<Venta>, companyId: number): Promise<Venta> {
    await this.findOne(id, companyId);
    await this.repo.update(id, sanitizeUpdate(data));
    return this.findOne(id, companyId);
  }

  async remove(id: number, companyId: number): Promise<{ eliminado: boolean }> {
    await this.findOne(id, companyId);
    await this.repo.delete(id);
    return { eliminado: true };
  }
}
