const baseUrl = "https://api-naff.vercel.app"; // Ganti dengan URL API jika perlu
const endpoint = "/cekml"; // Ubah sesuai endpoint yang ingin diuji

const params = new URLSearchParams({ userId: "1057794740", zoneId: "13249" }).toString();

const totalRequests = 100; // Jumlah request yang ingin dikirim
const delay = 500; // Delay antar request dalam milidetik (2 detik)

async function testAPI() {
    for (let i = 1; i <= totalRequests; i++) {
        try {
            const response = await fetch(`${baseUrl}${endpoint}?${params}`);
            const data = await response.json();
            console.log(`Request ${i}:`, data);
        } catch (error) {
            console.error(`Request ${i} gagal:`, error.message);
        }
        await new Promise(resolve => setTimeout(resolve, delay)); // Tunggu sebelum request berikutnya
    }
}

testAPI();
