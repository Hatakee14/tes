const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { default: makeWASocket, DisconnectReason, makeInMemoryStore, jidDecode, proto, getContentType, useMultiFileAuthState, downloadContentFromMessage } = require("@whiskeysockets/baileys")


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
let bot;
let qrCodeData = "";

// 🔹 Inisialisasi bot WhatsApp
async function startBotz() {
    const { state, saveCreds } = await useMultiFileAuthState("session");

    bot = makeWASocket({
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        auth: state,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 10000,
        emitOwnEvents: true,
        fireInitQueries: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: true,
        markOnlineOnConnect: true,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
    });

    bot.ev.on("creds.update", saveCreds);

    bot.ev.on("qr", async (qr) => {
        qrCodeData = await qrcode.toDataURL(qr);
        console.log("Scan QR Code untuk login!");
    });

    bot.ev.on("connection.update", (update) => {
        const { connection } = update;
        if (connection === "close") {
            console.log("Bot terputus, mencoba menyambungkan ulang...");
            startBotz(); // Restart bot jika terputus
        } else if (connection === "open") {
            console.log("Bot WhatsApp siap!");
            qrCodeData = ""; // Hapus QR Code setelah login
        }
    });

    bot.ev.on("messages.upsert", async (chatUpdate) => {
        try {
            let m = chatUpdate.messages[0];
            if (!m.message) return;
            m.message = m.message.ephemeralMessage?.message || m.message;
            if (m.key.remoteJid === "status@broadcast") return;
        } catch (err) {
            console.log("Error pada pesan:", err);
        }
    });
}

startBotz();

// 🔹 Endpoint untuk menampilkan QR Code di halaman scan
app.get("/scan", (req, res) => {
    if (qrCodeData) {
        res.send(`<img src="${qrCodeData}" alt="Scan QR Code untuk login" />`);
    } else {
        res.send("Bot sudah login, tidak perlu scan lagi.");
    }
});

// 🔹 Endpoint untuk mengirim pesan WhatsApp
app.post("/send", async (req, res) => {
    const { number, message } = req.body;

    if (!number || !message) {
        return res.status(400).json({ status: "error", message: "Nomor dan pesan wajib diisi!" });
    }

    try {
        const formattedNumber = number.includes("@s.whatsapp.net") ? number : number + "@s.whatsapp.net";
        await bot.sendMessage(formattedNumber, { text: message });

        res.json({ status: "success", message: "Pesan berhasil dikirim!" });
    } catch (error) {
        res.status(500).json({ status: "error", message: "Gagal mengirim pesan", error: error.message });
    }
});

// Endpoint Dokumentasi API
app.get("/", (req, res) => {
    const apiDocs = apiList.map(api => ({
        method: api.method,
        path: api.path,
        description: api.description,
        example: `http://localhost:${port}${api.path}`
    }));

    res.json({
        status: "success",
        message: "API Documentation",
        base_url: `http://localhost:${port}`,
        endpoints: apiDocs
    });
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
