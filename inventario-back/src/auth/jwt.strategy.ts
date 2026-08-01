import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';

export const JWT_SECRET = process.env.JWT_SECRET ?? 'invencontrol_secret_key_2024';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET,
    });
  }

  async validate(payload: { sub: number; correo: string; rol: string; companyId: number }) {
    const usuario = await this.authService.validarUsuario(payload.sub);
    if (!usuario) return null;
    return {
      id: usuario.id,
      correo: usuario.correo,
      rol: usuario.rol,
      nombre: usuario.nombre,
      companyId: payload.companyId ?? usuario.companyId ?? usuario.id,
    };
  }
}
