import 'reflect-metadata';

export { FieldType } from './types';
export type {
  FieldConfig, ModelConfig, QueryOptions, WhereClause,
  WhereOperator, OrderDirection, RelationConfig,
} from './types';

export {
  Entity, Field, PrimaryKey, AutoIncrement,
  Nullable, Unique, Default, HasMany, BelongsTo,
} from './decorators';

export { QueryBuilder } from './QueryBuilder';
export { Model } from './Model';
export { Connection } from './Connection';
export { Migration, MigrationRunner } from './Migration';
export { Schema } from './Schema';
export { RelationBuilder } from './Relations';
export { required, minLength, maxLength, email, min, max, pattern, validate } from './validators';
export { createSQLiteConnection } from './drivers/sqlite';
