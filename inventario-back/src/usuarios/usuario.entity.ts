import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

export type UserRole = 'admin' | 'usuario';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Para el admin, companyId === su propio id (se actualiza tras el registro).
   * Para sub-usuarios, companyId === el id del admin que los creó.
   */
  @Column({ nullable: true })
  companyId?: number;

  @Column({ length: 150 })
  nombre: string;

  @Column({ unique: true, length: 150 })
  correo: string;

  @Column()
  contrasena: string;

  @Column({ type: 'varchar', default: 'usuario' })
  rol: UserRole;

  @Column({ nullable: true, length: 100 })
  nombreNegocio?: string;

  @Column({ nullable: true, length: 50 })
  tipoNegocio?: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  creadoEn: Date;
}
