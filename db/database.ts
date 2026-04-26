import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const getDb = async () => {
  if (!db) {
    db = await SQLite.openDatabaseAsync('sklidla.db');
  }
  return db;
};

export const initDb = async () => {
  const database = await getDb();
  
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    
    CREATE TABLE IF NOT EXISTS foods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      brand TEXT,
      calories_per_100g REAL NOT NULL,
      protein_per_100g REAL NOT NULL,
      carbs_per_100g REAL NOT NULL,
      fats_per_100g REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS serving_sizes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      food_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      weight_in_grams REAL NOT NULL,
      FOREIGN KEY (food_id) REFERENCES foods (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      food_id INTEGER NOT NULL,
      serving_size_id INTEGER,
      amount_logged REAL NOT NULL,
      hardcoded_calories REAL NOT NULL,
      hardcoded_protein REAL NOT NULL,
      hardcoded_carbs REAL NOT NULL,
      hardcoded_fats REAL NOT NULL,
      logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (food_id) REFERENCES foods (id),
      FOREIGN KEY (serving_size_id) REFERENCES serving_sizes (id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS weight_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      weight REAL NOT NULL,
      logged_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_weight_logs_logged_at ON weight_logs (logged_at);
  `);

  await database.runAsync(
    `INSERT INTO weight_logs (weight)
     SELECT CAST(s.value AS REAL)
     FROM settings s
     WHERE s.key = 'bio_weight'
       AND TRIM(s.value) != ''
       AND CAST(s.value AS REAL) > 0
       AND NOT EXISTS (SELECT 1 FROM weight_logs)`,
  );
};
