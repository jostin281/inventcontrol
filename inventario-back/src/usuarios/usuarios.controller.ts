import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards, Req, Res, HttpCode, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { UsuariosService } from './usuarios.service';
import { OrganizacionService } from './organizacion.service';
import { EliminarOrganizacionDto, ActualizarPerfilNegocioDto } from './organizacion.dto';
import { JwtAuthGuard, Roles } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class UsuariosController {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly organizacionService: OrganizacionService,
  ) {}

  // ── Zona de peligro: van antes de ":id" para que no choquen con esa ruta ──
  @Get('organizacion/backup')
  async backup(@Req() req: any, @Res() res: Response) {
    const buffer = await this.organizacionService.generarBackup(req.user.companyId);
    const fecha = new Date().toISOString().slice(0, 10);
    res.set({
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="invencontrol-backup-${fecha}.json.gz"`,
    });
    res.send(buffer);
  }

  @Delete('organizacion')
  @HttpCode(HttpStatus.OK)
  eliminarOrganizacion(@Req() req: any, @Body() dto: EliminarOrganizacionDto) {
    return this.organizacionService.eliminarOrganizacion(req.user.id, req.user.companyId, dto.password);
  }

  @Get('organizacion/perfil')
  obtenerPerfilNegocio(@Req() req: any) {
    return this.organizacionService.obtenerPerfilNegocio(req.user.companyId);
  }

  @Patch('organizacion/perfil')
  actualizarPerfilNegocio(@Req() req: any, @Body() dto: ActualizarPerfilNegocioDto) {
    return this.organizacionService.actualizarPerfilNegocio(req.user.companyId, dto);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.usuariosService.findAll(req.user.companyId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.usuariosService.findOne(id, req.user.companyId);
  }

  @Post()
  create(@Body() data: any, @Req() req: any) {
    return this.usuariosService.create(data, req.user.companyId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: any,
    @Req() req: any,
  ) {
    return this.usuariosService.update(id, data, req.user.companyId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.usuariosService.remove(id, req.user.id, req.user.companyId);
  }
}
