import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('ventas')
export class Venta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  companyId: number;

  @Column({ length: 150 })
  cliente: string;

  @Column({ length: 200 })
  producto: string;

  /**
   * Referencia al producto vendido (nullable: ventas antiguas o registradas
   * sin producto del catálogo no la tienen). Se usa para descontar stock al
   * crear la venta y para revertirlo si se edita/elimina.
   */
  @Column({ nullable: true })
  productoId?: number;

  @Column({ type: 'int', default: 1 })
  cantidad: number;

  @Column({ type: 'real' })
  total: number;

  @Column({ length: 50 })
  fecha: string;

  @Column({ length: 50, default: 'Completada' })
  estado: string;
}
