import {
  Controller, Post, Patch, Delete, Get, Body, Param, ParseIntPipe,
  Req, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthService, DeviceInfo } from './auth.service';
import { LoginDto, CreateUsuarioDto, CambiarContrasenaDto } from './auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('registro')
  registro(@Body() dto: CreateUsuarioDto, @Req() req: any) {
    return this.authService.registro(dto, this._deviceInfo(req));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Req() req: any) {
    return this.authService.login(dto, this._deviceInfo(req));
  }

  @UseGuards(JwtAuthGuard)
  @Patch('cambiar-contrasena')
  @HttpCode(HttpStatus.OK)
  cambiarContrasena(@Req() req: any, @Body() dto: CambiarContrasenaDto) {
    return this.authService.cambiarContrasena(req.user.id, dto);
  }

  // ── Sesiones activas ──────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('sesiones')
  sesiones(@Req() req: any) {
    return this.authService.listarSesiones(req.user.id, req.user.jti);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sesiones/:id')
  revocarSesion(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.authService.revocarSesion(req.user.id, id, req.user.jti);
  }

  // Marca la sesión actual como cerrada (para que deje de listarse como activa).
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any) {
    await this.authService.cerrarSesion(req.user.jti);
    return { cerrada: true };
  }

  private _deviceInfo(req: any): DeviceInfo {
    const forwarded = (req.headers?.['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
    return {
      userAgent: req.headers?.['user-agent'] || '',
      ip: forwarded || req.ip || req.socket?.remoteAddress || '',
    };
  }
}
