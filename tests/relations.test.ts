import { describe, it, expect } from 'vitest';
import { RelationBuilder } from '../src/Relations';

describe('RelationBuilder', () => {
  it('defines hasOne', () => {
    const rb = new RelationBuilder();
    rb.hasOne('profile', 'profiles', 'user_id');
    expect(rb.getRelation('profile')?.type).toBe('hasOne');
  });
  it('defines hasMany', () => {
    const rb = new RelationBuilder();
    rb.hasMany('posts', 'posts', 'user_id');
    expect(rb.getRelation('posts')?.type).toBe('hasMany');
  });
  it('defines belongsTo', () => {
    const rb = new RelationBuilder();
    rb.belongsTo('author', 'users', 'author_id');
    expect(rb.getRelation('author')?.type).toBe('belongsTo');
  });
  it('defines manyToMany', () => {
    const rb = new RelationBuilder();
    rb.manyToMany('tags', 'tags', 'post_tags', 'post_id', 'tag_id');
    expect(rb.getRelation('tags')?.pivotTable).toBe('post_tags');
  });
  it('builds query for hasMany', () => {
    const rb = new RelationBuilder();
    rb.hasMany('posts', 'posts', 'user_id');
    const q = rb.buildQuery('posts', 1);
    expect(q?.toSQL()).toContain('posts');
  });
  it('returns null for unknown', () => {
    expect(new RelationBuilder().buildQuery('x', 1)).toBeNull();
  });
});
