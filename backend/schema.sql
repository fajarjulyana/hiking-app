-- ============================================================
-- SKRIP INISIALISASI DATABASE SQLITE - WEB HIKING & ADMIN
-- ============================================================

-- Aktifkan penegakan Foreign Key di SQLite
PRAGMA foreign_keys = ON;

-- 1. TABEL USERS (Untuk Autentikasi Admin)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL, -- Disimpan dalam bentuk hash (bcrypt)
    role TEXT CHECK(role IN ('admin', 'superadmin')) DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABEL TRIPS (Jadwal, Lokasi, Titik Kumpul, & Kuota Hiking)
CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,                     -- Contoh: "Silent Hiking Mt. Manglayang"
    slug TEXT NOT NULL UNIQUE,               -- URL friendly, ex: "silent-hiking-mt-manglayang-batch-1"
    location TEXT NOT NULL,                  -- Lokasi Tujuan Hiking
    meeting_point TEXT,                      -- Titik Kumpul (Meeting Point)
    event_date DATE NOT NULL,                -- Tanggal Pelaksanaan
    price INTEGER NOT NULL CHECK(price >= 0),-- Harga pendaftaran (Rp)
    quota INTEGER NOT NULL CHECK(quota > 0), -- Batas Maksimal Peserta
    description TEXT,                        -- Rincian rute, syarat fisik, & perlengkapan
    wa_group_link TEXT,                      -- Link grup WA yang dikirim setelah status APPROVED
    image_url TEXT,                          -- Path/URL Thumbnail Trip
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)), -- 1 = Buka, 0 = Tutup
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABEL BOOKINGS (Data Pendaftaran Peserta)
CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_code TEXT NOT NULL UNIQUE,       -- Kode Unik Pendaftaran, ex: "SH-20260921-X8K"
    trip_id INTEGER NOT NULL,
    full_name TEXT NOT NULL,
    whatsapp_number TEXT NOT NULL,           -- Format: "628xxxxxxxxxx" (siap pakai di WA/wa.me)
    emergency_contact TEXT NOT NULL,         -- Kontak Darurat
    health_notes TEXT,                       -- Riwayat Penyakit / Catatan Kesehatan
    agreed_terms INTEGER NOT NULL CHECK(agreed_terms = 1), -- Wajib 1 (Setuju S&K)
    payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(payment_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    payment_proof TEXT,                      -- Path/URL File Bukti Transfer
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

-- 4. TABEL BLOGS (Jurnal Dokumentasi & Testimoni Per Batch)
CREATE TABLE IF NOT EXISTS blogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER,                         -- Relasi Opsional ke Batch Trip Terkait
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    image_url TEXT NOT NULL,                 -- Foto Utama Dokumentasi
    content TEXT NOT NULL,                   -- Catatan Perjalanan / Testimoni Peserta
    author_id INTEGER,
    published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 5. TABEL SETTINGS (Pengaturan Dinamis Sistem seperti Rekening Pembayaran)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- ============================================================
-- INDEXING (Untuk Mempercepat Query Pencarian & Filtering)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_trips_is_active ON trips(is_active);
CREATE INDEX IF NOT EXISTS idx_bookings_trip_id ON bookings(trip_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_code ON bookings(booking_code);

-- ============================================================
-- DUMMY DATA / INITIAL SEEDING (Data Awal System)
-- ============================================================

-- Seed Admin Default (Password Hash untuk '54321Hiking.,')
INSERT OR IGNORE INTO users (id, username, password, role) 
VALUES (1, 'admin', '$2b$10$3t5v4U4Ep85sKFEiZQSdKOgGK8w6WSuzfbiHWTtx2SO.DDPiwDHq6', 'superadmin');

-- Seed Rekening Bank Default
INSERT OR IGNORE INTO settings (key, value) VALUES 
('bank_name', 'BCA'),
('account_number', '1234567890'),
('account_holder', 'Silent Hiking Indonesia');

-- Seed Jadwal Trip Sample
INSERT OR IGNORE INTO trips (id, title, slug, location, meeting_point, event_date, price, quota, description, wa_group_link, is_active)
VALUES (
    1, 
    'Silent Hiking & Journaling #1', 
    'silent-hiking-journaling-1', 
    'Tahura Djuanda, Bandung',
    'Parkiran Utama Tahura Djuanda',
    '2026-10-10', 
    150000, 
    15, 
    'Jalan santai hening menikmati alam, dilanjutkan sesi journaling di area hutan pinus.', 
    'https://chat.whatsapp.com/ExampleGroupLink123', 
    1
);

-- Seed Blog / Jurnal Dokumentasi Sample
INSERT OR IGNORE INTO blogs (id, trip_id, title, slug, image_url, content)
VALUES (
    1,
    1,
    'Mengenal Konsep Silent Hiking', 
    'mengenal-konsep-silent-hiking', 
    '/uploads/blogs/sample-hiking.jpg', 
    'Silent hiking adalah praktik berjalan di alam tanpa interaksi suara, berfokus pada ritme napas dan kesadaran sekitar...'
);