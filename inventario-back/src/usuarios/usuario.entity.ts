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

  /**
   * Los siguientes campos son el "Perfil del negocio" de Configuración.
   * Solo se leen/escriben en la fila del admin dueño de la empresa
   * (id === companyId) — un sub-usuario nunca los tiene poblados en la
   * suya propia; ver `AuthService.generarToken`, que va a buscarlos a la
   * fila del dueño cuando quien inicia sesión es un sub-usuario.
   */
  @Column({ nullable: true, length: 300 })
  direccion?: string;

  @Column({ nullable: true, length: 50 })
  zona?: string;

  @Column({ nullable: true, length: 10 })
  moneda?: string;

  @Column({ nullable: true, length: 150 })
  correoOperaciones?: string;

  // Data URL completa (ej. "data:image/png;base64,...."), sin límite de
  // longitud fija (a diferencia de otros campos varchar de esta entidad).
  @Column({ type: 'text', nullable: true })
  logo?: string | null;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  creadoEn: Date;
}
