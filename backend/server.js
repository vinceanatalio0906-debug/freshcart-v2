const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors({
    origin: [
        'https://thefreshcart.shop', 
        'https://www.thefreshcart.shop'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));


app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log("✅ MongoDB Atlas Connected");
})
.catch((err) => {
    console.log("❌ MongoDB Error:", err);
});

app.get("/", (req, res) => {
    res.send("Backend is running");
});

app.use("/api/auth", require("./routes/authRoutes"));

app.use("/api/upload", require("./routes/uploadRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/sellers", require("./routes/sellerRoutes"));

app.listen(process.env.PORT, () => {
    console.log(`🚀 Server running on port ${process.env.PORT}`);
});

