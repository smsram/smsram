const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import routers
const adminRoutes = require('./routes/admin');
const assetRoutes = require('./routes/assets');
const connectionRoutes = require('./routes/connections');
const analyticsRoutes = require('./routes/analytics');
const mailRoutes = require('./routes/mail');
const publicRoutes = require('./routes/public');
const aiRoutes = require('./routes/ai'); // ← AI enrichment routes

const app = express();

app.use(cors());
app.use(express.json());

// Mount the route files to their respective endpoints
app.use('/api/admin', adminRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/mail', mailRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/ai', aiRoutes); // ← AI enrichment active

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Ecosystem Core Backend active on port ${PORT}`));