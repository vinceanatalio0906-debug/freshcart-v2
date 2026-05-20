const express = require("express");
const router = express.Router();
const Order = require("../models/order");
const Product = require("../models/product");

router.get("/", async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

router.post("/", async (req, res) => {
    try {
        const { buyerEmail, items } = req.body;

        if (!buyerEmail || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: "Buyer and cart items are required." });
        }

        const orderItems = [];
        let totalAmount = 0;

        for (const item of items) {
            const product = await Product.findById(item.productId);
            const quantity = Number(item.quantity);

            if (!product) return res.status(404).json({ message: `${item.name || "Product"} was not found.` });
            if (quantity < 1 || product.stock < quantity) {
                return res.status(400).json({ message: `Only ${product.stock} units of ${product.name} are available.` });
            }

            product.stock -= quantity;
            await product.save();

            const total = product.price * quantity;
            totalAmount += total;

            orderItems.push({
                productId: product._id,
                productName: product.name,
                sellerEmail: product.sellerEmail,
                sellerName: product.sellerName,
                quantity,
                price: product.price,
                total
            });
        }

        const order = await Order.create({ buyerEmail, items: orderItems, totalAmount });
        res.status(201).json(order);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

module.exports = router;
