import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

// Define the directory for the database file
const dbFolder = process.env.NODE_ENV === 'production' ? '/data' : path.join(process.cwd(), './data');
const dbPath = path.join(dbFolder, 'enriched-leads.db');

// Ensure the database directory exists before initializing SQLite
if (!fs.existsSync(dbFolder)) {
  console.info(`Database folder not found. Creating directory at: ${dbFolder}`);
  fs.mkdirSync(dbFolder, { recursive: true });
}

// Initialize the SQLite database connection
const db = new DatabaseSync(dbPath);

// Enable Write-Ahead Logging for better performance with concurrent workers
db.exec('PRAGMA journal_mode = WAL');

// Set a timeout so the database waits for a lock before throwing an error
db.exec('PRAGMA busy_timeout = 5000');

// Create the progress table if it does not already exist
db.exec(`
  CREATE TABLE IF NOT EXISTS progress (
    domain TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    error TEXT NOT NULL,
    data TEXT NOT NULL
  )
`);

// Prepare the insert statement for upserting lead progress
const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO progress (domain, status, error, data) 
  VALUES (?, ?, ?, ?)
`);

// Prepare the select statement to fetch existing records for resume logic
const checkStmt = db.prepare('SELECT domain, status, error, data FROM progress WHERE domain = ?');

/**
 * Executes a database write with a retry mechanism to handle locks safely.
 * This prevents the script from crashing when multiple workers finish at once.
 */
const safeDbWrite = async (domain: string, status: string, error: string, data: string): Promise<void> => {
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      // Attempt to execute the prepared insert statement
      insertStmt.run(domain, status, error, data);
      return;
    } catch (err: unknown) {
      // If the database is busy, wait and try again with exponential backoff
      if (err instanceof Error && 'code' in err && err.code === 'SQLITE_BUSY') {
        attempts++;
        const delay = attempts * 100;

        console.warn(`Database is busy. Retrying write for ${domain} (attempt ${attempts}/${maxAttempts})...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        // Re-throw if the error is not a locking issue
        console.error(`Unexpected database error during write:`, err);
        throw err;
      }
    }
  }
  throw new Error(`Database write timeout: failed to save ${domain} after ${maxAttempts} attempts`);
};

interface EnrichmentDBRecord {
  domain: string;
  status: 'success' | 'error';
  error: string;
  data: string;
}

/**
 * Public helper to save an enrichment record to the database.
 */
export const saveProgress = async (record: EnrichmentDBRecord): Promise<void> => {
  await safeDbWrite(record.domain, record.status, record.error, record.data);
};

/**
 * Public helper to retrieve existing progress for a specific email identifier.
 */
export const getProgress = (domain: string): EnrichmentDBRecord | null => {
  const row = checkStmt.get(domain) as EnrichmentDBRecord | undefined;
  return row || null;
};
