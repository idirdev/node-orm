export enum FieldType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  DATE = 'DATE',
  JSON = 'JSON',
  TEXT = 'TEXT',
  INTEGER = 'INTEGER',
  FLOAT = 'FLOAT',
}

export interface FieldConfig {
  type: FieldType;
  nullable?: boolean;
  unique?: boolean;
  defaultValue?: unknown;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  length?: number;
  columnName?: string;
}

export interface ModelConfig {
  tableName: string;
  timestamps?: boolean;
  softDelete?: boolean;
}

export type WhereOperator = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN' | 'NOT IN' | 'IS NULL' | 'IS NOT NULL' | 'BETWEEN';

export interface WhereClause {
  field: string;
  operator: WhereOperator;
  value: unknown;
  logic?: 'AND' | 'OR';
}

export type OrderDirection = 'ASC' | 'DESC';

export interface OrderClause {
  field: string;
  direction: OrderDirection;
}

export interface JoinClause {
  table: string;
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  on: { left: string; right: string };
}

export interface QueryOptions {
  where?: WhereClause[];
  orderBy?: OrderClause[];
  limit?: number;
  offset?: number;
  select?: string[];
  include?: string[];
  groupBy?: string[];
  having?: WhereClause[];
}

export interface RelationConfig {
  type: 'hasMany' | 'belongsTo' | 'hasOne';
  target: () => Function;
  foreignKey: string;
  localKey?: string;
}

export interface ConnectionConfig {
  dialect: 'sqlite' | 'postgres' | 'mysql';
  host?: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  pool?: { min: number; max: number };
  logging?: boolean;
}

export interface TransactionHandle {
  commit(): Promise<void>;
  rollback(): Promise<void>;
  execute(sql: string, params?: unknown[]): Promise<unknown[]>;
}

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  unique: boolean;
  primaryKey: boolean;
  autoIncrement: boolean;
  defaultValue?: unknown;
  references?: { table: string; column: string };
}

export interface TableDefinition {
  name: string;
  columns: ColumnDefinition[];
  indexes: IndexDefinition[];
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  unique: boolean;
}
