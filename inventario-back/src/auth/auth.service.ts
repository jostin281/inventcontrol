import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Usuario } from '../usuarios/usuario.entity';
import { LoginDto, CreateUsuarioDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    private readonly jwtService: JwtService,
  ) {}

  async registro(dto: CreateUsuarioDto) {
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

    return this.generarToken(guardado);
  }

  async login(dto: LoginDto) {
    const usuario = await this.usuarioRepo.findOne({
      where: { correo: dto.correo.toLowerCase() },
    });

    if (!usuario || !(await bcrypt.compare(dto.contrasena, usuario.contrasena))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!usuario.activo) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    return this.generarToken(usuario);
  }

  async validarUsuario(id: number): Promise<Usuario | null> {
    return this.usuarioRepo.findOne({ where: { id, activo: true } });
  }

  private generarToken(usuario: Usuario) {
    const companyId = usuario.companyId ?? usuario.id;
    const payload = {
      sub: usuario.id,
      correo: usuario.correo,
      rol: usuario.rol,
      companyId,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        companyId,
        nombreNegocio: usuario.nombreNegocio,
      },
    };
  }
}
