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

  @Column({ type: 'real' })
  total: number;

  @Column({ length: 50 })
  fecha: string;

  @Column({ length: 50, default: 'Completada' })
  estado: string;
}
