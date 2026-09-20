import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Venta } from './venta.entity';
import { Producto } from '../productos/producto.entity';
import { Movimiento } from '../movimientos/movimiento.entity';
import { sanitizeUpdate } from '../common/sanitize-update';

/** Solo una venta "Completada" descuenta stock real del inventario. */
function afectaStock(estado: string | undefined | null): boolean {
  return (estado ?? '').trim().toLowerCase() === 'completada';
}

@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta)
    private readonly repo: Repository<Venta>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  findAll(companyId: number): Promise<Venta[]> {
    return this.repo.find({ where: { companyId }, order: { id: 'DESC' } });
  }

  async findOne(id: number, companyId: number): Promise<Venta> {
    const v = await this.repo.findOne({ where: { id, companyId } });
    if (!v) throw new NotFoundException('Venta no encontrada');
    return v;
  }

  /**
   * Crea una venta y, si va vinculada a un producto del catálogo y queda
   * "Completada", descuenta el stock de ese producto y deja registrado un
   * movimiento de "Salida" — todo dentro de una misma transacción para que
   * nunca quede la venta guardada sin el stock actualizado (o viceversa).
   */
  async create(data: Partial<Venta>, companyId: number, usuario = 'Sistema'): Promise<Venta> {
    return this.dataSource.transaction(async (manager) => {
      const ventaRepo = manager.getRepository(Venta);
      const productoRepo = manager.getRepository(Producto);
      const movimientoRepo = manager.getRepository(Movimiento);

      const cantidad = data.cantidad && data.cantidad > 0 ? data.cantidad : 1;
      const estado = data.estado ?? 'Completada';

      let producto: Producto | null = null;
      if (data.productoId) {
        producto = await productoRepo.findOne({ where: { id: data.productoId, companyId } });
        if (!producto) throw new NotFoundException('Producto no encontrado');
      }

      if (producto && afectaStock(estado)) {
        if (producto.stock < cantidad) {
          throw new BadRequestException(
            `Stock insuficiente de "${producto.nombre}" (disponible: ${producto.stock}, solicitado: ${cantidad})`,
          );
        }
        producto.stock -= cantidad;
        await productoRepo.save(producto);

        await movimientoRepo.save(
          movimientoRepo.create({
            companyId,
            producto: producto.nombre,
            sku: producto.sku ?? '',
            tipo: 'Salida',
            cantidad,
            usuario,
            nota: `Venta a ${data.cliente ?? 'cliente'}`,
            colorProducto: producto.categoriaColor ?? '#f0f0f7',
          }),
        );
      }

      const venta = ventaRepo.create({
        ...data,
        producto: producto ? producto.nombre : (data.producto ?? 'Producto'),
        productoId: producto?.id,
        cantidad,
        estado,
        metodoPago: data.metodoPago ?? 'Efectivo',
        folio: data.folio,
        companyId,
      });
      return ventaRepo.save(venta);
    });
  }

  /**
   * Procesa la venta de múltiples productos del carrito de punto de venta (POS)
   * dentro de una ÚNICA transacción Atómica de base de datos.
   */
  async createPosBatch(
    body: { cliente?: string; metodoPago?: string; items: Array<{ productoId: number; cantidad: number }> },
    companyId: number,
    usuario = 'POS'
  ): Promise<{ folio: string; cliente: string; metodoPago: string; total: number; ventas: Venta[] }> {
    if (!body.items || body.items.length === 0) {
      throw new BadRequestException('El carrito de compras no contiene productos');
    }

    return this.dataSource.transaction(async (manager) => {
      const ventaRepo = manager.getRepository(Venta);
      const productoRepo = manager.getRepository(Producto);
      const movimientoRepo = manager.getRepository(Movimiento);

      const folio = `POS-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
      const cliente = body.cliente?.trim() || 'Cliente Mostrador';
      const metodoPago = body.metodoPago?.trim() || 'Efectivo';
      const fechaStr = new Date().toISOString().slice(0, 10);

      const savedVentas: Venta[] = [];
      let totalVentaGeneral = 0;

      for (const item of body.items) {
        if (!item.productoId || item.cantidad <= 0) {
          throw new BadRequestException('Cada producto debe tener un ID válido y cantidad mayor a cero');
        }

        const producto = await productoRepo.findOne({ where: { id: item.productoId, companyId } });
        if (!producto) {
          throw new NotFoundException(`Producto con ID ${item.productoId} no encontrado`);
        }

        if (producto.stock < item.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stock}, Solicitado: ${item.cantidad}`,
          );
        }

        // Descontar stock real en base de datos
        producto.stock -= item.cantidad;
        await productoRepo.save(producto);

        // Registrar movimiento de inventario de Salida
        await movimientoRepo.save(
          movimientoRepo.create({
            companyId,
            producto: producto.nombre,
            sku: producto.sku ?? '',
            tipo: 'Salida',
            cantidad: item.cantidad,
            usuario,
            nota: `Venta POS Folio: ${folio} (${metodoPago})`,
            colorProducto: producto.categoriaColor ?? '#f0f0f7',
          }),
        );

        const itemTotal = Math.round(producto.precio * item.cantidad * 100) / 100;
        totalVentaGeneral += itemTotal;

        const v = ventaRepo.create({
          companyId,
          cliente,
          producto: producto.nombre,
          productoId: producto.id,
          cantidad: item.cantidad,
          total: itemTotal,
          fecha: fechaStr,
          estado: 'Completada',
          metodoPago,
          folio,
        });

        savedVentas.push(await ventaRepo.save(v));
      }

      return {
        folio,
        cliente,
        metodoPago,
        total: Math.round(totalVentaGeneral * 100) / 100,
        ventas: savedVentas,
      };
    });
  }

  /**
   * Edita una venta. Si el producto, la cantidad o el estado cambian, primero
   * revierte el efecto que la venta original tuvo sobre el stock y luego
   * vuelve a aplicarlo con los datos nuevos, para que el inventario nunca
   * quede desincronizado con lo que la venta dice haber vendido.
   */
  async update(id: number, data: Partial<Venta>, companyId: number): Promise<Venta> {
    return this.dataSource.transaction(async (manager) => {
      const ventaRepo = manager.getRepository(Venta);
      const productoRepo = manager.getRepository(Producto);

      const actual = await ventaRepo.findOne({ where: { id, companyId } });
      if (!actual) throw new NotFoundException('Venta no encontrada');

      // 1) Revertir el efecto que tenía la venta original sobre el stock.
      if (actual.productoId && afectaStock(actual.estado)) {
        const productoAnterior = await productoRepo.findOne({ where: { id: actual.productoId, companyId } });
        if (productoAnterior) {
          productoAnterior.stock += actual.cantidad;
          await productoRepo.save(productoAnterior);
        }
      }

      const limpio = sanitizeUpdate(data);
      const nuevoProductoId = limpio.productoId !== undefined ? limpio.productoId : actual.productoId;
      const nuevaCantidad = limpio.cantidad && limpio.cantidad > 0 ? limpio.cantidad : actual.cantidad;
      const nuevoEstado = limpio.estado ?? actual.estado;

      // 2) Aplicar el efecto de la venta con los datos nuevos.
      let nuevoProducto: Producto | null = null;
      if (nuevoProductoId) {
        nuevoProducto = await productoRepo.findOne({ where: { id: nuevoProductoId, companyId } });
        if (!nuevoProducto) throw new NotFoundException('Producto no encontrado');

        if (afectaStock(nuevoEstado)) {
          if (nuevoProducto.stock < nuevaCantidad) {
            throw new BadRequestException(
              `Stock insuficiente de "${nuevoProducto.nombre}" (disponible: ${nuevoProducto.stock}, solicitado: ${nuevaCantidad})`,
            );
          }
          nuevoProducto.stock -= nuevaCantidad;
          await productoRepo.save(nuevoProducto);
        }
      }

      await ventaRepo.update(id, {
        ...limpio,
        producto: nuevoProducto ? nuevoProducto.nombre : (limpio.producto ?? actual.producto),
        productoId: nuevoProductoId,
        cantidad: nuevaCantidad,
        estado: nuevoEstado,
      });

      const actualizada = await ventaRepo.findOne({ where: { id, companyId } });
      return actualizada!;
    });
  }

  /** Elimina la venta y, si estaba "Completada", repone el stock que había descontado. */
  async remove(id: number, companyId: number): Promise<{ eliminado: boolean }> {
    await this.dataSource.transaction(async (manager) => {
      const ventaRepo = manager.getRepository(Venta);
      const productoRepo = manager.getRepository(Producto);

      const venta = await ventaRepo.findOne({ where: { id, companyId } });
      if (!venta) throw new NotFoundException('Venta no encontrada');

      if (venta.productoId && afectaStock(venta.estado)) {
        const producto = await productoRepo.findOne({ where: { id: venta.productoId, companyId } });
        if (producto) {
          producto.stock += venta.cantidad;
          await productoRepo.save(producto);
        }
      }

      await ventaRepo.delete(id);
    });
    return { eliminado: true };
  }
}
