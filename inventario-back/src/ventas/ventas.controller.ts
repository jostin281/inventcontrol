import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { VentasService } from './ventas.service';
import { JwtAuthGuard, Roles } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller('ventas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class VentasController {
  constructor(private readonly service: VentasService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.service.findAll(req.user.companyId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.findOne(id, req.user.companyId);
  }

  @Post()
  create(@Body() data: any, @Req() req: any) {
    return this.service.create(data, req.user.companyId);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() data: any, @Req() req: any) {
    return this.service.update(id, data, req.user.companyId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.remove(id, req.user.companyId);
  }
}
