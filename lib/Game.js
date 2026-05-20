const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

// 1. Inisialisasi Bot WhatsApp
const client = new Client({
    authStrategy: new LocalAuth() // Menyimpan sesi login agar tidak perlu scan QR terus-menerus
});

const DB_FILE = './database.json';

// 2. Fungsi Dokumentasi & Manajemen Data Pemain
function loadData() {
    if (!fs.existsSync(DB_FILE)) {
        return {};
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data || '{}');
}

function saveData(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// 3. Menampilkan QR Code di Terminal untuk Scan WhatsApp Web
client.on('qr', (qr) => {
    console.log('SCAN QR CODE INI DENGAN WHATSAPP-MU:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Bot RPG sudah siap dan online!');
});

// 4. Logika Perintah Game RPG
client.on('message', async (msg) => {
    const sender = msg.from; // ID unik nomor pengirim WhatsApp
    const messageText = msg.body.toLowerCase();
    
    let db = loadData();

    // Jika pemain baru pertama kali mengetik, daftarkan status awalnya
    if (!db[sender]) {
        db[sender] = {
            level: 1,
            xp: 0,
            gold: 0,
            hp: 100,
            lastHunt: 0 // Waktu terakhir melakukan !hunt (mili detik)
        };
        saveData(db);
    }

    const player = db[sender];

    // PERINTAH: !profile (Melihat status karakter)
    if (messageText === '!profile') {
        const status = `*⚔️ PROFIL RPG-MU ⚔️*\n\n` +
                       `🔺 *Level:* ${player.level}\n` +
                       `✨ *XP:* ${player.xp}/100\n` +
                       `💰 *Gold:* ${player.gold}\n` +
                       `❤️ *HP:* ${player.hp}/100`;
        msg.reply(status);
    }

    // PERINTAH: !hunt (Berburu monster)
    if (messageText === '!hunt') {
        const now = Date.now();
        const cooldown = 60 * 1000; // Cooldown dibuat 1 menit (60000 milidetik)

        // Validasi Cooldown agar pemain tidak melakukan spam
        if (now - player.lastHunt < cooldown) {
            const sisaWaktu = Math.ceil((cooldown - (now - player.lastHunt)) / 1000);
            msg.reply(`⏳ Kamu masih lelah! Tunggu *${sisaWaktu} detik* lagi sebelum berburu.`);
            return;
        }

        // Acak Hadiah Berburu
        const dapatGold = Math.floor(Math.random() * 20) + 10; // Dapat 10 - 30 Gold
        const dapatXp = Math.floor(Math.random() * 15) + 5;    // Dapat 5 - 20 XP
        
        player.gold += dapatGold;
        player.xp += dapatXp;
        player.lastHunt = now; // Update waktu hunt terakhir

        let balasan = `⚔️ *Kamu pergi berburu ke hutan!*\n\n` +
                      `💥 Menemukan monster dan mengalahkannya!\n` +
                      `💰 *+${dapatGold} Gold*\n` +
                      `✨ *+${dapatXp} XP*`;

        // Logika Level Up (Jika XP mencapai 100 atau lebih)
        if (player.xp >= 100) {
            player.level += 1;
            player.xp -= 100;
            player.hp = 100; // HP Pulih kembali
            balasan += `\n\n🎉 *LEVEL UP!* Kamu sekarang *Level ${player.level}*!`;
        }

        saveData(db); // Simpan perubahan status pemain ke file JSON
        msg.reply(balasan);
    }
});

// Jalankan sistem bot
client.initialize();
