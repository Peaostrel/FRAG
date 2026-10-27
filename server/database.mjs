import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readdirSync,readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
export function openDatabase(path,migrations){
 mkdirSync(dirname(path),{recursive:true});const sqlite=new DatabaseSync(path);
 sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
 sqlite.exec('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY)');
 for(const name of readdirSync(migrations).filter(n=>n.endsWith('.sql')).sort()){
  if(sqlite.prepare('SELECT name FROM schema_migrations WHERE name=?').get(name))continue;
  sqlite.exec('BEGIN');try{sqlite.exec(readFileSync(join(migrations,name),'utf8'));sqlite.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(name);sqlite.exec('COMMIT')}catch(e){sqlite.exec('ROLLBACK');throw e}
 }
 return {sqlite,prepare(sql){let bindings=[];return {bind(...values){bindings=values;return this},async first(){return sqlite.prepare(sql).get(...bindings)||null},async all(){return {results:sqlite.prepare(sql).all(...bindings)}},async run(){const result=sqlite.prepare(sql).run(...bindings);return {meta:{changes:Number(result.changes)}}}}},close(){sqlite.close()}};
}
