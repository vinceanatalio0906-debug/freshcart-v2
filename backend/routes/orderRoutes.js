const express = require("express");
const router = express.Router();
const Order = require("../models/order"); // Siguraduhin na may model ka na ganito

// GET para ma-fetch ang orders sa sales dashboard
router.get("/", async (req, res) => {
    try {
        const orders = await Order.find();
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST para sa checkout
router.post("/", async (req, res) => {
    try {
        const newOrder = new Order(req.body);
        await newOrder.save();
        res.status(201).json({ message: "Order saved successfully!" });
    } catch (err) {
        console.error("Error saving order:", err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;