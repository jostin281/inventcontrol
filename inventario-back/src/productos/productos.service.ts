import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { Producto } from './producto.entity';
import { sanitizeUpdate } from '../common/sanitize-update';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private readonly repo: Repository<Producto>,
  ) {}

  findAll(companyId: number): Promise<Producto[]> {
    return this.repo.find({ where: { companyId }, order: { id: 'DESC' } });
  }

  async findOne(id: number, companyId: number): Promise<Producto> {
    const p = await this.repo.findOne({ where: { id, companyId } });
    if (!p) throw new NotFoundException('Producto no encontrado');
    return p;
  }

  async findBySku(sku: string, companyId: number): Promise<Producto> {
    const p = await this.repo.findOne({ where: { sku, companyId } });
    if (!p) throw new NotFoundException(`Producto con código ${sku} no encontrado`);
    return p;
  }

  create(data: Partial<Producto>, companyId: number): Promise<Producto> {
    this._validarImagen(data.imagen);
    const producto = this.repo.create({ ...data, companyId });
    return this.repo.save(producto);
  }

  async update(id: number, data: Partial<Producto>, companyId: number): Promise<Producto> {
    this._validarImagen(data.imagen);
    await this.findOne(id, companyId); // verifica pertenencia
    await this.repo.update(id, sanitizeUpdate(data));
    return this.findOne(id, companyId);
  }

  private _validarImagen(imagen: string | undefined): void {
    if (!imagen) return;
    const base64 = imagen.split(',')[1] ?? imagen;
    const bytesAprox = (base64.length * 3) / 4;
    if (bytesAprox > 5 * 1024 * 1024) {
      throw new BadRequestException('La imagen no puede superar 5 MB');
    }
  }

  async remove(id: number, companyId: number): Promise<{ eliminado: boolean }> {
    await this.findOne(id, companyId); // verifica pertenencia
    await this.repo.delete(id);
    return { eliminado: true };
  }

  async stats(companyId: number) {
    const productos = await this.repo.find({ where: { companyId } });
    const stockTotal = productos.reduce((s, p) => s + p.stock, 0);
    const stockBajo  = productos.filter(p => p.stock > 0 && p.stock <= Math.max(5, p.stockMax * 0.25)).length;
    return {
      total: productos.length,
      stockTotal,
      stockBajo,
      sinStock: productos.filter(p => p.stock === 0).length,
    };
  }

  /**
   * Obtiene todos los productos con stock bajo o agotados (stock <= 5 o stock <= 25% del stock max)
   */
  async findAlertasStock(companyId: number) {
    const productos = await this.repo.find({ where: { companyId } });
    const alertas = productos.filter(p => p.stock === 0 || p.stock <= Math.max(5, p.stockMax * 0.25));

    let whatsappText = `🚨 *ALERTA DE REABASTECIMIENTO DE INVENTARIO*\n\n`;
    whatsappText += `Hola, se requiere reabastecer los siguientes ${alertas.length} productos en el inventario:\n\n`;

    alertas.forEach((p, idx) => {
      const estadoStr = p.stock === 0 ? '❌ AGOTADO' : '⚠️ STOCK BAJO';
      whatsappText += `${idx + 1}. *${p.nombre}*\n`;
      whatsappText += `   • Estado: ${estadoStr} (${p.stock} unidades disponibles)\n`;
      whatsappText += `   • SKU: ${p.sku || 'N/A'}\n`;
      whatsappText += `   • Categoría: ${p.categoria || 'General'}\n`;
      whatsappText += `   • Proveedor: ${p.proveedor || 'No especificado'}\n\n`;
    });

    whatsappText += `_Mensaje generado automáticamente por InvenControl._`;

    return {
      totalAlertas: alertas.length,
      productos: alertas,
      mensajeWhatsApp: encodeURIComponent(whatsappText),
      textoWhatsAppPlano: whatsappText,
    };
  }

  /**
   * Envía correo de reporte de stock bajo utilizando SMTP (o transporte de prueba)
   */
  async enviarAlertaEmail(companyId: number, targetEmail?: string) {
    const dataAlertas = await this.findAlertasStock(companyId);
    if (dataAlertas.totalAlertas === 0) {
      return { enviado: false, mensaje: 'No hay productos con stock bajo actualmente.' };
    }

    const emailDestino = targetEmail || process.env.ALERT_EMAIL || 'admin@invencontrol.com';
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });

      let htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0f172a; margin-top: 0;">🚨 Alerta de Reabastecimiento de Inventario</h2>
          <p style="color: #475569; font-size: 14px;">Se ha detectado un total de <strong>${dataAlertas.totalAlertas} productos</strong> con nivel crítico de stock.</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <thead>
              <tr style="background: #f1f5f9; text-align: left; font-size: 12px; color: #475569;">
                <th style="padding: 10px; border-bottom: 2px solid #cbd5e1;">Producto</th>
                <th style="padding: 10px; border-bottom: 2px solid #cbd5e1;">Stock</th>
                <th style="padding: 10px; border-bottom: 2px solid #cbd5e1;">Proveedor</th>
              </tr>
            </thead>
            <tbody>
      `;

      dataAlertas.productos.forEach(p => {
        const badgeColor = p.stock === 0 ? '#ef4444' : '#f59e0b';
        const badgeText = p.stock === 0 ? 'AGOTADO (0)' : `${p.stock} unid.`;
        htmlBody += `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
            <td style="padding: 10px;"><strong>${p.nombre}</strong><br><small style="color:#64748b;">SKU: ${p.sku || 'N/A'}</small></td>
            <td style="padding: 10px;"><span style="background:${badgeColor}; color:white; padding:3px 8px; border-radius:12px; font-weight:bold; font-size:11px;">${badgeText}</span></td>
            <td style="padding: 10px; color:#334155;">${p.proveedor || 'Sin proveedor'}</td>
          </tr>
        `;
      });

      htmlBody += `
            </tbody>
          </table>
          <p style="margin-top: 20px; font-size: 12px; color: #94a3b8; text-align: center;">Reporte automático generado por <strong>InvenControl</strong>.</p>
        </div>
      `;

      await transporter.sendMail({
        from: `"InvenControl Alertas" <${smtpUser}>`,
        to: emailDestino,
        subject: `⚠️ Alerta de Stock Bajo (${dataAlertas.totalAlertas} productos)`,
        html: htmlBody,
      });

      return { enviado: true, totalAlertas: dataAlertas.totalAlertas, destinatario: emailDestino };
    }

    return {
      enviado: true,
      simulacion: true,
      totalAlertas: dataAlertas.totalAlertas,
      destinatario: emailDestino,
      mensaje: `Reporte de stock generado exitosamente (${dataAlertas.totalAlertas} alertas). Para enviar correos reales por SMTP, configure SMTP_USER y SMTP_PASS en las variables de entorno de Render.`,
    };
  }
}
