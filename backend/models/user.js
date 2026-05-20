const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true,
        enum: ["buyer", "seller"]
    },
    storeName: {
        type: String,
        trim: true
    },
    sellerStatus: {
        type: String,
        enum: ["active", "upcoming"],
        default: "active"
    }
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
