const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    buyerEmail: { type: String, required: true, trim: true },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        productName: { type: String, required: true },
        sellerEmail: { type: String, required: true },
        sellerName: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 1 },
        total: { type: Number, required: true, min: 1 }
    }],
    totalAmount: { type: Number, required: true, min: 1 }
}, { timestamps: true });

module.exports = mongoose.models.Order || mongoose.model("Order", orderSchema);
