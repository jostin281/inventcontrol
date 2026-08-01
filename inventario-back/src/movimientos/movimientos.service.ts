import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Movimiento } from './movimiento.entity';

@Injectable()
export class MovimientosService {
  constructor(
    @InjectRepository(Movimiento)
    private readonly repo: Repository<Movimiento>,
  ) {}

  findAll(companyId: number): Promise<Movimiento[]> {
    return this.repo.find({ where: { companyId }, order: { fecha: 'DESC' } });
  }

  async findOne(id: number, companyId: number): Promise<Movimiento> {
    const m = await this.repo.findOne({ where: { id, companyId } });
    if (!m) throw new NotFoundException('Movimiento no encontrado');
    return m;
  }

  create(data: Partial<Movimiento>, companyId: number): Promise<Movimiento> {
    return this.repo.save(this.repo.create({ ...data, companyId }));
  }

  async update(id: number, data: Partial<Movimiento>, companyId: number): Promise<Movimiento> {
    await this.findOne(id, companyId); // verifica pertenencia
    await this.repo.update(id, data);
    return this.findOne(id, companyId);
  }

  async remove(id: number, companyId: number): Promise<{ eliminado: boolean }> {
    await this.findOne(id, companyId); // verifica pertenencia
    await this.repo.delete(id);
    return { eliminado: true };
  }

  async stats(companyId: number) {
    const movimientos = await this.repo.find({ where: { companyId } });
    const entradas = movimientos.filter(m => m.tipo === 'Entrada').reduce((s, m) => s + m.cantidad, 0);
    const salidas  = movimientos.filter(m => m.tipo === 'Salida').reduce((s, m) => s + Math.abs(m.cantidad), 0);
    return { entradas, salidas, neto: entradas - salidas, total: movimientos.length };
  }
}
