import { MigrationInterface, QueryRunner } from 'typeorm';

export class VentaMetodoPago1787480000000 implements MigrationInterface {
  name = 'VentaMetodoPago1787480000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ventas" ADD COLUMN IF NOT EXISTS "metodoPago" varchar(50) NOT NULL DEFAULT 'Efectivo';
    `);
    await queryRunner.query(`
      ALTER TABLE "ventas" ADD COLUMN IF NOT EXISTS "folio" varchar(100);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "ventas" DROP COLUMN IF EXISTS "folio";`);
    await queryRunner.query(`ALTER TABLE "ventas" DROP COLUMN IF EXISTS "metodoPago";`);
  }
}
