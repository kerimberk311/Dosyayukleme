const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const session = require('express-session');

const app = express();
const port = 3000;

// YÜKLEME KLASÖRÜ KONTROLÜ
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// AYARLAR
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadDir));
app.use(session({
    secret: 'haventem-cloud-2026',
    resave: false,
    saveUninitialized: true
}));

// YÖNETİCİ BİLGİLERİ
const ADMIN_CONF = { user: "admin", pass: "1234" };
let filesDb = []; // Not: Sunucu kapanırsa liste sıfırlanır.

// KULLANICI KİMLİĞİ ATAMA (Sadece o tarayıcıyı tanımak için)
app.use((req, res, next) => {
    if (!req.session.uId) {
        req.session.uId = 'user_' + Date.now() + Math.random().toString(36).substring(7);
    }
    next();
});

// DOSYA YÜKLEME AYARI
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// --- ROTALAR ---

app.get('/', (req, res) => {
    res.render('index', { 
        files: filesDb, 
        isAdmin: req.session.isAdmin, 
        myId: req.session.uId,
        msg: req.query.msg 
    });
});

app.post('/login', (req, res) => {
    if (req.body.user === ADMIN_CONF.user && req.body.pass === ADMIN_CONF.pass) {
        req.session.isAdmin = true;
    }
    res.redirect('/');
});

app.get('/logout', (req, res) => {
    req.session.isAdmin = false;
    res.redirect('/');
});

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.redirect('/?msg=Hata: Dosya seçilmedi');
    
    filesDb.unshift({
        id: Date.now().toString(),
        owner: req.session.uId,
        name: req.file.originalname,
        path: req.file.filename,
        sender: req.body.sender || 'Anonim',
        size: (req.file.size / 1024 / 1024).toFixed(2) + ' MB',
        time: new Date().toLocaleTimeString('tr-TR')
    });
    res.redirect('/?msg=Dosyanız başarıyla yüklendi!');
});

app.post('/delete/:id', (req, res) => {
    const idx = filesDb.findIndex(f => f.id === req.params.id);
    if (idx !== -1) {
        const file = filesDb[idx];
        // SİLME YETKİSİ: Admin veya Dosya Sahibi
        if (req.session.isAdmin || file.owner === req.session.uId) {
            const fullPath = path.join(uploadDir, file.path);
            if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
            filesDb.splice(idx, 1);
            return res.redirect('/?msg=Dosya silindi.');
        }
    }
    res.redirect('/?msg=Yetkisiz işlem!');
});

app.post('/edit/:id', (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/');
    const file = filesDb.find(f => f.id === req.params.id);
    if (file && req.body.newName) file.name = req.body.newName;
    res.redirect('/');
});

app.listen(port, () => console.log(`Sistem http://localhost:${port} adresinde hazır!`));