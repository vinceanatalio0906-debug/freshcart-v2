const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/", upload.single("image"), async (req, res) => {
    try {
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: "No image uploaded"
            });
        }

        const result = await cloudinary.uploader.upload(
            `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
            {
                folder: "freshcart"
            }
        );

        res.json({
            success: true,
            imageUrl: result.secure_url
        });

    } catch (err) {
        console.log("Cloudinary upload error:", err);

        res.status(500).json({
            success: false,
            message: "Upload failed",
            error: err.message
        });
    }
});

module.exports = router;