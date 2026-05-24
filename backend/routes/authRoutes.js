const express = require("express");
const router = express.Router();
const User = require("../models/user");

function getPasswordIssues(password = "") {
    const issues = [];

    if (password.length < 8) issues.push("at least 8 characters");
    if (!/[a-z]/.test(password)) issues.push("one lowercase letter");
    if (!/[A-Z]/.test(password)) issues.push("one uppercase letter");
    if (!/[0-9]/.test(password)) issues.push("one number");
    if (!/[^A-Za-z0-9]/.test(password)) issues.push("one special character");

    return issues;
}

router.post("/signup", async (req, res) => {
    try {
        const { password, role, name, storeName, sellerStatus } = req.body;
        const email = req.body.email?.trim().toLowerCase();

        if (!["buyer", "seller"].includes(role)) {
            return res.status(400).json({ message: "Choose buyer or seller." });
        }

        const passwordIssues = getPasswordIssues(password);

        if (passwordIssues.length > 0) {
            return res.status(400).json({
                message: `Password needs ${passwordIssues.join(", ")}.`
            });
        }

        if (role === "seller" && !storeName?.trim()) {
            return res.status(400).json({ message: "Store name is required for seller accounts." });
        }

        if (role === "buyer" && !name?.trim()) {
            return res.status(400).json({ message: "Name is required for buyer accounts." });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({ message: "Email already registered!" });
        }

        const newUser = await User.create({
            email,
            password,
            role,
            name: role === "buyer" ? name.trim() : undefined,
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
        const { password, role } = req.body;
        const email = req.body.email?.trim().toLowerCase();

        const user = await User.findOne({ email, password, role });

        if (!user) {
            const matchingCredentials = await User.findOne({ email, password });

            if (matchingCredentials) {
                return res.status(400).json({
                    message: `This account is registered as ${matchingCredentials.role}.`
                });
            }

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

router.post("/forgot-password", async (req, res) => {
    try {
        const email = req.body.email?.trim().toLowerCase();
        const newPassword = req.body.newPassword?.trim();
        const passwordIssues = getPasswordIssues(newPassword);

        if (passwordIssues.length > 0) {
            return res.status(400).json({
                message: `Password needs ${passwordIssues.join(", ")}.`
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "No account uses that email." });
        }

        user.password = newPassword;
        await user.save();

        res.json({ message: "Password updated successfully." });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});

module.exports = router;
