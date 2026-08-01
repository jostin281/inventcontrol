import { Injectable } from '@angular/core';
import { ActionType } from './ai-actions.service';
import { CategoriaReporte } from './reportes.service';

export interface ParsedIntent {
  action: ActionType;
  entidad?: string;
  nombre?: string;
  contacto?: string;
  correo?: string;
  descripcion?: string;
  id?: number;
  categoriaReporte?: CategoriaReporte;
  precio?: number;
  stock?: number;
  stockMax?: number;
  proveedor?: string;
  sku?: string;
  rawText: string;
}

const WRITE_ACTIONS: ActionType[] = [
  'crear_proveedor',
  'crear_categoria',
  'crear_producto',
  'generar_reporte',
  'editar_proveedor',
  'eliminar_proveedor',
  'eliminar_categoria',
  'orden_compra',
];

@Injectable({ providedIn: 'root' })
export class IntentParserService {

  parse(message: string): ParsedIntent {
    const msg = message.toLowerCase().trim();
    const base: ParsedIntent = { action: 'unknown', rawText: message };

    // ── Upgrade ────────────────────────────────────────────────────────────
    if (msg.includes('mejorar') || msg.includes('upgrade') || msg.includes('plan pro')) {
      return { ...base, action: 'upgrade_plan' };
    }

    // ── Eliminar proveedor ─────────────────────────────────────────────────
    if (
      (msg.includes('elimina') || msg.includes('borra') || msg.includes('eliminar') || msg.includes('borrar')) &&
      msg.includes('proveedor')
    ) {
      const nombre = this._extractNombrePost(msg, ['proveedor']);
      return { ...base, action: 'eliminar_proveedor', entidad: 'proveedor', nombre };
    }

    // ── Eliminar categoría ─────────────────────────────────────────────────
    if (
      (msg.includes('elimina') || msg.includes('borra') || msg.includes('eliminar') || msg.includes('borrar')) &&
      (msg.includes('categoria') || msg.includes('categoría'))
    ) {
      const nombre = this._extractNombrePost(msg, ['categoria', 'categoría']);
      return { ...base, action: 'eliminar_categoria', entidad: 'categoria', nombre };
    }

    // ── Crear proveedor ────────────────────────────────────────────────────
    if (
      (msg.includes('crea') || msg.includes('agrega') || msg.includes('nuevo') || msg.includes('añade') || msg.includes('crear')) &&
      msg.includes('proveedor')
    ) {
      const nombre = this._extractNombrePost(msg, ['proveedor', 'llamado', 'llamada']);
      const contacto = this._extractField(msg, ['contacto', 'contact']);
      const correo = this._extractEmail(message);
      return { ...base, action: 'crear_proveedor', entidad: 'proveedor', nombre, contacto, correo };
    }

    // ── Crear categoría ────────────────────────────────────────────────────
    if (
      (msg.includes('crea') || msg.includes('agrega') || msg.includes('nueva') || msg.includes('nueva') || msg.includes('crear')) &&
      (msg.includes('categoria') || msg.includes('categoría'))
    ) {
      const nombre = this._extractNombrePost(msg, ['categoria', 'categoría', 'llamada', 'llamado']);
      const descripcion = this._extractField(msg, ['descripcion', 'descripción']);
      return { ...base, action: 'crear_categoria', entidad: 'categoria', nombre, descripcion };
    }

    // ── Crear producto ─────────────────────────────────────────────────────
    if (
      (msg.includes('crea') || msg.includes('agrega') || msg.includes('nuevo') || msg.includes('añade') || msg.includes('crear')) &&
      msg.includes('producto')
    ) {
      const nombre = this._extractNombrePost(msg, ['producto', 'llamado', 'llamada']);
      const categoria = this._extractField(msg, ['categoría', 'categoria']);
      const precio = this._extractNumber(msg, ['precio', 'valor']);
      const stock = this._extractNumber(msg, ['stock', 'cantidad']);
      const stockMax = this._extractNumber(msg, ['stock max', 'stock máximo', 'máximo']);
      const proveedor = this._extractField(msg, ['proveedor']);
      const sku = this._extractField(msg, ['sku']);
      const descripcion = this._extractField(msg, ['descripcion', 'descripción']);
      return {
        ...base,
        action: 'crear_producto',
        entidad: 'producto',
        nombre,
        descripcion,
        precio,
        stock,
        stockMax,
        proveedor,
        sku,
      };
    }

    // ── Generar reporte ───────────────────────────────────────────────────
    const reporteCategoria = this._extractReporteCategoria(msg);
    if ((msg.includes('reporte') || msg.includes('reportes')) && reporteCategoria) {
      return { ...base, action: 'generar_reporte', entidad: 'reporte', categoriaReporte: reporteCategoria };
    }

    // ── Editar proveedor ───────────────────────────────────────────────────
    if (
      (msg.includes('edita') || msg.includes('modifica') || msg.includes('actualiza') || msg.includes('cambia')) &&
      msg.includes('proveedor')
    ) {
      const nombre = this._extractNombrePost(msg, ['proveedor']);
      return { ...base, action: 'editar_proveedor', entidad: 'proveedor', nombre };
    }

    // ── Consultas ──────────────────────────────────────────────────────────
    if (
      msg.includes('reabastecer') || msg.includes('reabastecimiento') ||
      msg.includes('stock bajo') || msg.includes('reponer')
    ) {
      return { ...base, action: 'reabastecimiento' };
    }

    if (msg.includes('proveedor') || msg.includes('supplier')) {
      return { ...base, action: 'consulta_proveedores' };
    }

    if (
      msg.includes('stock') || msg.includes('inventario') ||
      msg.includes('salud') || msg.includes('productos')
    ) {
      return { ...base, action: 'consulta_stock' };
    }

    if (msg.includes('orden') || msg.includes('compra')) {
      return { ...base, action: 'orden_compra' };
    }

    return base;
  }

  isWriteAction(action: ActionType): boolean {
    return WRITE_ACTIONS.includes(action);
  }

  isDestructiveAction(action: ActionType): boolean {
    return action === 'eliminar_proveedor' || action === 'eliminar_categoria';
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private _extractNombrePost(msg: string, keywords: string[]): string | undefined {
    for (const kw of keywords) {
      const idx = msg.indexOf(kw);
      if (idx === -1) continue;
      const after = msg.slice(idx + kw.length).trim();
      // Remove leading prepositions
      const clean = after.replace(/^(llamado|llamada|con nombre|named|de|el|la)\s+/i, '');
      if (clean.length > 0) {
        // Take first 4 words as name
        return clean.split(/\s+/).slice(0, 4).join(' ').replace(/[,.]$/, '');
      }
    }
    return undefined;
  }

  private _extractField(msg: string, keywords: string[]): string | undefined {
    for (const kw of keywords) {
      const idx = msg.indexOf(kw);
      if (idx === -1) continue;
      const after = msg.slice(idx + kw.length).trim().replace(/^[:=\s]+/, '');
      if (after.length > 0) {
        return after.split(/[,.]/).shift()?.trim();
      }
    }
    return undefined;
  }

  private _extractEmail(msg: string): string | undefined {
    const match = msg.match(/[\w.-]+@[\w.-]+\.\w+/);
    return match ? match[0] : undefined;
  }

  private _extractNumber(msg: string, keywords: string[]): number | undefined {
    for (const kw of keywords) {
      const idx = msg.indexOf(kw);
      if (idx === -1) continue;
      const after = msg.slice(idx + kw.length).trim().replace(/^[:=\s]+/, '');
      const match = after.match(/\d+(?:[.,]\d+)?/);
      if (match) {
        return Number(match[0].replace(',', '.'));
      }
    }
    return undefined;
  }

  private _extractReporteCategoria(msg: string): CategoriaReporte | undefined {
    if (msg.includes('proveedor') || msg.includes('proveedores')) return 'proveedores';
    if (msg.includes('rotacion') || msg.includes('rotación') || msg.includes('stock')) return 'rotacion';
    if (msg.includes('valor') || msg.includes('valoracion') || msg.includes('valoración') || msg.includes('inventario')) return 'valoracion';
    if (msg.includes('utilizacion') || msg.includes('utilización') || msg.includes('almacen') || msg.includes('almacén')) return 'utilizacion';
    if (msg.includes('merma') || msg.includes('mermas') || msg.includes('perdida') || msg.includes('pérdida')) return 'perdidas';
    return undefined;
  }
}
