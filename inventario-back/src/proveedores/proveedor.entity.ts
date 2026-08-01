import {
  Entity, PrimaryGeneratedColumn, Column,
} from 'typeorm';

@Entity('proveedores')
export class Proveedor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  companyId: number;

  @Column({ length: 150 })
  nombre: string;

  @Column({ length: 100, default: '' })
  categoria: string;

  @Column({ length: 150, default: '' })
  contacto: string;

  @Column({ length: 30, default: '' })
  telefono: string;

  @Column({ length: 150, default: '' })
  correo: string;

  @Column({ type: 'text', default: '[]' })
  productosJson: string; // guardado como JSON string

  @Column({ type: 'real', default: 5.0 })
  calificacion: number;

  @Column({ default: true })
  activo: boolean;

  @Column({ default: 5 })
  tiempoEntregaDias: number;

  @Column({ default: 90 })
  confiabilidad: number;

  @Column({ type: 'datetime', nullable: true })
  ultimaAuditoria?: Date;

  @Column({ type: 'datetime', nullable: true })
  proximaAuditoria?: Date;

  @Column({ length: 200, default: 'linear-gradient(135deg, #24389c, #3f51b5)' })
  gradienteColor: string;

  @Column({ length: 5, default: 'P' })
  iniciales: string;
}
