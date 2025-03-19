const express = require("express");
const axios = require("axios");
const cors = require("cors");


const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Using tiktokdl
// List API dan Deskripsinya
const apiList = [
    {
        path: "/cekreg",
        method: "GET",
        description: "Cek registrasi akun ML (Mobile Legends) berdasarkan userId dan zoneId."
    },
    {
        path: "/cekml",
        method: "GET",
        description: "Cek nickname Mobile Legends berdasarkan userId dan zoneId."
    },
    {
        path: "/dl",
        method: "GET",
        description: "Download video TikTok tanpa watermark berdasarkan URL."
    }
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

    res.json({
        status: "success",
        message: "API Documentation",
        base_url: `${baseUrl}`,
        endpoints: apiDocs
    });
});

app.get("/cekip", async (req, res) => {
    try {
        const response = await axios.get("https://api64.ipify.org?format=json");
        res.json({ status: "success", ip: response.data.ip });
    } catch (error) {
        res.status(500).json({ status: "error", message: "Gagal mendapatkan IP", error: error.message });
    }
});
// Endpoint untuk mengambil data dari API eksternal dengan userId dan zoneId dari query parameter
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
    console.log(`Server berjalan di http://localhost:${port}`);
});
