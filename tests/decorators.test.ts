import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { Entity, Field, PrimaryKey, getEntityMetadata, getFieldsMetadata } from '../src/decorators';
import { FieldType } from '../src/types';

@Entity('test_users')
class TestUser {
  @PrimaryKey
  @Field({ type: FieldType.INTEGER })
  id!: number;

  @Field({ type: FieldType.STRING })
  name!: string;
}

describe('decorators', () => {
  it('registers entity metadata', () => {
    const meta = getEntityMetadata(TestUser.prototype);
    expect(meta).toBeDefined();
    expect(meta!.tableName).toBe('test_users');
  });
  it('registers field metadata', () => {
    const fields = getFieldsMetadata(TestUser.prototype);
    expect(fields).toBeDefined();
    expect(fields instanceof Map).toBe(true);
    expect(fields.size).toBeGreaterThan(0);
  });
  it('includes primary key field', () => {
    const fields = getFieldsMetadata(TestUser.prototype);
    const idField = fields.get('id');
    expect(idField).toBeDefined();
    expect(idField!.primaryKey).toBe(true);
  });
  it('stores field type correctly', () => {
    const fields = getFieldsMetadata(TestUser.prototype);
    const nameField = fields.get('name');
    expect(nameField).toBeDefined();
    expect(nameField!.type).toBe(FieldType.STRING);
  });
});
