import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FilaTabla, ColumnaTabla } from './reportes.service';

export interface DatosExport {
  columnas: ColumnaTabla[];
  filas: FilaTabla[];
}

@Injectable({ providedIn: 'root' })
export class ReportesExportService {

  /**
   * Genera y descarga un archivo .xlsx con los datos de la tabla.
   * @param datos   Columnas y filas del reporte
   * @param nombre  Nombre base del archivo (sin extensión ni fecha)
   * @param resumen Texto del insight (se incluye como fila de encabezado)
   */
  exportarExcel(datos: DatosExport, nombre: string, resumen?: string): void {
    // Construir cabeceras legibles
    const headers = datos.columnas.map(c => c.label);

    // Construir filas como arrays de valores
    const rows = datos.filas.map(fila =>
      datos.columnas.map(col => fila[col.key] ?? '')
    );

    // Crear hoja
    const wsData: unknown[][] = [];

    if (resumen) {
      wsData.push([resumen]);
      wsData.push([]); // fila vacía
    }

    wsData.push(headers);
    wsData.push(...rows);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Estilos de ancho de columna (estimado)
    ws['!cols'] = datos.columnas.map(() => ({ wch: 20 }));

    // Congelar cabeceras
    ws['!freeze'] = { xSplit: 0, ySplit: resumen ? 3 : 1 };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');

    const fecha     = this.fechaHoy();
    const nombreArch = `reporte-${this.slugify(nombre)}-${fecha}.xlsx`;

    XLSX.writeFile(wb, nombreArch);
  }

  /**
   * Genera y descarga un archivo .pdf con título, tabla y resumen.
   * @param datos   Columnas y filas del reporte
   * @param nombre  Nombre base del archivo
   * @param resumen Insight clave para incluir al pie
   * @param rango   Rango de fechas descriptivo (opcional)
   */
  exportarPdf(
    datos: DatosExport,
    nombre: string,
    resumen?: string,
    rango?: string,
  ): void {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    // ── Cabecera ──
    doc.setFillColor(36, 56, 156);  // #24389c
    doc.rect(0, 0, pageW, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('InvenControl — Reporte Inteligente', 14, 12);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(nombre, 14, 21);

    if (rango) {
      doc.text(`Período: ${rango}`, pageW - 14, 21, { align: 'right' });
    }

    const fecha = this.fechaHoy();
    doc.text(`Generado: ${fecha}`, pageW - 14, 12, { align: 'right' });

    // ── Tabla de datos ──
    const head = [datos.columnas.map(c => c.label)];
    const body = datos.filas.map(fila =>
      datos.columnas.map(col => String(fila[col.key] ?? ''))
    );

    autoTable(doc, {
      head,
      body,
      startY: 34,
      styles: {
        fontSize: 9,
        cellPadding: 3,
        font: 'helvetica',
      },
      headStyles: {
        fillColor: [63, 81, 181],   // #3f51b5
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250], // #F5F7FA
      },
      tableLineColor: [200, 206, 224],
      tableLineWidth: 0.1,
    });

    // ── Insight al pie ──
    if (resumen) {
      const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 180;
      const insightY = finalY + 8;

      if (insightY < doc.internal.pageSize.getHeight() - 20) {
        doc.setFillColor(240, 244, 255);
        doc.roundedRect(14, insightY, pageW - 28, 14, 2, 2, 'F');

        doc.setTextColor(36, 56, 156);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('💡 Insight Clave:', 18, insightY + 5.5);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(resumen, 50, insightY + 5.5, { maxWidth: pageW - 65 });
      }
    }

    // ── Pie de página ──
    const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `InvenControl — Página ${i} de ${totalPages}`,
        pageW / 2,
        doc.internal.pageSize.getHeight() - 6,
        { align: 'center' }
      );
    }

    const nombreArch = `reporte-${this.slugify(nombre)}-${fecha}.pdf`;
    doc.save(nombreArch);
  }

  // ── Helpers ──────────────────────────────────────────────────────
  private fechaHoy(): string {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')  // elimina acentos
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '');
  }
}
