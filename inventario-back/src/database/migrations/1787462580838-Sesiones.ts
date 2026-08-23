import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tabla "sesiones": un registro por cada login/registro exitoso, usado para
 * mostrar en Configuración > Seguridad y Acceso las sesiones activas reales
 * (dispositivo, IP, fecha) y permitir revocarlas. El JWT de cada sesión
 * lleva su "jti" en el payload; en cada petición autenticada se comprueba
 * que la sesión siga "activa" antes de aceptar el token (ver jwt.strategy.ts).
 */
export class Sesiones1787462580838 implements MigrationInterface {
  name = 'Sesiones1787462580838';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "sesiones" (
        "id" SERIAL PRIMARY KEY,
        "usuarioId" integer NOT NULL,
        "jti" varchar(64) NOT NULL,
        "dispositivo" varchar(200) NOT NULL,
        "tipo" varchar(20) NOT NULL DEFAULT 'escritorio',
        "ip" varchar(100),
        "activa" boolean NOT NULL DEFAULT true,
        "creadaEn" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_sesiones_jti" UNIQUE ("jti"),
        CONSTRAINT "FK_sesiones_usuario" FOREIGN KEY ("usuarioId")
          REFERENCES "usuarios"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_sesiones_usuarioId" ON "sesiones" ("usuarioId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_sesiones_usuarioId";`);
    await queryRunner.query(`DROP TABLE "sesiones";`);
  }
}
