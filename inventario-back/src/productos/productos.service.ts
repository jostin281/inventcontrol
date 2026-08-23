import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Producto } from './producto.entity';
import { sanitizeUpdate } from '../common/sanitize-update';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private readonly repo: Repository<Producto>,
  ) {}

  findAll(companyId: number): Promise<Producto[]> {
    return this.repo.find({ where: { companyId }, order: { id: 'DESC' } });
  }

  async findOne(id: number, companyId: number): Promise<Producto> {
    const p = await this.repo.findOne({ where: { id, companyId } });
    if (!p) throw new NotFoundException('Producto no encontrado');
    return p;
  }

  create(data: Partial<Producto>, companyId: number): Promise<Producto> {
    this._validarImagen(data.imagen);
    const producto = this.repo.create({ ...data, companyId });
    return this.repo.save(producto);
  }

  async update(id: number, data: Partial<Producto>, companyId: number): Promise<Producto> {
    this._validarImagen(data.imagen);
    await this.findOne(id, companyId); // verifica pertenencia
    await this.repo.update(id, sanitizeUpdate(data));
    return this.findOne(id, companyId);
  }

  /** Mismo límite que ya anuncia el formulario ("PNG, JPG hasta 5MB"). */
  private _validarImagen(imagen: string | undefined): void {
    if (!imagen) return;
    const base64 = imagen.split(',')[1] ?? imagen;
    const bytesAprox = (base64.length * 3) / 4;
    if (bytesAprox > 5 * 1024 * 1024) {
      throw new BadRequestException('La imagen no puede superar 5 MB');
    }
  }

  async remove(id: number, companyId: number): Promise<{ eliminado: boolean }> {
    await this.findOne(id, companyId); // verifica pertenencia
    await this.repo.delete(id);
    return { eliminado: true };
  }

  async stats(companyId: number) {
    const productos = await this.repo.find({ where: { companyId } });
    const stockTotal = productos.reduce((s, p) => s + p.stock, 0);
    const stockBajo  = productos.filter(p => p.stock > 0 && p.stock <= p.stockMax * 0.25).length;
    return {
      total: productos.length,
      stockTotal,
      stockBajo,
      sinStock: productos.filter(p => p.stock === 0).length,
    };
  }
}
