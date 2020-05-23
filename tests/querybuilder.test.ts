import { describe, it, expect } from 'vitest';
import { QueryBuilder } from '../src/QueryBuilder';

describe('QueryBuilder', () => {
  it('builds simple select', () => {
    const q = new QueryBuilder('users').select('id', 'name', 'email');
    expect(q.toSQL()).toContain('SELECT');
    expect(q.toSQL()).toContain('users');
  });
  it('adds where clause', () => {
    const q = new QueryBuilder('users').where('id', '=', 1);
    expect(q.toSQL()).toContain('WHERE');
    expect(q.params).toContain(1);
  });
  it('chains multiple where', () => {
    const q = new QueryBuilder('users').where('age', '>', 18).where('active', '=', true);
    expect(q.toSQL()).toContain('AND');
  });
  it('supports orWhere', () => {
    const q = new QueryBuilder('users').where('role', '=', 'admin').orWhere('role', '=', 'mod');
    expect(q.toSQL()).toContain('OR');
  });
  it('adds order by', () => {
    const q = new QueryBuilder('users').orderBy('created_at', 'DESC');
    expect(q.toSQL()).toContain('ORDER BY');
  });
  it('adds limit and offset', () => {
    const q = new QueryBuilder('users').limit(10).offset(20);
    expect(q.toSQL()).toContain('LIMIT');
    expect(q.toSQL()).toContain('OFFSET');
  });
  it('builds insert', () => {
    const q = new QueryBuilder('users').insert({ name: 'John', email: 'john@test.com' });
    expect(q.toSQL()).toContain('INSERT');
    expect(q.params).toContain('John');
  });
  it('builds update', () => {
    const q = new QueryBuilder('users').where('id', '=', 1).update({ name: 'Jane' });
    expect(q.toSQL()).toContain('UPDATE');
    expect(q.toSQL()).toContain('SET');
  });
  it('builds delete', () => {
    const q = new QueryBuilder('users').where('id', '=', 1).delete();
    expect(q.toSQL()).toContain('DELETE');
  });
  it('supports joins', () => {
    const q = new QueryBuilder('users').join('posts', 'users.id', '=', 'posts.user_id');
    expect(q.toSQL()).toContain('JOIN');
  });
});
