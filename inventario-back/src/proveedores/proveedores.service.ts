import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proveedor } from './proveedor.entity';
import { sanitizeUpdate } from '../common/sanitize-update';

@Injectable()
export class ProveedoresService {
  constructor(
    @InjectRepository(Proveedor)
    private readonly repo: Repository<Proveedor>,
  ) {}

  private toDto(p: Proveedor) {
    return {
      ...p,
      productos: (() => { try { return JSON.parse(p.productosJson || '[]'); } catch { return []; } })(),
    };
  }

  async findAll(companyId: number) {
    const list = await this.repo.find({ where: { companyId }, order: { id: 'ASC' } });
    return list.map(p => this.toDto(p));
  }

  async findOne(id: number, companyId: number) {
    const p = await this.repo.findOne({ where: { id, companyId } });
    if (!p) throw new NotFoundException('Proveedor no encontrado');
    return this.toDto(p);
  }

  async create(data: any, companyId: number) {
    const raw: Partial<Proveedor> = {
      ...data,
      companyId,
      productosJson: JSON.stringify(data.productos ?? []),
    };
    delete (raw as any).productos;
    const entity = this.repo.create(raw);
    const saved = await this.repo.save(entity);
    return this.toDto(saved);
  }

  async update(id: number, data: any, companyId: number) {
    await this.findOne(id, companyId); // verifica pertenencia
    const update: any = sanitizeUpdate(data);
    if (data.productos !== undefined) {
      update.productosJson = JSON.stringify(data.productos);
      delete update.productos;
    }
    await this.repo.update(id, update);
    return this.findOne(id, companyId);
  }

  async remove(id: number, companyId: number): Promise<{ eliminado: boolean }> {
    await this.findOne(id, companyId); // verifica pertenencia
    await this.repo.delete(id);
    return { eliminado: true };
  }
}
