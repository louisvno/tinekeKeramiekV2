require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Import routes
const imageRoutes = require('./routes/images');
const postRoutes = require('./routes/posts');
//const migrateRoutes = require('./routes/migrate');

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS.split(','),
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes - must come BEFORE SPA fallback
app.use('/api/images', imageRoutes);
app.use('/api/posts', postRoutes);
//app.use('/api/migrate', migrateRoutes);

// Serve frontend from front folder (must be AFTER API routes)
app.use(express.static(path.join(__dirname, '../front')));

// SPA fallback - serve index.html for client-side routing (must be LAST)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../front/index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Uploads available at http://${HOST}:${PORT}/uploads`);
  console.log(`API available at http://${HOST}:${PORT}/api`);
});

module.exports = app;
