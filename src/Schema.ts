import { getEntityMetadata, getFieldsMetadata, getRelationsMetadata } from './decorators';
import { FieldConfig, FieldType, ColumnDefinition, TableDefinition, IndexDefinition } from './types';

const SQL_TYPE_MAP: Record<FieldType, string> = {
  [FieldType.STRING]: 'VARCHAR(255)',
  [FieldType.TEXT]: 'TEXT',
  [FieldType.NUMBER]: 'NUMERIC',
  [FieldType.INTEGER]: 'INTEGER',
  [FieldType.FLOAT]: 'REAL',
  [FieldType.BOOLEAN]: 'BOOLEAN',
  [FieldType.DATE]: 'TIMESTAMP',
  [FieldType.JSON]: 'JSONB',
};

export class Schema {
  static define(modelClass: Function): TableDefinition {
    const entity = getEntityMetadata(modelClass.prototype);
    if (!entity) throw new Error(`No @Entity decorator on ${modelClass.name}`);

    const fields = getFieldsMetadata(modelClass.prototype);
    const relations = getRelationsMetadata(modelClass.prototype);
    const columns: ColumnDefinition[] = [];
    const indexes: IndexDefinition[] = [];

    for (const [name, config] of fields) {
      const col: ColumnDefinition = {
        name: (config as FieldConfig).columnName || name,
        type: SQL_TYPE_MAP[(config as FieldConfig).type] || 'TEXT',
        nullable: (config as FieldConfig).nullable ?? false,
        unique: (config as FieldConfig).unique ?? false,
        primaryKey: (config as FieldConfig).primaryKey ?? false,
        autoIncrement: (config as FieldConfig).autoIncrement ?? false,
        defaultValue: (config as FieldConfig).defaultValue,
      };
      columns.push(col);

      if (col.unique && !col.primaryKey) {
        indexes.push({
          name: `idx_${entity.tableName}_${col.name}_unique`,
          columns: [col.name],
          unique: true,
        });
      }
    }

    // Add foreign keys from belongsTo relations
    for (const [, rel] of relations) {
      if (rel.type === 'belongsTo') {
        const targetEntity = getEntityMetadata((rel.target() as Function).prototype);
        if (targetEntity) {
          const fkCol = columns.find(c => c.name === rel.foreignKey);
          if (fkCol) {
            fkCol.references = { table: targetEntity.tableName, column: rel.localKey || 'id' };
          }
        }
      }
    }

    return { name: entity.tableName, columns, indexes };
  }

  static generateCreateSQL(modelClass: Function): string {
    const def = this.define(modelClass);
    const colDefs = def.columns.map(col => {
      let sql = `  ${col.name} ${col.type}`;
      if (col.primaryKey) sql += ' PRIMARY KEY';
      if (col.autoIncrement) sql += ' AUTOINCREMENT';
      if (!col.nullable && !col.primaryKey) sql += ' NOT NULL';
      if (col.unique && !col.primaryKey) sql += ' UNIQUE';
      if (col.defaultValue !== undefined) {
        sql += ` DEFAULT ${Schema.formatDefault(col.defaultValue)}`;
      }
      if (col.references) {
        sql += ` REFERENCES ${col.references.table}(${col.references.column})`;
      }
      return sql;
    });

    let createSQL = `CREATE TABLE IF NOT EXISTS ${def.name} (\n${colDefs.join(',\n')}\n)`;
    const indexStatements = def.indexes.map(idx => {
      const unique = idx.unique ? 'UNIQUE ' : '';
      return `CREATE ${unique}INDEX IF NOT EXISTS ${idx.name} ON ${def.name} (${idx.columns.join(', ')})`;
    });

    return [createSQL, ...indexStatements].join(';\n');
  }

  static generateDropSQL(modelClass: Function): string {
    const entity = getEntityMetadata(modelClass.prototype);
    if (!entity) throw new Error(`No @Entity decorator on ${modelClass.name}`);
    return `DROP TABLE IF EXISTS ${entity.tableName}`;
  }

  private static formatDefault(value: unknown): string {
    if (typeof value === 'string') return `'${value}'`;
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (value === null) return 'NULL';
    return String(value);
  }
}
