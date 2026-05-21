const express = require('express');
const router = express.Router();

// Halimbawa para sa orderRoutes.js
router.get('/', async (req, res) => {
    try {
        // Dito mo ilalagay ang logic para makuha ang orders sa database
        res.status(200).json({ message: "Order route is working!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;