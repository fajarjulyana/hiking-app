const { db } = require('../config/database');

// 1. Ambil Data Rekening (Publik & Admin)
exports.getBankSettings = (req, res) => {
  try {
    // Pastikan tabel settings dibuat secara otomatis jika belum ada (Guard)
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    const rows = db.prepare("SELECT key, value FROM settings WHERE key IN ('bank_name', 'account_number', 'account_holder')").all()
    const settings = (rows || []).reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});

    return res.json({ 
      success: true, 
      data: {
        bank_name: settings.bank_name || 'BCA',
        account_number: settings.account_number || '1234567890',
        account_holder: settings.account_holder || 'Silent Hiking Indonesia'
      } 
    });
  } catch (error) {
    console.error('❌ Error getBankSettings:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Update Data Rekening (Admin Only)
exports.updateBankSettings = (req, res) => {
  try {
    const { bank_name, account_number, account_holder } = req.body;

    if (!bank_name || !account_number || !account_holder) {
      return res.status(400).json({ success: false, message: 'Semua kolom rekening wajib diisi.' });
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    const updateMany = db.transaction((data) => {
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined && value !== null) {
          stmt.run(key, String(value));
        }
      }
    });

    updateMany({ bank_name, account_number, account_holder });

    return res.json({ success: true, message: 'Informasi rekening berhasil diperbarui.' });
  } catch (error) {
    console.error('❌ Error updateBankSettings:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};