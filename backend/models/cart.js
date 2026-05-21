const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    // Naka-link ito sa email ng nakalogin na user
    userEmail: { 
        type: String, 
        required: true 
    },
    items: [
        {
            productId: { type: String, required: true },
            name: { type: String, required: true },
            price: { type: Number, required: true },
            img: { type: String },
            quantity: { type: Number, default: 1, min: 1 },
            sellerEmail: { type: String }
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model('Cart', cartSchema);