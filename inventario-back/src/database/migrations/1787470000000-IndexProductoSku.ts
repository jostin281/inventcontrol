import { MigrationInterface, QueryRunner } from 'typeorm';

export class IndexProductoSku1787470000000 implements MigrationInterface {
  name = 'IndexProductoSku1787470000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX "IDX_productos_company_sku" ON "productos" ("companyId", "sku");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "IDX_productos_company_sku";
    `);
  }
}
