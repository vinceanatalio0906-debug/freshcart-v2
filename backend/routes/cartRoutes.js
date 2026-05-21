const express = require('express');
const router = express.Router();
const Cart = require('../models/cart'); // Siguraduhing tama ang path at pangalan ng file

// GET: Kunin ang laman ng cart ng isang user
router.get('/:email', async (req, res) => {
    try {
        const userEmail = req.params.email;
        const cart = await Cart.findOne({ userEmail: userEmail });
        
        if (!cart) {
            return res.json({ items: [] });
        }
        
        res.json(cart);
    } catch (error) {
        console.error("Error fetching cart:", error);
        res.status(500).json({ message: "Error fetching cart" });
    }
});

// POST: I-sync o i-save ang buong cart papunta sa database
router.post('/sync', async (req, res) => {
    try {
        const { userEmail, items } = req.body;

        if (!userEmail) {
            return res.status(400).json({ message: "User email is required" });
        }

        const updatedCart = await Cart.findOneAndUpdate(
            { userEmail: userEmail },
            { items: items },
            { new: true, upsert: true } 
        );

        res.json({ message: "Cart synced successfully", cart: updatedCart });
    } catch (error) {
        console.error("Error syncing cart:", error);
        res.status(500).json({ message: "Error syncing cart" });
    }
});

module.exports = router;