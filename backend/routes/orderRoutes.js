const express = require("express");
const router = express.Router();
const Order = require("../models/order"); // Siguraduhin na may model ka na ganito
const Product = require("../models/product");

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
        const { buyerEmail, items = [] } = req.body;

        if (!buyerEmail || items.length === 0) {
            return res.status(400).json({ message: "Order needs buyer and items." });
        }

        const orderItems = [];

        for (const item of items) {
            const product = await Product.findById(item.productId);

            if (!product) {
                return res.status(404).json({ message: `${item.productName || "Product"} was not found.` });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({
                    message: `Only ${product.stock} stock left for ${product.name}.`
                });
            }

            orderItems.push({
                productId: product._id,
                productName: product.name,
                sellerEmail: product.sellerEmail,
                sellerName: product.sellerName,
                quantity: Number(item.quantity),
                price: product.price,
                total: product.price * Number(item.quantity)
            });

            product.stock -= Number(item.quantity);
            await product.save();
        }

        const newOrder = new Order({
            buyerEmail,
            items: orderItems,
            totalAmount: orderItems.reduce((sum, item) => sum + item.total, 0)
        });

        await newOrder.save();
        res.status(201).json({ message: "Order saved successfully!", order: newOrder });
    } catch (err) {
        console.error("Error saving order:", err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
