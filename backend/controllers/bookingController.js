const { db } = require('../config/database');

// Helper: Format Nomor WA ke Standar Internasional (misal: 0812 -> 62812)
const formatWA = (phone) => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  return cleaned;
};

// Helper: Generate Kode Booking Unik (contoh: SH-20260919-X8K)
const generateBookingCode = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `SH-${dateStr}-${randomStr}`;
};

// --- PUBLIK ROUTE ---

// 1. Submit Pendaftaran Peserta (Form Client)
exports.createBooking = (req, res) => {
  try {
    const { trip_id, full_name, whatsapp_number, emergency_contact, health_notes, agreed_terms } = req.body;

    // Validasi Wajib
    if (!trip_id || !full_name || !whatsapp_number || !emergency_contact) {
      return res.status(400).json({ success: false, message: 'Semua kolom wajib diisi.' });
    }

    // Validasi S&K (Wajib dicentang)
    if (!agreed_terms || agreed_terms !== 1) {
      return res.status(400).json({ success: false, message: 'Anda wajib menyetujui Syarat & Ketentuan.' });
    }

    // Cek apakah Trip ada dan masih aktif
    const trip = db.prepare('SELECT * FROM trips WHERE id = ? AND is_active = 1').get(trip_id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Jadwal trip tidak ditemukan atau pendaftaran sudah ditutup.' });
    }

    // Cek Sisa Kuota Real-time
    const booked = db.prepare(`
      SELECT COUNT(*) as total FROM bookings 
      WHERE trip_id = ? AND payment_status IN ('PENDING', 'APPROVED')
    `).get(trip_id);

    if (booked.total >= trip.quota) {
      return res.status(400).json({ success: false, message: 'Maaf, kuota pendaftaran untuk trip ini sudah penuh.' });
    }

    const bookingCode = generateBookingCode();
    const formattedWA = formatWA(whatsapp_number);
    const formattedEmergency = formatWA(emergency_contact);

    const stmt = db.prepare(`
      INSERT INTO bookings (booking_code, trip_id, full_name, whatsapp_number, emergency_contact, health_notes, agreed_terms, payment_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
    `);

    stmt.run(bookingCode, trip_id, full_name, formattedWA, formattedEmergency, health_notes || '', 1);

    return res.status(201).json({
      success: true,
      message: 'Pendaftaran berhasil. Silakan selesaikan pembayaran.',
      data: {
        booking_code: bookingCode,
        trip_title: trip.title,
        price: trip.price,
        whatsapp_number: formattedWA
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Upload Bukti Transfer Peserta
exports.uploadPaymentProof = (req, res) => {
  try {
    const { booking_code } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File bukti transfer wajib diunggah.' });
    }

    const imagePath = `/uploads/payments/${req.file.filename}`;

    const result = db.prepare(`
      UPDATE bookings 
      SET payment_proof = ?, updated_at = CURRENT_TIMESTAMP
      WHERE booking_code = ?
    `).run(imagePath, booking_code);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Kode pendaftaran tidak valid.' });
    }

    return res.json({
      success: true,
      message: 'Bukti pembayaran berhasil diunggah. Menunggu konfirmasi admin.',
      proof_url: imagePath
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// --- ADMIN ROUTE ---

// 3. Ambil Daftar Peserta Berdasarkan Trip ID
exports.getBookingsByTrip = (req, res) => {
  try {
    const { trip_id } = req.params;
    const bookings = db.prepare(`
      SELECT b.*, t.title as trip_title, t.event_date
      FROM bookings b
      JOIN trips t ON b.trip_id = t.id
      WHERE b.trip_id = ?
      ORDER BY b.created_at DESC
    `).all(trip_id);

    return res.json({ success: true, data: bookings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Update Status Pembayaran (Approve / Reject)
exports.updatePaymentStatus = (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status } = req.body; // 'APPROVED' / 'REJECTED' / 'PENDING'

    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(payment_status)) {
      return res.status(400).json({ success: false, message: 'Status pembayaran tidak valid.' });
    }

    const booking = db.prepare(`
      SELECT b.*, t.wa_group_link, t.title as trip_title 
      FROM bookings b
      JOIN trips t ON b.trip_id = t.id
      WHERE b.id = ?
    `).get(id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Data pendaftaran tidak ditemukan.' });
    }

    db.prepare(`
      UPDATE bookings 
      SET payment_status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(payment_status, id);

    return res.json({
      success: true,
      message: `Status pembayaran berhasil diubah menjadi ${payment_status}.`,
      data: {
        booking_code: booking.booking_code,
        whatsapp_number: booking.whatsapp_number,
        wa_group_link: booking.wa_group_link,
        status: payment_status
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};