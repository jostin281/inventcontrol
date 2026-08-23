import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Añade a "ventas" la relación con el producto vendido (productoId) y la
 * cantidad de unidades, necesarias para poder descontar el stock del
 * producto automáticamente cuando se registra una venta (antes la venta
 * solo guardaba el nombre del producto como texto suelto, sin ningún
 * vínculo real con "productos", así que el stock nunca se actualizaba).
 */
export class VentaProductoStock1787458216007 implements MigrationInterface {
  name = 'VentaProductoStock1787458216007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ventas" ADD COLUMN "productoId" integer;
    `);
    await queryRunner.query(`
      ALTER TABLE "ventas" ADD COLUMN "cantidad" integer NOT NULL DEFAULT 1;
    `);
    // ON DELETE SET NULL: si el producto se elimina del catálogo, el
    // historial de ventas se conserva (con productoId en null) en vez de
    // borrarse o bloquear el delete del producto.
    await queryRunner.query(`
      ALTER TABLE "ventas"
      ADD CONSTRAINT "FK_ventas_producto"
      FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE SET NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "ventas" DROP CONSTRAINT "FK_ventas_producto";`);
    await queryRunner.query(`ALTER TABLE "ventas" DROP COLUMN "cantidad";`);
    await queryRunner.query(`ALTER TABLE "ventas" DROP COLUMN "productoId";`);
  }
}
