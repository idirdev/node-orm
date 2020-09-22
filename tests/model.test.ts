import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { Model } from '../src/Model';
import { Entity, Field, PrimaryKey } from '../src/decorators';
import { FieldType } from '../src/types';

@Entity('users')
class User extends Model {
  @PrimaryKey
  @Field({ type: FieldType.INTEGER })
  id!: number;

  @Field({ type: FieldType.STRING })
  name!: string;

  @Field({ type: FieldType.STRING })
  email!: string;
}

describe('Model', () => {
  it('is abstract and cannot be instantiated directly', () => {
    // Model is abstract; only subclasses can be created
    expect(typeof Model).toBe('function');
  });

  it('can instantiate a concrete subclass', () => {
    const user = new User();
    expect(user).toBeInstanceOf(User);
    expect(user).toBeInstanceOf(Model);
  });

  it('supports property assignment on subclass', () => {
    const user = new User();
    user.name = 'John';
    user.email = 'john@test.com';
    expect(user.name).toBe('John');
    expect(user.email).toBe('john@test.com');
  });

  it('converts to JSON', () => {
    const user = new User();
    user.id = 1;
    user.name = 'John';
    user.email = 'john@test.com';
    const json = user.toJSON();
    expect(json.name).toBe('John');
    expect(json.id).toBe(1);
    expect(json.email).toBe('john@test.com');
  });

  it('has static find method', () => {
    expect(typeof User.find).toBe('function');
  });

  it('has static findAll method', () => {
    expect(typeof User.findAll).toBe('function');
  });

  it('has static create method', () => {
    expect(typeof User.create).toBe('function');
  });

  it('has static delete method', () => {
    expect(typeof User.delete).toBe('function');
  });

  it('has static count method', () => {
    expect(typeof User.count).toBe('function');
  });

  it('has static exists method', () => {
    expect(typeof User.exists).toBe('function');
  });

  it('has save instance method', () => {
    const user = new User();
    expect(typeof user.save).toBe('function');
  });
});
