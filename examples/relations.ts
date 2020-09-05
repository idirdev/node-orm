import { RelationBuilder } from '../src/Relations';

const userRelations = new RelationBuilder()
  .hasOne('profile', 'profiles', 'user_id')
  .hasMany('posts', 'posts', 'author_id')
  .manyToMany('roles', 'roles', 'user_roles', 'user_id', 'role_id');

const postsQuery = userRelations.buildQuery('posts', 1);
console.log('Posts query:', postsQuery?.toSQL());

const rolesQuery = userRelations.buildQuery('roles', 1);
console.log('Roles query:', rolesQuery?.toSQL());

for (const [name, config] of userRelations.all) {
  console.log(`${name}: ${config.type} -> ${config.target}`);
}
