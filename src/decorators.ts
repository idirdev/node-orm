import 'reflect-metadata';
import { FieldConfig, FieldType, RelationConfig } from './types';

const ENTITY_KEY = 'orm:entity';
const FIELDS_KEY = 'orm:fields';
const RELATIONS_KEY = 'orm:relations';

export function Entity(tableName: string): ClassDecorator {
  return function (target: Function) {
    Reflect.defineMetadata(ENTITY_KEY, { tableName }, target.prototype);
  };
}

export function Field(config: Partial<FieldConfig> = {}): PropertyDecorator {
  return function (target: Object, propertyKey: string | symbol) {
    const fields: Map<string, FieldConfig> = Reflect.getMetadata(FIELDS_KEY, target) || new Map();
    const existingConfig = fields.get(String(propertyKey)) || { type: FieldType.STRING };
    fields.set(String(propertyKey), { ...existingConfig, ...config });
    Reflect.defineMetadata(FIELDS_KEY, fields, target);
  };
}

export function PrimaryKey(target: Object, propertyKey: string | symbol): void {
  const fields: Map<string, FieldConfig> = Reflect.getMetadata(FIELDS_KEY, target) || new Map();
  const existing = fields.get(String(propertyKey)) || { type: FieldType.INTEGER };
  fields.set(String(propertyKey), { ...existing, primaryKey: true });
  Reflect.defineMetadata(FIELDS_KEY, fields, target);
}

export function AutoIncrement(target: Object, propertyKey: string | symbol): void {
  const fields: Map<string, FieldConfig> = Reflect.getMetadata(FIELDS_KEY, target) || new Map();
  const existing = fields.get(String(propertyKey)) || { type: FieldType.INTEGER };
  fields.set(String(propertyKey), { ...existing, autoIncrement: true });
  Reflect.defineMetadata(FIELDS_KEY, fields, target);
}

export function Nullable(target: Object, propertyKey: string | symbol): void {
  const fields: Map<string, FieldConfig> = Reflect.getMetadata(FIELDS_KEY, target) || new Map();
  const existing = fields.get(String(propertyKey)) || { type: FieldType.STRING };
  fields.set(String(propertyKey), { ...existing, nullable: true });
  Reflect.defineMetadata(FIELDS_KEY, fields, target);
}

export function Unique(target: Object, propertyKey: string | symbol): void {
  const fields: Map<string, FieldConfig> = Reflect.getMetadata(FIELDS_KEY, target) || new Map();
  const existing = fields.get(String(propertyKey)) || { type: FieldType.STRING };
  fields.set(String(propertyKey), { ...existing, unique: true });
  Reflect.defineMetadata(FIELDS_KEY, fields, target);
}

export function Default(value: unknown): PropertyDecorator {
  return function (target: Object, propertyKey: string | symbol) {
    const fields: Map<string, FieldConfig> = Reflect.getMetadata(FIELDS_KEY, target) || new Map();
    const existing = fields.get(String(propertyKey)) || { type: FieldType.STRING };
    fields.set(String(propertyKey), { ...existing, defaultValue: value });
    Reflect.defineMetadata(FIELDS_KEY, fields, target);
  };
}

export function HasMany(target: () => Function, foreignKey: string): PropertyDecorator {
  return function (obj: Object, propertyKey: string | symbol) {
    const relations: Map<string, RelationConfig> = Reflect.getMetadata(RELATIONS_KEY, obj) || new Map();
    relations.set(String(propertyKey), { type: 'hasMany', target, foreignKey });
    Reflect.defineMetadata(RELATIONS_KEY, relations, obj);
  };
}

export function BelongsTo(target: () => Function, foreignKey: string): PropertyDecorator {
  return function (obj: Object, propertyKey: string | symbol) {
    const relations: Map<string, RelationConfig> = Reflect.getMetadata(RELATIONS_KEY, obj) || new Map();
    relations.set(String(propertyKey), { type: 'belongsTo', target, foreignKey });
    Reflect.defineMetadata(RELATIONS_KEY, relations, obj);
  };
}

// Utility to extract metadata
export function getEntityMetadata(target: Object): { tableName: string } | undefined {
  return Reflect.getMetadata(ENTITY_KEY, target);
}

export function getFieldsMetadata(target: Object): Map<string, FieldConfig> {
  return Reflect.getMetadata(FIELDS_KEY, target) || new Map();
}

export function getRelationsMetadata(target: Object): Map<string, RelationConfig> {
  return Reflect.getMetadata(RELATIONS_KEY, target) || new Map();
}
