import {
  Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn,
} from 'typeorm';

@Entity('productos')
export class Producto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  companyId: number;

  @Column({ length: 200 })
  nombre: string;

  @Column({ length: 100, default: '' })
  categoria: string;

  @Column({ default: 0 })
  stock: number;

  @Column({ default: 20 })
  stockMax: number;

  @Column({ type: 'real', default: 0 })
  precio: number;

  @Column({ length: 150, default: '' })
  proveedor: string;

  @Column({ length: 50, default: '' })
  sku: string;

  @Column({ type: 'text', default: '' })
  descripcion: string;

  // Data URL completa del producto (ej. "data:image/png;base64,...."). Antes
  // era varchar(255) — cualquier foto real (base64 siempre pasa de miles de
  // caracteres) hacía fallar el guardado completo con un error de Postgres
  // ("value too long"), por eso "Nuevo Producto" con imagen nunca funcionaba.
  @Column({ type: 'text', default: '' })
  imagen: string;

  @Column({ length: 20, default: '#f0f0f7' })
  categoriaColor: string;

  @UpdateDateColumn()
  ultimaActualizacion: Date;
}
