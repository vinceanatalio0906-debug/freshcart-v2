const express = require("express");
const router = express.Router();
const Product = require("../models/product");
const User = require("../models/user");

router.get("/", async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post("/", async (req, res) => {
    try {
        const { name, brand, price, stock, img, sellerEmail } = req.body;

        if (!name || !brand || !price || stock === undefined || !img || !sellerEmail) {
            return res.status(400).json({ message: "Please complete all product fields." });
        }

        const seller = await User.findOne({ email: sellerEmail, role: "seller" });

        if (!seller) {
            return res.status(403).json({ message: "Seller account not found." });
        }

        if ((seller.sellerApprovalStatus || "approved") !== "approved") {
            return res.status(403).json({ message: "Your seller account is still waiting for admin approval." });
        }

        const product = await Product.create({
            name,
            brand,
            price: Number(price),
            prevPrice: Number(price),
            stock: Number(stock),
            img,
            sellerEmail,
            sellerName: req.body.sellerName?.trim() || seller.storeName || seller.name || seller.email
        });

        res.status(201).json(product);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.patch("/:id", async (req, res) => {
    try {
        const { sellerEmail, price, stock } = req.body;
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: "Product not found." });
        }

        if (product.sellerEmail !== sellerEmail) {
            return res.status(403).json({ message: "You can only update your own products." });
        }

        if (price !== undefined) {
            product.prevPrice = product.price;
            product.price = Number(price);
        }

        if (stock !== undefined) {
            product.stock = Number(stock);
        }

        await product.save();
        res.json(product);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const { sellerEmail } = req.body;
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: "Product not found." });
        }

        if (product.sellerEmail !== sellerEmail) {
            return res.status(403).json({ message: "You can only delete your own products." });
        }

        await product.deleteOne();
        res.json({ message: "Product deleted." });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
