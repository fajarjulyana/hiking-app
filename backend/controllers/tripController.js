const { db } = require('../config/database');

// Helper: Bikin slug dari judul
const createSlug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

// --- PUBLIK ROUTE ---

// 1. Ambil Semua Trip yang Aktif (Laman Depan)
exports.getPublicTrips = (req, res) => {
  try {
    const trips = db.prepare(`
      SELECT t.*, 
        (t.quota - COUNT(b.id)) AS remaining_quota
      FROM trips t
      LEFT JOIN bookings b ON t.id = b.trip_id AND b.payment_status IN ('PENDING', 'APPROVED')
      WHERE t.is_active = 1
      GROUP BY t.id
      ORDER BY t.event_date ASC
    `).all();

    return res.json({ success: true, data: trips });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Ambil Detail Trip Berdasarkan Slug
exports.getTripBySlug = (req, res) => {
  try {
    const { slug } = req.params;
    const trip = db.prepare(`
      SELECT t.*, 
        COUNT(b.id) AS booked_count,
        (t.quota - COUNT(b.id)) AS remaining_quota
      FROM trips t
      LEFT JOIN bookings b ON t.id = b.trip_id AND b.payment_status IN ('PENDING', 'APPROVED')
      WHERE t.slug = ?
      GROUP BY t.id
    `).get(slug);

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Jadwal hiking tidak ditemukan.' });
    }

    return res.json({ success: true, data: trip });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// --- ADMIN ROUTE ---

// 3. Ambil Semua Trip (Termasuk yang Nonaktif/Lalu)
exports.getAllTripsAdmin = (req, res) => {
  try {
    const trips = db.prepare(`
      SELECT t.*, 
        COUNT(b.id) AS total_participants
      FROM trips t
      LEFT JOIN bookings b ON t.id = b.trip_id AND b.payment_status = 'APPROVED'
      GROUP BY t.id
      ORDER BY t.event_date DESC
    `).all();

    return res.json({ success: true, data: trips });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 1. Tambah Trip Baru
exports.createTrip = (req, res) => {
  try {
    const { title, location, meeting_point, event_date, price, quota, description, wa_group_link, is_active } = req.body;

    if (!title || !location || !event_date || !price || !quota) {
      return res.status(400).json({ success: false, message: 'Data utama wajib diisi.' });
    }

    const imageUrl = req.file ? `/uploads/trips/${req.file.filename}` : '/uploads/default-hiking.jpg';
    const slug = `${createSlug(title)}-${Date.now().toString().slice(-4)}`;
    
    // Berikan nilai default 1 (Aktif) jika is_active undefined/null
    const activeStatus = (is_active !== undefined && is_active !== null) ? Number(is_active) : 1;

    const stmt = db.prepare(`
      INSERT INTO trips (title, slug, location, meeting_point, event_date, price, quota, description, wa_group_link, image_url, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      title, 
      slug, 
      location, 
      meeting_point || '', 
      event_date, 
      price, 
      quota, 
      description || '', 
      wa_group_link || '', 
      imageUrl, 
      activeStatus
    );

    return res.status(201).json({
      success: true,
      message: 'Jadwal trip baru berhasil dibuat.',
      tripId: result.lastInsertRowid
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Update Trip
exports.updateTrip = (req, res) => {
  try {
    const { id } = req.params;
    const { title, location, meeting_point, event_date, price, quota, description, wa_group_link, is_active } = req.body;

    const existingTrip = db.prepare('SELECT * FROM trips WHERE id = ?').get(id);
    if (!existingTrip) {
      return res.status(404).json({ success: false, message: 'Data trip tidak ditemukan.' });
    }

    const imageUrl = req.file ? `/uploads/trips/${req.file.filename}` : existingTrip.image_url;
    
    // Gunakan status dari req.body jika ada, jika tidak pakai status lama dari database
    const activeStatus = (is_active !== undefined && is_active !== null && is_active !== '') 
      ? Number(is_active) 
      : existingTrip.is_active;

    const stmt = db.prepare(`
      UPDATE trips 
      SET title = ?, location = ?, meeting_point = ?, event_date = ?, price = ?, quota = ?, description = ?, wa_group_link = ?, image_url = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      title, 
      location, 
      meeting_point, 
      event_date, 
      price, 
      quota, 
      description, 
      wa_group_link, 
      imageUrl, 
      activeStatus, 
      id
    );

    return res.json({ success: true, message: 'Detail trip berhasil diperbarui.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Hapus Trip
exports.deleteTrip = (req, res) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM trips WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Data trip tidak ditemukan.' });
    }

    return res.json({ success: true, message: 'Jadwal hiking berhasil dihapus.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};