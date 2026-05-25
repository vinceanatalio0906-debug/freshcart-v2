const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Product = require("../models/product");
const Order = require("../models/order");
const Cart = require("../models/cart");

async function requireAdmin(req, res, next) {
    const email = req.headers["x-user-email"]?.trim().toLowerCase();

    if (!email) {
        return res.status(401).json({ message: "Admin email is required." });
    }

    const admin = await User.findOne({ email, role: "admin" });

    if (!admin) {
        return res.status(403).json({ message: "Admin access only." });
    }

    req.admin = admin;
    next();
}

router.use(requireAdmin);

router.get("/stats", async (req, res) => {
    try {
        const [buyers, sellers, pendingSellers, products, orders, carts, sales] = await Promise.all([
            User.countDocuments({ role: "buyer" }),
            User.countDocuments({ role: "seller" }),
            User.countDocuments({ role: "seller", sellerApprovalStatus: "pending" }),
            Product.countDocuments(),
            Order.countDocuments(),
            Cart.countDocuments(),
            Order.aggregate([
                { $group: { _id: null, total: { $sum: "$totalAmount" } } }
            ])
        ]);

        res.json({
            buyers,
            sellers,
            pendingSellers,
            products,
            orders,
            carts,
            totalSales: sales[0]?.total || 0
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get("/users", async (req, res) => {
    try {
        const users = await User.find().select("-password").sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.patch("/users/:id/seller-approval", async (req, res) => {
    try {
        const { sellerApprovalStatus } = req.body;

        if (!["pending", "approved", "rejected"].includes(sellerApprovalStatus)) {
            return res.status(400).json({ message: "Invalid seller approval status." });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        if (user.role !== "seller") {
            return res.status(400).json({ message: "Only seller accounts can be approved or rejected." });
        }

        user.sellerApprovalStatus = sellerApprovalStatus;
        await user.save();

        res.json({
            _id: user._id,
            email: user.email,
            role: user.role,
            name: user.name,
            storeName: user.storeName,
            sellerApprovalStatus: user.sellerApprovalStatus,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.delete("/users/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        if (user._id.equals(req.admin._id)) {
            return res.status(400).json({ message: "You cannot delete your own admin account." });
        }

        await user.deleteOne();
        res.json({ message: "User deleted." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get("/products", async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.delete("/products/:id", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: "Product not found." });
        }

        await product.deleteOne();
        res.json({ message: "Product deleted." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get("/orders", async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
