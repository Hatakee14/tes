const express = require("express");
const axios = require("axios");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app); // Gunakan HTTP server untuk Socket.IO
const io = new Server(server, { cors: { origin: "*" } });

const port = 3000;

app.use(cors());
app.use(express.json());

// Rate limiter (50 request per 2 menit)
const limiter = rateLimit({
    windowMs: 2 * 60 * 1000,
    max: 50,
    message: { status: "error", message: "Terlalu banyak permintaan, coba lagi nanti." }
});

// Gunakan limiter untuk semua request
app.use(limiter);

// Menyimpan jumlah hit API
let hitCount = 0;

// Fungsi untuk mencatat hit ke file hit.json
const logHit = (ip) => {
    const logData = { timestamp: new Date().toISOString(), ip };

    // Baca file hit.json (jika ada), jika tidak buat array kosong
    let hitLogs = [];
    if (fs.existsSync("hit.json")) {
        hitLogs = JSON.parse(fs.readFileSync("hit.json"));
    }

    // Tambahkan data baru ke dalam array
    hitLogs.push(logData);

    // Simpan kembali ke hit.json
    fs.writeFileSync("hit.json", JSON.stringify(hitLogs, null, 2));
};

// Middleware untuk menghitung hit
app.use((req, res, next) => {
    hitCount++;
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    
    logHit(ip); // Simpan hit ke file
    io.emit("updateHit", { hitCount, logs: JSON.parse(fs.readFileSync("hit.json")) }); // Kirim update ke semua client
    
    next();
});

// Endpoint Dokumentasi API
app.get("/", (req, res) => {
    res.json({
        status: "success",
        message: "API Documentation",
        endpoints: [
            { path: "/cekreg", method: "GET", description: "Cek registrasi akun ML berdasarkan userId dan zoneId." },
            { path: "/cekml", method: "GET", description: "Cek nickname Mobile Legends berdasarkan userId dan zoneId." },
            { path: "/dl", method: "GET", description: "Download video TikTok tanpa watermark berdasarkan URL." },
            { path: "/cekhit", method: "GET", description: "Melihat jumlah hit API." }
        ]
    });
});

// Endpoint cek jumlah hit API dan lognya
app.get("/cekhit", (req, res) => {
    let hitLogs = [];
    if (fs.existsSync("hit.json")) {
        hitLogs = JSON.parse(fs.readFileSync("hit.json"));
    }

    res.json({ status: "success", message: "Jumlah hit API", hit_count: hitCount, logs: hitLogs });
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

// Hubungkan socket.io
io.on("connection", (socket) => {
    console.log("Client terhubung:", socket.id);
    socket.emit("updateHit", { hitCount, logs: JSON.parse(fs.readFileSync("hit.json")) });

    socket.on("disconnect", () => {
        console.log("Client terputus:", socket.id);
    });
});

// Jalankan server
server.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});
