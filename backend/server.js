require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { initDatabase } = require('./config/database');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 4008;

// Pastikan folder uploads ada
const uploadDir = path.join(__dirname, 'uploads/payments');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// -----------------------------------------------------------------------------
// KONFIGURASI CORS
// -----------------------------------------------------------------------------
const allowedOrigins = [
  'https://sh.georgesyntax.site',
  'https://georgesyntax.site',
  'https://no.georgesyntax.site',
  'https://demo.georgesyntax.site',
  'http://localhost:3000',
  'http://localhost:4008',
  'http://localhost:5000'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.georgesyntax.site')) {
      callback(null, true);
    } else {
      callback(new Error('Akses diblokir oleh kebijakan CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

// Trust Proxy (Wajib jika backend berjalan di balik Nginx / Reverse Proxy SSL)
app.set('trust proxy', 1);

// Middleware Utama
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -----------------------------------------------------------------------------
// ROUTE & STATIC FILES
// -----------------------------------------------------------------------------

// 1. REDIRECT EKSTENSI .HTML KE CLEAN URL
app.get('/admin.html', (req, res) => res.redirect(301, '/admin'));
app.get('/login.html', (req, res) => res.redirect(301, '/login'));

// 2. RUTE CLEAN URL
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// 3. FOLDER STATIS
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Print Hash Password di Terminal untuk Cek Seeding
console.log('🔑 Hash Password Admin:', bcrypt.hashSync('54321Hiking.,', 10));

// Inisialisasi Database SQLite
initDatabase();

// API Routes
app.use('/api', apiRoutes);

// Fallback 404 Handler khusus API (menggunakan sintaks regex yang aman)
app.use(/^\/api\/(.*)/, (req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint API tidak ditemukan.' });
});

// Jalankan Server
app.listen(PORT, () => {
  console.log(`🚀 Server backend aktif di port ${PORT}`);
  console.log(`🔐 Laman Admin: http://localhost:${PORT}/admin`);
  console.log(`🔑 Laman Login: http://localhost:${PORT}/login`);
});