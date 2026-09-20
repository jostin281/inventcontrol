import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { ProductosService } from './productos.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('productos')
@UseGuards(JwtAuthGuard)
export class ProductosController {
  constructor(private readonly service: ProductosService) {}

  @Get('stats')
  stats(@Req() req: any) {
    return this.service.stats(req.user.companyId);
  }

  @Get('alertas-stock')
  findAlertasStock(@Req() req: any) {
    return this.service.findAlertasStock(req.user.companyId);
  }

  @Post('enviar-alerta-email')
  enviarAlertaEmail(@Body() body: { email?: string }, @Req() req: any) {
    return this.service.enviarAlertaEmail(req.user.companyId, body?.email);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.service.findAll(req.user.companyId);
  }

  @Get('sku/:sku')
  findBySku(@Param('sku') sku: string, @Req() req: any) {
    return this.service.findBySku(sku, req.user.companyId);
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
