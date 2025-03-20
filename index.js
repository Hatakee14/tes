const express = require("express");
const axios = require("axios");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const app = express();
const port = process.env.PORT || 3000;
 const baseUrl = `${req.protocol}://${req.get("host")}`;
app.use(cors());
app.use(express.json());

// Rate limiter (50 request per 2 menit)
const limiter = rateLimit({
    windowMs:  60 * 1000, // 2 menit
    max: 50,
    message: { status: "error", message: "Terlalu banyak permintaan, coba lagi nanti." }
});

app.use(limiter);

// Menyimpan jumlah hit API dan log dalam array
let hitCount = 0;
let hitLogs = [];

// Middleware untuk mencatat hit
app.use((req, res, next) => {
    hitCount++;
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    
    // Simpan log ke array
    hitLogs.push({
        timestamp: new Date().toISOString(),
        ip
    });

    // Batasi jumlah log agar tidak terlalu besar (misalnya, simpan hanya 100 log terakhir)
    if (hitLogs.length > 100) {
        hitLogs.shift();
    }

    next();
});


app.get("/", (req, res) => {
    res.json({
        status: "success",
        message: "Profile API",
        dev_info: {
            creator: "Nafi Maulana",
            info: "Selamat datang di REST API sederhana saya. Gunakan sesuai kebutuhan Anda.",
            list: `${baseUrl}/list`
        }
    });
});

// Endpoint Dokumentasi API
app.get("/list", (req, res) => {
    res.json({
        status: "success",
        message: "API Documentation",
        endpoints: [
            {
                path: "/cekreg",
                method: "GET",
                description: "Cek registrasi akun ML berdasarkan userId dan zoneId.",
                params: [
                    { name: "userId", type: "string", required: true, description: "ID pengguna Mobile Legends." },
                    { name: "zoneId", type: "string", required: true, description: "Zone ID Mobile Legends." }
                ],
                example: `${baseUrl}/cekreg?userId=123456&zoneId=7890`
            },
            {
                path: "/cekml",
                method: "GET",
                description: "Cek nickname Mobile Legends berdasarkan userId dan zoneId.",
                params: [
                    { name: "userId", type: "string", required: true, description: "ID pengguna Mobile Legends." },
                    { name: "zoneId", type: "string", required: true, description: "Zone ID Mobile Legends." }
                ],
                example: `${baseUrl}/cekml?userId=123456&zoneId=7890`
            },
            {
                path: "/dl",
                method: "GET",
                description: "Download video TikTok tanpa watermark berdasarkan URL.",
                params: [
                    { name: "url", type: "string", required: true, description: "URL video TikTok." }
                ],
                example: `${baseUrl}/dl?url=https://www.tiktok.com/@username/video/123456789`
            }
        ]
    });
});

// Endpoint cek jumlah hit API
app.get("/cekhit", (req, res) => {
    res.json({
        status: "success",
        message: "Jumlah hit API",
        hit_count: hitCount,
        logs: hitLogs.slice(-10) // Tampilkan hanya 10 log terakhir
    });
});

// Endpoint cek registrasi ML
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

// Endpoint cek nickname ML
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

// Endpoint download video TikTok tanpa watermark
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
    console.log(`Server berjalan di port ${port}`);
});
