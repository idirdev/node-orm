import { WhereClause, WhereOperator, OrderDirection, JoinClause } from './types';
import { Connection } from './Connection';

export class QueryBuilder {
  private tableName: string;
  private selectFields: string[] = ['*'];
  private whereClauses: WhereClause[] = [];
  private orderClauses: { field: string; direction: OrderDirection }[] = [];
  private limitValue?: number;
  private offsetValue?: number;
  private groupByFields: string[] = [];
  private havingClauses: WhereClause[] = [];
  private joinClauses: JoinClause[] = [];
  private params: unknown[] = [];

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  static table(name: string): QueryBuilder {
    return new QueryBuilder(name);
  }

  select(...fields: string[]): this {
    this.selectFields = fields.length > 0 ? fields : ['*'];
    return this;
  }

  where(field: string, operator: WhereOperator, value: unknown): this {
    this.whereClauses.push({ field, operator, value, logic: 'AND' });
    return this;
  }

  andWhere(field: string, operator: WhereOperator, value: unknown): this {
    this.whereClauses.push({ field, operator, value, logic: 'AND' });
    return this;
  }

  orWhere(field: string, operator: WhereOperator, value: unknown): this {
    this.whereClauses.push({ field, operator, value, logic: 'OR' });
    return this;
  }

  orderBy(field: string, direction: OrderDirection = 'ASC'): this {
    this.orderClauses.push({ field, direction });
    return this;
  }

  limit(count: number): this {
    this.limitValue = count;
    return this;
  }

  offset(count: number): this {
    this.offsetValue = count;
    return this;
  }

  groupBy(...fields: string[]): this {
    this.groupByFields = fields;
    return this;
  }

  having(field: string, operator: WhereOperator, value: unknown): this {
    this.havingClauses.push({ field, operator, value, logic: 'AND' });
    return this;
  }

  join(table: string, leftCol: string, rightCol: string, type: JoinClause['type'] = 'INNER'): this {
    this.joinClauses.push({ table, type, on: { left: leftCol, right: rightCol } });
    return this;
  }

  count(field: string = '*'): this {
    this.selectFields = [`COUNT(${field}) AS count`];
    return this;
  }

  sum(field: string): this {
    this.selectFields = [`SUM(${field}) AS sum`];
    return this;
  }

  avg(field: string): this {
    this.selectFields = [`AVG(${field}) AS avg`];
    return this;
  }

  toSQL(): { sql: string; params: unknown[] } {
    this.params = [];
    const parts: string[] = [];

    // SELECT
    parts.push(`SELECT ${this.selectFields.join(', ')}`);
    parts.push(`FROM ${this.tableName}`);

    // JOINs
    for (const join of this.joinClauses) {
      parts.push(`${join.type} JOIN ${join.table} ON ${join.on.left} = ${join.on.right}`);
    }

    // WHERE
    if (this.whereClauses.length > 0) {
      const conditions = this.whereClauses.map((clause, index) => {
        const condition = this.buildCondition(clause);
        if (index === 0) return condition;
        return `${clause.logic} ${condition}`;
      });
      parts.push(`WHERE ${conditions.join(' ')}`);
    }

    // GROUP BY
    if (this.groupByFields.length > 0) {
      parts.push(`GROUP BY ${this.groupByFields.join(', ')}`);
    }

    // HAVING
    if (this.havingClauses.length > 0) {
      const conditions = this.havingClauses.map((clause, index) => {
        const condition = this.buildCondition(clause);
        if (index === 0) return condition;
        return `${clause.logic} ${condition}`;
      });
      parts.push(`HAVING ${conditions.join(' ')}`);
    }

    // ORDER BY
    if (this.orderClauses.length > 0) {
      const orders = this.orderClauses.map(o => `${o.field} ${o.direction}`);
      parts.push(`ORDER BY ${orders.join(', ')}`);
    }

    // LIMIT & OFFSET
    if (this.limitValue !== undefined) {
      parts.push(`LIMIT ?`);
      this.params.push(this.limitValue);
    }
    if (this.offsetValue !== undefined) {
      parts.push(`OFFSET ?`);
      this.params.push(this.offsetValue);
    }

    return { sql: parts.join(' '), params: [...this.params] };
  }

  private buildCondition(clause: WhereClause): string {
    if (clause.operator === 'IS NULL') {
      return `${clause.field} IS NULL`;
    }
    if (clause.operator === 'IS NOT NULL') {
      return `${clause.field} IS NOT NULL`;
    }
    if (clause.operator === 'IN' || clause.operator === 'NOT IN') {
      const values = clause.value as unknown[];
      const placeholders = values.map(() => '?').join(', ');
      this.params.push(...values);
      return `${clause.field} ${clause.operator} (${placeholders})`;
    }
    if (clause.operator === 'BETWEEN') {
      const [low, high] = clause.value as [unknown, unknown];
      this.params.push(low, high);
      return `${clause.field} BETWEEN ? AND ?`;
    }
    this.params.push(clause.value);
    return `${clause.field} ${clause.operator} ?`;
  }

  async execute<T = unknown>(): Promise<T[]> {
    const { sql, params } = this.toSQL();
    return Connection.execute<T>(sql, params);
  }
}
