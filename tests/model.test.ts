import { describe, it, expect, vi } from 'vitest';
import { Model } from '../src/Model';

describe('Model', () => {
  it('creates instance with attributes', () => {
    const user = new Model('users', { name: 'John', email: 'john@test.com' });
    expect(user.get('name')).toBe('John');
    expect(user.get('email')).toBe('john@test.com');
  });
  it('sets attributes', () => {
    const user = new Model('users', {});
    user.set('name', 'John');
    expect(user.get('name')).toBe('John');
  });
  it('tracks dirty fields', () => {
    const user = new Model('users', { name: 'John' });
    user.set('name', 'Jane');
    expect(user.isDirty).toBe(true);
    expect(user.dirtyFields).toContain('name');
  });
  it('converts to JSON', () => {
    const user = new Model('users', { name: 'John', id: 1 });
    const json = user.toJSON();
    expect(json.name).toBe('John');
    expect(json.id).toBe(1);
  });
  it('supports fill', () => {
    const user = new Model('users', {});
    user.fill({ name: 'John', email: 'j@t.com' });
    expect(user.get('name')).toBe('John');
    expect(user.get('email')).toBe('j@t.com');
  });
});
