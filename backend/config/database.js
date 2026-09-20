const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.resolve(__dirname, '../database.sqlite');

const db = new Database(dbPath, {
  verbose: process.env.NODE_ENV === 'development' ? console.log : null,
});

db.pragma('foreign_keys = ON');

const initDatabase = () => {
  try {
    const schemaPath = path.resolve(__dirname, '../schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      db.exec(schemaSql);
      console.log('⚡ [Database] Schema SQLite berhasil diinisialisasi/diperbarui.');
    } else {
      console.warn('⚠️ [Database] File schema.sql tidak ditemukan, melewatinya...');
    }

    // Guard: Pastikan tabel settings & data default dibuat
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      INSERT OR IGNORE INTO settings (key, value) VALUES 
      ('bank_name', 'BCA'),
      ('account_number', '1234567890'),
      ('account_holder', 'Silent Hiking Indonesia');
    `);

  } catch (error) {
    console.error('❌ [Database] Gagal menginisialisasi schema:', error.message);
    process.exit(1);
  }
};

module.exports = {
  db,
  initDatabase,
};