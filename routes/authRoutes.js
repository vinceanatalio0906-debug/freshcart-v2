const express = require("express");
const router = express.Router();
const User = require("../models/user");

router.post("/signup", async (req, res) => {
    try {
        const { email, password, role, storeName, sellerStatus } = req.body;

        if (!["buyer", "seller"].includes(role)) {
            return res.status(400).json({ message: "Choose buyer or seller." });
        }

        if (role === "seller" && !storeName?.trim()) {
            return res.status(400).json({ message: "Store name is required for seller accounts." });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({ message: "Email already registered!" });
        }

        const newUser = await User.create({
            email,
            password,
            role,
            storeName: role === "seller" ? storeName.trim() : undefined,
            sellerStatus: role === "seller" ? (sellerStatus || "active") : undefined
        });

        res.json({
            message: "Account created successfully!",
            user: newUser
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password, role } = req.body;

        const user = await User.findOne({ email, password, role });

        if (!user) {
            return res.status(400).json({ message: "Invalid email, password, or role!" });
        }

        res.json({
            message: "Login successful!",
            user
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});

module.exports = router;
