import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

/**
 * Una fila por cada inicio de sesión (login/registro) de un usuario.
 * "jti" es el identificador único que se guarda dentro del payload del JWT
 * de esa sesión — así, cuando llega una petición autenticada, se puede
 * comprobar que la sesión sigue activa (no fue revocada) sin depender solo
 * de que el token no haya expirado.
 */
@Entity('sesiones')
export class Sesion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  usuarioId: number;

  @Column({ unique: true, length: 64 })
  jti: string;

  @Column({ length: 200 })
  dispositivo: string;

  @Column({ type: 'varchar', length: 20, default: 'escritorio' })
  tipo: 'movil' | 'escritorio';

  @Column({ nullable: true, length: 100 })
  ip?: string;

  @Column({ default: true })
  activa: boolean;

  @CreateDateColumn()
  creadaEn: Date;
}
