import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega los campos "qrPagoImagen" y "transferenciaImagen" a la tabla "usuarios"
 * para almacenar de forma independiente y sincronizar con la nube las imágenes
 * de Pago por QR y Transferencia Bancaria del negocio.
 */
export class ImagenesPagoQrTransferencia1787490000000 implements MigrationInterface {
  name = 'ImagenesPagoQrTransferencia1787490000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuarios"
        ADD COLUMN IF NOT EXISTS "qrPagoImagen" text,
        ADD COLUMN IF NOT EXISTS "transferenciaImagen" text;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuarios"
        DROP COLUMN IF EXISTS "qrPagoImagen",
        DROP COLUMN IF EXISTS "transferenciaImagen";
    `);
  }
}
