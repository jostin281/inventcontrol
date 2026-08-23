import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';
import { getJwtSecret } from './jwt.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(config),
    });
  }

  async validate(payload: { sub: number; correo: string; rol: string; companyId: number; jti?: string }) {
    const usuario = await this.authService.validarUsuario(payload.sub);
    if (!usuario) return null;

    // Tokens emitidos antes de que existiera el control de sesiones no
    // tienen "jti" — se aceptan igual (evita invalidar sesiones viejas de
    // golpe); los que sí lo tienen deben corresponder a una sesión activa.
    if (payload.jti && !(await this.authService.sesionActiva(payload.jti))) {
      return null;
    }

    return {
      id: usuario.id,
      correo: usuario.correo,
      rol: usuario.rol,
      nombre: usuario.nombre,
      companyId: payload.companyId ?? usuario.companyId ?? usuario.id,
      jti: payload.jti,
    };
  }
}
