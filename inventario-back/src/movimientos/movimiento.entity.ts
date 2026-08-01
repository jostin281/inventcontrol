import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

export type TipoMovimiento = 'Entrada' | 'Salida' | 'Ajuste';

@Entity('movimientos')
export class Movimiento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  companyId: number;

  @CreateDateColumn()
  fecha: Date;

  @Column({ length: 200 })
  producto: string;

  @Column({ length: 50, default: '' })
  sku: string;

  @Column({ type: 'varchar', default: 'Entrada' })
  tipo: TipoMovimiento;

  @Column()
  cantidad: number;

  @Column({ length: 150 })
  usuario: string;

  @Column({ type: 'text', nullable: true })
  nota?: string;

  @Column({ length: 20, default: '#f0f0f7' })
  colorProducto: string;
}
