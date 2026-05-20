const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 1 },
    prevPrice: { type: Number, required: true, min: 1 },
    stock: { type: Number, required: true, min: 0 },
    img: { type: String, required: true },
    sellerEmail: { type: String, required: true, trim: true },
    sellerName: { type: String, required: true, trim: true }
}, { timestamps: true });

module.exports = mongoose.models.Product || mongoose.model("Product", productSchema);
