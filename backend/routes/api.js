const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
// Import Controllers
const authController = require('../controllers/authController');
const tripController = require('../controllers/tripController');
const bookingController = require('../controllers/bookingController');

// Import Middleware Proteksi Admin
const { authenticateAdmin } = require('../middlewares/authMiddleware');

// --- KONFIGURASI UPLOAD FILE (MULTER) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/payments'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `proof-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Maksimal 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = allowedTypes.test(file.mimetype);

    if (extName && mimeType) {
      return cb(null, true);
    }
    cb(new Error('Hanya file gambar (JPG, JPEG, PNG) yang diperbolehkan!'));
  }
});


// Konfigurasi Multer untuk Trip Thumbnail
const tripStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/trips');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `trip-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const uploadTripImage = multer({ storage: tripStorage });

const settingController = require('../controllers/settingController');

// Rute Rekening
router.get('/settings/bank', settingController.getBankSettings);
router.put('/admin/settings/bank', authenticateAdmin, settingController.updateBankSettings);

// PASANG MULTER SEBELUM CONTROLLER:
router.post('/admin/trips', authenticateAdmin, uploadTripImage.single('thumbnail'), tripController.createTrip);
router.put('/admin/trips/:id', authenticateAdmin, uploadTripImage.single('thumbnail'), tripController.updateTrip);
// ============================================================
// 1. ROUTE AUTENTIKASI ADMIN
// ============================================================
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticateAdmin, authController.getMe);

// ============================================================
// 2. ROUTE PUBLIK (Client Frontend)
// ============================================================
// Trip & Jadwal
router.get('/trips', tripController.getPublicTrips);
router.get('/trips/:slug', tripController.getTripBySlug);

// Pendaftaran & Bukti Bayar
router.post('/bookings', bookingController.createBooking);
router.post('/bookings/upload-proof', upload.single('payment_proof'), bookingController.uploadPaymentProof);

// ============================================================
// 3. ROUTE KHUSUS ADMIN (Proteksi Middleware)
// ============================================================
// Manajemen Trip
router.get('/admin/trips', authenticateAdmin, tripController.getAllTripsAdmin);
router.post('/admin/trips', authenticateAdmin, tripController.createTrip);
router.put('/admin/trips/:id', authenticateAdmin, tripController.updateTrip);
router.delete('/admin/trips/:id', authenticateAdmin, tripController.deleteTrip);

// Manajemen Peserta & Status Bayar
router.get('/admin/trips/:trip_id/bookings', authenticateAdmin, bookingController.getBookingsByTrip);
router.patch('/admin/bookings/:id/status', authenticateAdmin, bookingController.updatePaymentStatus);


module.exports = router;