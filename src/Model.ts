import { Connection } from './Connection';
import { QueryBuilder } from './QueryBuilder';
import { getEntityMetadata, getFieldsMetadata } from './decorators';
import { QueryOptions, WhereClause } from './types';

export abstract class Model {
  [key: string]: unknown;

  private static getTableName(): string {
    const meta = getEntityMetadata(this.prototype);
    if (!meta) throw new Error(`No @Entity decorator found on ${this.name}`);
    return meta.tableName;
  }

  private static getFields(): Map<string, unknown> {
    return getFieldsMetadata(this.prototype);
  }

  static async find<T extends Model>(this: new () => T, id: number | string): Promise<T | null> {
    const table = (this as any).getTableName();
    const rows = await Connection.execute<Record<string, unknown>>(
      `SELECT * FROM ${table} WHERE id = ? LIMIT 1`,
      [id]
    );
    if (rows.length === 0) return null;
    return Model.hydrate<T>(this, rows[0]);
  }

  static async findAll<T extends Model>(
    this: new () => T,
    options: QueryOptions = {}
  ): Promise<T[]> {
    const table = (this as any).getTableName();
    const qb = new QueryBuilder(table);

    if (options.select) qb.select(...options.select);
    if (options.where) {
      for (const clause of options.where) {
        qb.where(clause.field, clause.operator, clause.value);
      }
    }
    if (options.orderBy) {
      for (const order of options.orderBy) {
        qb.orderBy(order.field, order.direction);
      }
    }
    if (options.limit) qb.limit(options.limit);
    if (options.offset) qb.offset(options.offset);
    if (options.groupBy) qb.groupBy(...options.groupBy);

    const rows = await qb.execute<Record<string, unknown>>();
    return rows.map(row => Model.hydrate<T>(this, row));
  }

  static async findOne<T extends Model>(
    this: new () => T,
    where: Partial<Record<string, unknown>>
  ): Promise<T | null> {
    const table = (this as any).getTableName();
    const keys = Object.keys(where);
    const conditions = keys.map(k => `${k} = ?`).join(' AND ');
    const values = keys.map(k => where[k]);

    const rows = await Connection.execute<Record<string, unknown>>(
      `SELECT * FROM ${table} WHERE ${conditions} LIMIT 1`,
      values
    );
    if (rows.length === 0) return null;
    return Model.hydrate<T>(this, rows[0]);
  }

  static async create<T extends Model>(
    this: new () => T,
    data: Partial<Record<string, unknown>>
  ): Promise<T> {
    const table = (this as any).getTableName();
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map(k => data[k]);

    const result = await Connection.execute<Record<string, unknown>>(
      `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    return Model.hydrate<T>(this, result[0] || data as Record<string, unknown>);
  }

  static async update<T extends Model>(
    this: new () => T,
    id: number | string,
    data: Partial<Record<string, unknown>>
  ): Promise<T | null> {
    const table = (this as any).getTableName();
    const keys = Object.keys(data);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = [...keys.map(k => data[k]), id];

    const result = await Connection.execute<Record<string, unknown>>(
      `UPDATE ${table} SET ${setClause} WHERE id = ? RETURNING *`,
      values
    );
    if (result.length === 0) return null;
    return Model.hydrate<T>(this, result[0]);
  }

  static async delete(id: number | string): Promise<boolean> {
    const table = (this as any).getTableName();
    const result = await Connection.execute(
      `DELETE FROM ${table} WHERE id = ?`,
      [id]
    );
    return Array.isArray(result) && result.length > 0;
  }

  static async count(): Promise<number> {
    const table = (this as any).getTableName();
    const result = await Connection.execute<{ count: number }>(
      `SELECT COUNT(*) AS count FROM ${table}`
    );
    return result[0]?.count ?? 0;
  }

  static async exists(id: number | string): Promise<boolean> {
    const table = (this as any).getTableName();
    const result = await Connection.execute<{ count: number }>(
      `SELECT COUNT(*) AS count FROM ${table} WHERE id = ?`,
      [id]
    );
    return (result[0]?.count ?? 0) > 0;
  }

  static async bulkCreate<T extends Model>(
    this: new () => T,
    records: Partial<Record<string, unknown>>[]
  ): Promise<T[]> {
    if (records.length === 0) return [];
    const results: T[] = [];
    await Connection.transaction(async (handle) => {
      for (const record of records) {
        const keys = Object.keys(record);
        const placeholders = keys.map(() => '?').join(', ');
        const values = keys.map(k => record[k]);
        const table = (this as any).getTableName();
        const rows = await handle.execute(
          `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
          values
        );
        results.push(Model.hydrate<T>(this, (rows as Record<string, unknown>[])[0] || record as Record<string, unknown>));
      }
    });
    return results;
  }

  async save(): Promise<this> {
    const constructor = this.constructor as typeof Model & (new () => Model);
    const table = (constructor as any).getTableName();
    const fields = (constructor as any).getFields() as Map<string, unknown>;
    const data: Record<string, unknown> = {};

    for (const [key] of fields) {
      if (key !== 'id' && this[key] !== undefined) {
        data[key] = this[key];
      }
    }

    if (this['id']) {
      const keys = Object.keys(data);
      const setClause = keys.map(k => `${k} = ?`).join(', ');
      const values = [...keys.map(k => data[k]), this['id']];
      await Connection.execute(
        `UPDATE ${table} SET ${setClause} WHERE id = ?`,
        values
      );
    } else {
      const keys = Object.keys(data);
      const placeholders = keys.map(() => '?').join(', ');
      const values = keys.map(k => data[k]);
      const result = await Connection.execute<Record<string, unknown>>(
        `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      if (result[0]) Object.assign(this, result[0]);
    }

    return this;
  }

  toJSON(): Record<string, unknown> {
    const constructor = this.constructor as typeof Model;
    const fields = (constructor as any).getFields() as Map<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [key] of fields) {
      result[key] = this[key];
    }
    return result;
  }

  private static hydrate<T extends Model>(ctor: new () => T, data: Record<string, unknown>): T {
    const instance = new ctor();
    Object.assign(instance, data);
    return instance;
  }
}
