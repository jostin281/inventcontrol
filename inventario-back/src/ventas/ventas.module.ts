import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Venta } from './venta.entity';
import { VentasService } from './ventas.service';
import { VentasController } from './ventas.controller';
import { Producto } from '../productos/producto.entity';
import { Movimiento } from '../movimientos/movimiento.entity';

@Module({
  // Producto y Movimiento se registran aquí también porque VentasService
  // necesita descontar stock y registrar el movimiento de salida dentro de
  // la misma transacción que crea la venta.
  imports: [TypeOrmModule.forFeature([Venta, Producto, Movimiento])],
  controllers: [VentasController],
  providers: [VentasService],
  exports: [VentasService],
})
export class VentasModule {}
