const express = require("express");
const axios = require("axios");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
// Gunakan public folder untuk file statis
app.use(express.static("public"));



// Rate limiter (50 request per 1 menit)
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 menit
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

// Endpoint Utama
app.get("/", (req, res) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    res.json({
        status: "success",
        message: "Profile API",
        dev_info: {
            creator: "Nafi Maulana",
            info: "Selamat datang di REST API sederhana saya. Gunakan sesuai kebutuhan Anda.",
            list: `${baseUrl}/list`,
            testing: `${baseUrl}/tes`
        }
    });
});

// Route untuk menampilkan index.html saat mengakses `/tes`
app.get("/tes", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Endpoint Dokumentasi API
app.get("/list", (req, res) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;

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
    const { userId, zoneId } = req.query; // Ambil userId & zoneId dari query parameter

    if (!userId || !zoneId) {
        return res.status(400).json({ message: "userId dan zoneId wajib diisi" });
    }

    const url = `https://slrmyshop.us/tools/mlreg.php?userId=${encodeURIComponent(userId)}&zoneId=${encodeURIComponent(zoneId)}`;

    try {
        const response = await axios.get(url);
        const data = response.data;
        const filteredData = {
            status: "success",
            data: {
                user_id: data.mlbb_data?.user_id,
                nickname: data.mlbb_data?.nickname,
                country: data.mlbb_data?.country?.nama,
                flag: data.mlbb_data?.country?.emoji,
                phone_code: data.mlbb_data?.country?.kod_telefon
            }
        };

        res.json(filteredData); // Mengirim data dari API eksternal ke client
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data", error: error.message });
    }
});


app.get("/cekml", async (req, res) => {
    const { userId, zoneId } = req.query; // Ambil userId & zoneId dari query parameter

    if (!userId || !zoneId) {
        return res.status(400).json({ message: "userId dan zoneId wajib diisi" });
    }

    const url = `https://api.gamestoreindonesia.com/v1/order/prepare/MOBILE_LEGENDS?userId=${encodeURIComponent(userId)}&zoneId=${encodeURIComponent(zoneId)}`;

    try {
        const response = await axios.get(url);
        const data = response.data;
        const filteredData = {
            status: "success",
            data: {
                nickname: data.data,
            }
        };
        res.json(filteredData);
        // Mengirim data dari API eksternal ke client
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data", error: error.message });
    }
});


app.get("/dl", async (req, res) => {
    const { url } = req.query; // Ambil URL dari query parameter

    if (!url) {
        return res.status(400).json({ status: "error", message: "URL wajib diisi" });
    }

    try {
        let host = "https://www.tikwm.com";
        let response = await axios.post(
            host + "/api/",
            new URLSearchParams({ url, count: 12, cursor: 0, web: 1, hd: 1 }).toString(),
            {
                headers: {
                    "accept": "application/json, text/javascript, */*; q=0.01",
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "sec-ch-ua": '"Chromium";v="104", " Not A;Brand";v="99", "Google Chrome";v="104"',
                    "user-agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36",
                },
            }
        );

        res.json({
            status: "success",
            data: {
                user:{
                    username: response.data.data.author.unique_id,
                    nama: response.data.data.author.nickname,
                    negara: response.data.data.region,
                    caption: response.data.data.title,
                },
                video:{
                    watermak : host+response.data.data.wmplay,
                    nowatermak: host+response.data.data.play,
                    hd: host+response.data.data.hdplay,
                },
                audio:{
                    musik: host+response.data.data.music,
                },
                

            },
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: "Gagal mengambil data", error: error.message });
    }
});

// Jalankan server
app.listen(port, () => {
    console.log(`Server berjalan di port ${port}`);
});
