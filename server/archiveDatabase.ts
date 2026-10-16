import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Database from 'better-sqlite3';

const defaultArchivePath = fileURLToPath(new URL('../data/pmu_archive.sqlite3', import.meta.url));
let archiveDb: Database.Database | undefined;

export function getArchiveDatabase(): Database.Database {
  if (archiveDb) return archiveDb;

  const archivePath = path.resolve(process.env.PMU_ARCHIVE_DB || defaultArchivePath);
  if (!existsSync(archivePath)) {
    throw new Error(`Archive PMU absente (${archivePath}). Lancez scripts/import_pmu_archive.py pour la créer.`);
  }

  archiveDb = new Database(archivePath, { readonly: true, fileMustExist: true, timeout: 5000 });
  archiveDb.pragma('query_only = ON');
  return archiveDb;
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
