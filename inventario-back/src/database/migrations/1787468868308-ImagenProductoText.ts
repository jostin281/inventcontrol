import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * "productos.imagen" era varchar(255) — insuficiente para el data URL
 * base64 que manda el formulario "Nuevo Producto" (siempre pasa de miles
 * de caracteres para una foto real). Con varchar(255), Postgres rechazaba
 * el INSERT/UPDATE con "value too long for type character varying(255)" en
 * cuanto el usuario elegía una imagen, así que "Nuevo Producto" con foto
 * nunca guardaba nada (con o sin foto es la única diferencia). Se amplía a
 * "text" (sin límite de longitud fija), igual que "usuarios.logo".
 */
export class ImagenProductoText1787468868308 implements MigrationInterface {
  name = 'ImagenProductoText1787468868308';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "productos" ALTER COLUMN "imagen" TYPE text;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "productos" ALTER COLUMN "imagen" TYPE varchar(255);
    `);
  }
}
