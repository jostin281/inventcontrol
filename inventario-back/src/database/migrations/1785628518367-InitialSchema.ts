import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Esquema inicial para PostgreSQL, generado a mano a partir de las entidades
 * (no se pudo usar `migration:generate` porque no hay un Postgres disponible
 * en este entorno). Antes de usarla en un proyecto con datos reales,
 * revísala contra las entidades actuales en src/**\/*.entity.ts.
 */
export class InitialSchema1785628518367 implements MigrationInterface {
  name = 'InitialSchema1785628518367';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "usuarios" (
        "id" SERIAL PRIMARY KEY,
        "companyId" integer,
        "nombre" varchar(150) NOT NULL,
        "correo" varchar(150) NOT NULL,
        "contrasena" varchar NOT NULL,
        "rol" varchar NOT NULL DEFAULT 'usuario',
        "nombreNegocio" varchar(100),
        "tipoNegocio" varchar(50),
        "activo" boolean NOT NULL DEFAULT true,
        "creadoEn" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_usuarios_correo" UNIQUE ("correo")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "categorias" (
        "id" SERIAL PRIMARY KEY,
        "companyId" integer NOT NULL,
        "nombre" varchar(100) NOT NULL,
        "descripcion" varchar(255) NOT NULL DEFAULT '',
        "icono" varchar(50) NOT NULL DEFAULT 'category',
        "color" varchar(20) NOT NULL DEFAULT '#f0f0f7',
        "colorIcono" varchar(20) NOT NULL DEFAULT '#333333'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "productos" (
        "id" SERIAL PRIMARY KEY,
        "companyId" integer NOT NULL,
        "nombre" varchar(200) NOT NULL,
        "categoria" varchar(100) NOT NULL DEFAULT '',
        "stock" integer NOT NULL DEFAULT 0,
        "stockMax" integer NOT NULL DEFAULT 20,
        "precio" real NOT NULL DEFAULT 0,
        "proveedor" varchar(150) NOT NULL DEFAULT '',
        "sku" varchar(50) NOT NULL DEFAULT '',
        "descripcion" text NOT NULL DEFAULT '',
        "imagen" varchar(255) NOT NULL DEFAULT '',
        "categoriaColor" varchar(20) NOT NULL DEFAULT '#f0f0f7',
        "ultimaActualizacion" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "proveedores" (
        "id" SERIAL PRIMARY KEY,
        "companyId" integer NOT NULL,
        "nombre" varchar(150) NOT NULL,
        "categoria" varchar(100) NOT NULL DEFAULT '',
        "contacto" varchar(150) NOT NULL DEFAULT '',
        "telefono" varchar(30) NOT NULL DEFAULT '',
        "correo" varchar(150) NOT NULL DEFAULT '',
        "productosJson" text NOT NULL DEFAULT '[]',
        "calificacion" real NOT NULL DEFAULT 5.0,
        "activo" boolean NOT NULL DEFAULT true,
        "tiempoEntregaDias" integer NOT NULL DEFAULT 5,
        "confiabilidad" integer NOT NULL DEFAULT 90,
        "ultimaAuditoria" TIMESTAMP,
        "proximaAuditoria" TIMESTAMP,
        "gradienteColor" varchar(200) NOT NULL DEFAULT 'linear-gradient(135deg, #24389c, #3f51b5)',
        "iniciales" varchar(5) NOT NULL DEFAULT 'P'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "movimientos" (
        "id" SERIAL PRIMARY KEY,
        "companyId" integer NOT NULL,
        "fecha" TIMESTAMP NOT NULL DEFAULT now(),
        "producto" varchar(200) NOT NULL,
        "sku" varchar(50) NOT NULL DEFAULT '',
        "tipo" varchar NOT NULL DEFAULT 'Entrada',
        "cantidad" integer NOT NULL,
        "usuario" varchar(150) NOT NULL,
        "nota" text,
        "colorProducto" varchar(20) NOT NULL DEFAULT '#f0f0f7'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "ventas" (
        "id" SERIAL PRIMARY KEY,
        "companyId" integer NOT NULL,
        "cliente" varchar(150) NOT NULL,
        "producto" varchar(200) NOT NULL,
        "total" real NOT NULL,
        "fecha" varchar(50) NOT NULL,
        "estado" varchar(50) NOT NULL DEFAULT 'Completada'
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "ventas";`);
    await queryRunner.query(`DROP TABLE "movimientos";`);
    await queryRunner.query(`DROP TABLE "proveedores";`);
    await queryRunner.query(`DROP TABLE "productos";`);
    await queryRunner.query(`DROP TABLE "categorias";`);
    await queryRunner.query(`DROP TABLE "usuarios";`);
  }
}
