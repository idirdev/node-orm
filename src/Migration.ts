import { Connection } from './Connection';
import { FieldType } from './types';

const TYPE_MAP: Record<FieldType, string> = {
  [FieldType.STRING]: 'VARCHAR(255)',
  [FieldType.TEXT]: 'TEXT',
  [FieldType.NUMBER]: 'NUMERIC',
  [FieldType.INTEGER]: 'INTEGER',
  [FieldType.FLOAT]: 'REAL',
  [FieldType.BOOLEAN]: 'BOOLEAN',
  [FieldType.DATE]: 'TIMESTAMP',
  [FieldType.JSON]: 'JSONB',
};

export abstract class Migration {
  protected statements: string[] = [];

  abstract up(): void;
  abstract down(): void;

  createTable(name: string, columns: (builder: TableBuilder) => void): void {
    const builder = new TableBuilder(name);
    columns(builder);
    this.statements.push(builder.toSQL());
  }

  dropTable(name: string): void {
    this.statements.push(`DROP TABLE IF EXISTS ${name}`);
  }

  addColumn(table: string, name: string, type: FieldType, options: ColumnOptions = {}): void {
    let sql = `ALTER TABLE ${table} ADD COLUMN ${name} ${TYPE_MAP[type] || 'TEXT'}`;
    if (options.nullable === false) sql += ' NOT NULL';
    if (options.defaultValue !== undefined) sql += ` DEFAULT ${this.formatDefault(options.defaultValue)}`;
    if (options.unique) sql += ' UNIQUE';
    this.statements.push(sql);
  }

  removeColumn(table: string, name: string): void {
    this.statements.push(`ALTER TABLE ${table} DROP COLUMN ${name}`);
  }

  renameColumn(table: string, oldName: string, newName: string): void {
    this.statements.push(`ALTER TABLE ${table} RENAME COLUMN ${oldName} TO ${newName}`);
  }

  addIndex(table: string, columns: string[], options: { unique?: boolean; name?: string } = {}): void {
    const indexName = options.name || `idx_${table}_${columns.join('_')}`;
    const unique = options.unique ? 'UNIQUE ' : '';
    this.statements.push(`CREATE ${unique}INDEX ${indexName} ON ${table} (${columns.join(', ')})`);
  }

  dropIndex(name: string): void {
    this.statements.push(`DROP INDEX IF EXISTS ${name}`);
  }

  getStatements(): string[] {
    return [...this.statements];
  }

  private formatDefault(value: unknown): string {
    if (typeof value === 'string') return `'${value}'`;
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (value === null) return 'NULL';
    return String(value);
  }
}

interface ColumnOptions {
  nullable?: boolean;
  unique?: boolean;
  defaultValue?: unknown;
}

class TableBuilder {
  private columns: string[] = [];
  private constraints: string[] = [];
  private tableName: string;

  constructor(name: string) {
    this.tableName = name;
  }

  id(): this {
    this.columns.push('id SERIAL PRIMARY KEY');
    return this;
  }

  column(name: string, type: FieldType, options: ColumnOptions = {}): this {
    let sql = `${name} ${TYPE_MAP[type] || 'TEXT'}`;
    if (options.nullable === false) sql += ' NOT NULL';
    if (options.unique) sql += ' UNIQUE';
    if (options.defaultValue !== undefined) {
      const val = options.defaultValue;
      sql += ` DEFAULT ${typeof val === 'string' ? `'${val}'` : val}`;
    }
    this.columns.push(sql);
    return this;
  }

  timestamps(): this {
    this.columns.push('created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    this.columns.push('updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    return this;
  }

  foreignKey(column: string, references: { table: string; column: string }): this {
    this.constraints.push(
      `FOREIGN KEY (${column}) REFERENCES ${references.table}(${references.column})`
    );
    return this;
  }

  toSQL(): string {
    const all = [...this.columns, ...this.constraints];
    return `CREATE TABLE IF NOT EXISTS ${this.tableName} (\n  ${all.join(',\n  ')}\n)`;
  }
}

export class MigrationRunner {
  private migrations: Array<{ name: string; migration: Migration }> = [];

  register(name: string, migration: Migration): void {
    this.migrations.push({ name, migration });
  }

  async up(): Promise<void> {
    await this.ensureVersionTable();

    for (const { name, migration } of this.migrations) {
      const applied = await this.isApplied(name);
      if (applied) {
        console.log(`[Migration] Skipping ${name} (already applied)`);
        continue;
      }

      console.log(`[Migration] Running ${name}...`);
      migration.up();
      for (const sql of migration.getStatements()) {
        await Connection.execute(sql);
      }
      await Connection.execute(
        'INSERT INTO orm_migrations (name, applied_at) VALUES (?, ?)',
        [name, new Date().toISOString()]
      );
      console.log(`[Migration] Applied ${name}`);
    }
  }

  async down(steps: number = 1): Promise<void> {
    const applied = await Connection.execute<{ name: string }>(
      'SELECT name FROM orm_migrations ORDER BY applied_at DESC LIMIT ?',
      [steps]
    );

    for (const { name: migrationName } of applied) {
      const entry = this.migrations.find(m => m.name === migrationName);
      if (!entry) {
        console.log(`[Migration] Warning: ${migrationName} not found in registered migrations`);
        continue;
      }

      console.log(`[Migration] Rolling back ${migrationName}...`);
      entry.migration.down();
      for (const sql of entry.migration.getStatements()) {
        await Connection.execute(sql);
      }
      await Connection.execute('DELETE FROM orm_migrations WHERE name = ?', [migrationName]);
      console.log(`[Migration] Rolled back ${migrationName}`);
    }
  }

  private async ensureVersionTable(): Promise<void> {
    await Connection.execute(`
      CREATE TABLE IF NOT EXISTS orm_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP NOT NULL
      )
    `);
  }

  private async isApplied(name: string): Promise<boolean> {
    const result = await Connection.execute<{ count: number }>(
      'SELECT COUNT(*) AS count FROM orm_migrations WHERE name = ?',
      [name]
    );
    return (result[0]?.count ?? 0) > 0;
  }
}
