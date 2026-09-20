import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { Usuario } from '../usuarios/usuario.entity';
import { Sesion } from './sesion.entity';
import { LoginDto, CreateUsuarioDto, CambiarContrasenaDto } from './auth.dto';
import { parseUserAgent } from './user-agent.util';

export interface DeviceInfo {
  userAgent: string;
  ip: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Sesion)
    private readonly sesionRepo: Repository<Sesion>,
    private readonly jwtService: JwtService,
  ) {}

  async registro(dto: CreateUsuarioDto, deviceInfo: DeviceInfo) {
    const codigoEsperado = process.env.REGISTRATION_CODE || '@JostinJosue2003.';
    if (!dto.codigoAutorizacion || dto.codigoAutorizacion.trim() !== codigoEsperado.trim()) {
      throw new UnauthorizedException('Código de autorización inválido. Solo el propietario puede autorizar nuevas cuentas.');
    }

    const existe = await this.usuarioRepo.findOne({ where: { correo: dto.correo.toLowerCase() } });
    if (existe) throw new ConflictException('El correo ya está registrado');

    const hash = await bcrypt.hash(dto.contrasena, 10);
    const usuario = this.usuarioRepo.create({
      nombre: dto.nombre,
      correo: dto.correo.toLowerCase(),
      contrasena: hash,
      rol: dto.rol ?? 'admin', // primer usuario es admin por defecto
      nombreNegocio: dto.nombreNegocio,
      tipoNegocio: dto.tipoNegocio,
    });

    const guardado = await this.usuarioRepo.save(usuario);

    // El admin usa su propio id como companyId (su empresa = él mismo)
    if (!guardado.companyId) {
      guardado.companyId = guardado.id;
      await this.usuarioRepo.save(guardado);
    }

    return this.iniciarSesion(guardado, deviceInfo);
  }

  async login(dto: LoginDto, deviceInfo: DeviceInfo) {
    const usuario = await this.usuarioRepo.findOne({
      where: { correo: dto.correo.toLowerCase() },
    });

    if (!usuario || !(await bcrypt.compare(dto.contrasena, usuario.contrasena))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!usuario.activo) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    // Se calcula ANTES de crear la sesión nueva (si no, la propia fila que
    // estamos por insertar ya "cuenta" como dispositivo conocido).
    const { dispositivo } = parseUserAgent(deviceInfo.userAgent);
    const esNuevoDispositivo = await this._esDispositivoNuevo(usuario.id, dispositivo);

    const resultado = await this.iniciarSesion(usuario, deviceInfo);

    return {
      ...resultado,
      alertaSeguridad: esNuevoDispositivo
        ? { nuevoDispositivo: true as const, dispositivo, ip: deviceInfo.ip || null }
        : null,
    };
  }

  /**
   * Un login se considera "desde un dispositivo nuevo" cuando esta cuenta
   * nunca antes tuvo una sesión (activa o no) registrada con ese mismo
   * `dispositivo` (p.ej. "Chrome en Windows 11" o "App móvil (Android)").
   * No aplica al primerísimo login de la cuenta (recién registrada), porque
   * ahí absolutamente todo es "nuevo" y alertar no tendría sentido.
   */
  private async _esDispositivoNuevo(usuarioId: number, dispositivo: string): Promise<boolean> {
    const totalPrevias = await this.sesionRepo.count({ where: { usuarioId } });
    if (totalPrevias === 0) return false;
    const coincidencias = await this.sesionRepo.count({ where: { usuarioId, dispositivo } });
    return coincidencias === 0;
  }

  async validarUsuario(id: number): Promise<Usuario | null> {
    return this.usuarioRepo.findOne({ where: { id, activo: true } });
  }

  /** Comprueba que la sesión (identificada por el jti del token) siga activa. */
  async sesionActiva(jti: string | undefined): Promise<boolean> {
    if (!jti) return false;
    const sesion = await this.sesionRepo.findOne({ where: { jti } });
    return !!sesion?.activa;
  }

  async listarSesiones(usuarioId: number, jtiActual: string | undefined) {
    const sesiones = await this.sesionRepo.find({
      where: { usuarioId, activa: true },
      order: { creadaEn: 'DESC' },
    });
    return sesiones.map(s => ({
      id: s.id,
      dispositivo: s.dispositivo,
      tipo: s.tipo,
      ip: s.ip ?? null,
      creadaEn: s.creadaEn,
      actual: s.jti === jtiActual,
    }));
  }

  async revocarSesion(usuarioId: number, sesionId: number, jtiActual: string | undefined) {
    const sesion = await this.sesionRepo.findOne({ where: { id: sesionId, usuarioId } });
    if (!sesion) throw new NotFoundException('Sesión no encontrada');
    if (sesion.jti === jtiActual) {
      throw new BadRequestException('No puedes revocar tu sesión actual, usa "Cerrar sesión"');
    }
    sesion.activa = false;
    await this.sesionRepo.save(sesion);
    return { revocada: true };
  }

  /** Marca inactiva la sesión actual (llamado al cerrar sesión normalmente). */
  async cerrarSesion(jti: string | undefined): Promise<void> {
    if (!jti) return;
    await this.sesionRepo.update({ jti }, { activa: false });
  }

  async cambiarContrasena(userId: number, dto: CambiarContrasenaDto) {
    const usuario = await this.usuarioRepo.findOne({ where: { id: userId } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const coincide = await bcrypt.compare(dto.contrasenaActual, usuario.contrasena);
    if (!coincide) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    usuario.contrasena = await bcrypt.hash(dto.contrasenaNueva, 10);
    await this.usuarioRepo.save(usuario);

    return { actualizado: true };
  }

  /** Crea el registro de sesión (para la lista de "Sesiones activas") y firma el JWT con su jti. */
  private async iniciarSesion(usuario: Usuario, deviceInfo: DeviceInfo) {
    const jti = randomUUID();
    const { dispositivo, tipo } = parseUserAgent(deviceInfo.userAgent);

    const sesion = this.sesionRepo.create({
      usuarioId: usuario.id,
      jti,
      dispositivo,
      tipo,
      ip: deviceInfo.ip || undefined,
      activa: true,
    });
    await this.sesionRepo.save(sesion);

    return this.generarToken(usuario, jti);
  }

  private async generarToken(usuario: Usuario, jti: string) {
    const companyId = usuario.companyId ?? usuario.id;
    const payload = {
      sub: usuario.id,
      correo: usuario.correo,
      rol: usuario.rol,
      companyId,
      jti,
    };

    // El "Perfil del negocio" (nombre, dirección, zona, moneda, logo) vive
    // en la fila del admin dueño de la empresa (id === companyId). Si quien
    // inició sesión es un sub-usuario, esos campos en SU propia fila están
    // vacíos — hay que ir a buscarlos a la fila del dueño para que también
    // vean el logo/nombre real del negocio, no solo el admin.
    const perfilNegocio = usuario.id === companyId
      ? usuario
      : (await this.usuarioRepo.findOne({ where: { id: companyId } })) ?? usuario;

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        companyId,
        nombreNegocio: perfilNegocio.nombreNegocio,
        correoOperaciones: perfilNegocio.correoOperaciones,
        direccion: perfilNegocio.direccion,
        zona: perfilNegocio.zona,
        moneda: perfilNegocio.moneda,
        logo: perfilNegocio.logo,
        qrPagoImagen: perfilNegocio.qrPagoImagen,
        transferenciaImagen: perfilNegocio.transferenciaImagen,
      },
    };
  }
}
