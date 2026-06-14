const { registryDb } = require('../services/registryService');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// A secondary secret just for signing session tokens. Strictly from Env.
const JWT_SECRET = process.env.JWT_SECRET;

exports.loginAdmin = (req, res) => {
    const { password } = req.body;
    
    // Safety Check: Prevent crashes if you forgot to set the HF Secret
    if (!JWT_SECRET) {
        return res.status(500).json({ success: false, error: "Server Error: JWT_SECRET environment variable is missing" });
    }

    const admin = registryDb.prepare('SELECT * FROM admins WHERE username = ?').get('admin');
    if (!admin) return res.status(500).json({ success: false, error: "Admin system not initialized" });

    // Verify the password against the stored hash
    const isValid = bcrypt.compareSync(password, admin.password_hash);
    if (!isValid) return res.status(401).json({ success: false, error: "Invalid Master Key" });

    // Generate a session token valid for 24 hours
    const token = jwt.sign({ role: 'admin', username: 'admin' }, JWT_SECRET, { expiresIn: '24h' });

    res.json({ success: true, token });
};