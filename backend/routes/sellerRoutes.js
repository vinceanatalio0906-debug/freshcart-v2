const express = require('express');
const router = express.Router();
// I-import ang controller o model dito kung meron
// const Product = require('../models/productModel');

router.get('/', async (req, res) => {
    res.json({ message: "Product routes working" });
});

module.exports = router; // <--- ITO ANG DAPAT NA LAMAN