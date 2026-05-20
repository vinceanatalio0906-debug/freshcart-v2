const express = require("express");
const router = express.Router();
const Product = require("../models/product");
const User = require("../models/user");

router.get("/", async (req, res) => {
    try {
        const filter = req.query.sellerEmail ? { sellerEmail: req.query.sellerEmail } : {};
        const products = await Product.find(filter).sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

router.post("/", async (req, res) => {
    try {
        const { name, brand, price, stock, img, sellerEmail } = req.body;
        const seller = await User.findOne({ email: sellerEmail, role: "seller" });

        if (!seller) return res.status(403).json({ message: "Only seller accounts can list products." });

        const initialPrice = Number(price);
        const initialStock = Number(stock);

        if (!name || !brand || !img || initialPrice <= 0 || initialStock < 0) {
            return res.status(400).json({ message: "Complete all product fields." });
        }

        const product = await Product.create({
            name,
            brand,
            price: initialPrice,
            prevPrice: initialPrice,
            stock: initialStock,
            img,
            sellerEmail,
            sellerName: seller.storeName || seller.email
        });

        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

router.patch("/:id", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) return res.status(404).json({ message: "Product not found." });
        if (req.body.sellerEmail && req.body.sellerEmail !== product.sellerEmail) {
            return res.status(403).json({ message: "You can update only your own products." });
        }

        if (req.body.price !== undefined) {
            const nextPrice = Number(req.body.price);
            if (nextPrice <= 0) return res.status(400).json({ message: "Invalid price." });
            product.prevPrice = product.price;
            product.price = nextPrice;
        }

        if (req.body.stock !== undefined) {
            const nextStock = Number(req.body.stock);
            if (nextStock < 0) return res.status(400).json({ message: "Invalid stock." });
            product.stock = nextStock;
        }

        await product.save();
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) return res.status(404).json({ message: "Product not found." });
        if (req.body.sellerEmail && req.body.sellerEmail !== product.sellerEmail) {
            return res.status(403).json({ message: "You can delete only your own products." });
        }

        await product.deleteOne();
        res.json({ message: "Product deleted." });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

module.exports = router;
