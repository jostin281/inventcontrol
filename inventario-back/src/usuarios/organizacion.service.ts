import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { gzipSync } from 'zlib';
import { Usuario } from './usuario.entity';
import { Producto } from '../productos/producto.entity';
import { Categoria } from '../categorias/categoria.entity';
import { Proveedor } from '../proveedores/proveedor.entity';
import { Movimiento } from '../movimientos/movimiento.entity';
import { Venta } from '../ventas/venta.entity';
import { ActualizarPerfilNegocioDto } from './organizacion.dto';

/**
 * "Zona de peligro" de Configuración: generar un backup real de todos los
 * datos de la empresa (companyId) y, si el admin lo confirma con su
 * contraseña, borrarlos por completo — incluidos los usuarios de esa
 * empresa (las sesiones se eliminan solas por el ON DELETE CASCADE de
 * "sesiones" hacia "usuarios").
 */
@Injectable()
export class OrganizacionService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async generarBackup(companyId: number): Promise<Buffer> {
    const [usuarios, productos, categorias, proveedores, movimientos, ventas] = await Promise.all([
      this.usuarioRepo.find({ where: { companyId } }),
      this.dataSource.getRepository(Producto).find({ where: { companyId } }),
      this.dataSource.getRepository(Categoria).find({ where: { companyId } }),
      this.dataSource.getRepository(Proveedor).find({ where: { companyId } }),
      this.dataSource.getRepository(Movimiento).find({ where: { companyId } }),
      this.dataSource.getRepository(Venta).find({ where: { companyId } }),
    ]);

    const backup = {
      generadoEn: new Date().toISOString(),
      companyId,
      usuarios: usuarios.map(({ contrasena, ...resto }) => resto),
      productos,
      categorias,
      proveedores,
      movimientos,
      ventas,
    };

    const json = JSON.stringify(backup, null, 2);
    return gzipSync(Buffer.from(json, 'utf-8'));
  }

  /**
   * "Perfil del negocio" de Configuración. Se guarda en la fila del admin
   * dueño de la empresa (id === companyId) — es la misma fila que
   * `AuthService.generarToken` usa para poblar los datos del negocio en
   * `currentUser`, tanto para el admin como para sus sub-usuarios.
   */
  async actualizarPerfilNegocio(companyId: number, dto: ActualizarPerfilNegocioDto) {
    const owner = await this.usuarioRepo.findOne({ where: { id: companyId } });
    if (!owner) throw new NotFoundException('Negocio no encontrado');

    if (dto.logo) {
      // El tamaño real es ~3/4 de la longitud en base64. Mismo límite que
      // ya anuncia la pantalla ("PNG, JPG hasta 2 MB").
      const base64 = dto.logo.split(',')[1] ?? dto.logo;
      const bytesAprox = (base64.length * 3) / 4;
      if (bytesAprox > 2 * 1024 * 1024) {
        throw new BadRequestException('El logo no puede superar 2 MB');
      }
    }

    if (dto.nombreNegocio !== undefined) owner.nombreNegocio = dto.nombreNegocio;
    if (dto.correoOperaciones !== undefined) owner.correoOperaciones = dto.correoOperaciones;
    if (dto.direccion !== undefined) owner.direccion = dto.direccion;
    if (dto.zona !== undefined) owner.zona = dto.zona;
    if (dto.moneda !== undefined) owner.moneda = dto.moneda;
    if (dto.logo !== undefined) owner.logo = dto.logo ?? null;
    if (dto.qrPagoImagen !== undefined) owner.qrPagoImagen = dto.qrPagoImagen ?? null;
    if (dto.transferenciaImagen !== undefined) owner.transferenciaImagen = dto.transferenciaImagen ?? null;

    await this.usuarioRepo.save(owner);

    return {
      nombreNegocio: owner.nombreNegocio,
      correoOperaciones: owner.correoOperaciones,
      direccion: owner.direccion,
      zona: owner.zona,
      moneda: owner.moneda,
      logo: owner.logo,
      qrPagoImagen: owner.qrPagoImagen,
      transferenciaImagen: owner.transferenciaImagen,
    };
  }

  async eliminarOrganizacion(adminId: number, companyId: number, password: string): Promise<void> {
    const admin = await this.usuarioRepo.findOne({ where: { id: adminId, companyId } });
    if (!admin) throw new NotFoundException('Usuario no encontrado');

    const coincide = await bcrypt.compare(password, admin.contrasena);
    if (!coincide) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(Venta, { companyId });
      await manager.delete(Movimiento, { companyId });
      await manager.delete(Producto, { companyId });
      await manager.delete(Proveedor, { companyId });
      await manager.delete(Categoria, { companyId });
      // Borra también a los sub-usuarios de la empresa y al propio admin;
      // sus sesiones se eliminan solas (FK ON DELETE CASCADE).
      await manager.delete(Usuario, { companyId });
    });
  }
}
