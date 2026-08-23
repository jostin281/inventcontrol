import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * "Perfil del negocio" de Configuración (dirección, zona horaria, moneda,
 * correo de operaciones y logo) — antes era solo una maqueta visual que no
 * se guardaba en ningún lado. Estos campos viven en la fila del admin
 * dueño de la empresa (usuarios.id === usuarios.companyId); ver
 * AuthService.generarToken y OrganizacionService.actualizarPerfilNegocio.
 */
export class PerfilNegocio1787466894024 implements MigrationInterface {
  name = 'PerfilNegocio1787466894024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuarios"
        ADD COLUMN "direccion" varchar(300),
        ADD COLUMN "zona" varchar(50),
        ADD COLUMN "moneda" varchar(10),
        ADD COLUMN "correoOperaciones" varchar(150),
        ADD COLUMN "logo" text;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuarios"
        DROP COLUMN "direccion",
        DROP COLUMN "zona",
        DROP COLUMN "moneda",
        DROP COLUMN "correoOperaciones",
        DROP COLUMN "logo";
    `);
  }
}
