const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Product = require("../models/product");

router.get("/", async (req, res) => {
    try {
        const sellers = await User.find({ role: "seller" })
            .select("email storeName sellerStatus createdAt")
            .sort({ createdAt: -1 });

        const productCounts = await Product.aggregate([
            { $group: { _id: "$sellerEmail", count: { $sum: 1 } } }
        ]);

        const countMap = productCounts.reduce((map, item) => {
            map[item._id] = item.count;
            return map;
        }, {});

        res.json(sellers.map(seller => ({
            email: seller.email,
            storeName: seller.storeName || seller.email,
            sellerStatus: seller.sellerStatus || "active",
            productCount: countMap[seller.email] || 0,
            createdAt: seller.createdAt
        })));
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

module.exports = router;
