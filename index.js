const express = require("express");
const axios = require("axios");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Rate limiter
const limiter = rateLimit({
    windowMs: 2 * 60 * 1000, // 2 menit
    max: 50, // Maksimum 50 request per windowMs
    message: { status: "error", message: "Terlalu banyak permintaan, coba lagi nanti." }
});

// Menyimpan jumlah hit API
let hitCount = 0;

// Middleware untuk menghitung hit
app.use((req, res, next) => {
    hitCount++;
    next();
});

// List API dan Deskripsinya
const apiList = [
    { path: "/cekreg", method: "GET", description: "Cek registrasi akun ML berdasarkan userId dan zoneId." },
    { path: "/cekml", method: "GET", description: "Cek nickname Mobile Legends berdasarkan userId dan zoneId." },
    { path: "/dl", method: "GET", description: "Download video TikTok tanpa watermark berdasarkan URL." },
];

// Endpoint Dokumentasi API
app.get("/", (req, res) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const apiDocs = apiList.map(api => ({
        method: api.method,
        path: api.path,
        description: api.description,
        example: `${baseUrl}${api.path}`
    }));

    res.json({ status: "success", message: "API Documentation", base_url: baseUrl, endpoints: apiDocs });
});

// Endpoint cek hit API
app.get("/cekhit", (req, res) => {
    res.json({ status: "success", message: "Jumlah hit API", hit_count: hitCount });
});

// Gunakan limiter untuk semua request
app.use(limiter);

// Endpoint lainnya...
app.get("/cekreg", async (req, res) => {
    const { userId, zoneId } = req.query;
    if (!userId || !zoneId) return res.status(400).json({ message: "userId dan zoneId wajib diisi" });
    
    try {
        const response = await axios.get(`https://slrmyshop.us/tools/mlreg.php?userId=${encodeURIComponent(userId)}&zoneId=${encodeURIComponent(zoneId)}`);
        res.json({ status: "success", data: response.data.mlbb_data });
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data", error: error.message });
    }
});

app.get("/cekml", async (req, res) => {
    const { userId, zoneId } = req.query;
    if (!userId || !zoneId) return res.status(400).json({ message: "userId dan zoneId wajib diisi" });
    
    try {
        const response = await axios.get(`https://api.gamestoreindonesia.com/v1/order/prepare/MOBILE_LEGENDS?userId=${encodeURIComponent(userId)}&zoneId=${encodeURIComponent(zoneId)}`);
        res.json({ status: "success", data: { nickname: response.data.data } });
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data", error: error.message });
    }
});

app.get("/dl", async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ status: "error", message: "URL wajib diisi" });
    
    try {
        let host = "https://www.tikwm.com";
        let response = await axios.post(host + "/api/", new URLSearchParams({ url, hd: 1 }).toString(), {
            headers: { "content-type": "application/x-www-form-urlencoded; charset=UTF-8" }
        });
        
        res.json({
            status: "success",
            data: {
                user: { username: response.data.data.author.unique_id, nama: response.data.data.author.nickname },
                video: { nowatermark: host + response.data.data.play },
                audio: { musik: host + response.data.data.music }
            }
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: "Gagal mengambil data", error: error.message });
    }
});

// Jalankan server
app.listen(port, () => {
    console.log(`Server berjalan di ${baseUrl}`);
});
