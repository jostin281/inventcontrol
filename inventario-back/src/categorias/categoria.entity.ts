import {
  Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn,
} from 'typeorm';

@Entity('categorias')
export class Categoria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  companyId: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 255, default: '' })
  descripcion: string;

  @Column({ length: 50, default: 'category' })
  icono: string;

  @Column({ length: 20, default: '#f0f0f7' })
  color: string;

  @Column({ length: 20, default: '#333333' })
  colorIcono: string;
}
