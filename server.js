require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
const port = 3000;

const uri = process.env.MONGODB_URI;

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

let transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD
    }
});

async function connectToDatabase() {
    const client = new MongoClient(uri);
    await client.connect();
    return client;
}

app.post('/login', async (req, res) => {
    const client = await connectToDatabase();
    const { username, password } = req.body;
    try {
        const database = client.db('myDatabase');
        const collection = database.collection('users');
        const user = await collection.findOne({ username });
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.username = username;
            req.session.email = user.email;
            req.session.uid = user._id;
            res.json({ success: true });
        } else {
            res.json({ success: false, message: '使用者名稱或密碼錯誤！' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '登入失敗！' });
    } finally {
        await client.close();
    }
});

app.post('/register', async (req, res) => {
    const client = await connectToDatabase();
    const { username, email, password } = req.body;
    try {
        const database = client.db('myDatabase');
        const collection = database.collection('users');
        const existingUser = await collection.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.json({ message: '使用者名稱或電子郵件已存在！' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await collection.insertOne({ username, email, password: hashedPassword });
        res.json({ message: '註冊成功！' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '註冊失敗！' });
    } finally {
        await client.close();
    }
});

app.post('/forgot-password', async (req, res) => {
    const client = await connectToDatabase();
    const { email } = req.body;
    try {
        const database = client.db('myDatabase');
        const collection = database.collection('users');
        const user = await collection.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: '電子郵件不存在！' });
        }

        const token = crypto.randomBytes(20).toString('hex');
        const resetTokenExpires = Date.now() + 3600000; // 1 hour

        await collection.updateOne({ email }, {
            $set: {
                resetPasswordToken: token,
                resetPasswordExpires: resetTokenExpires
            }
        });

        const mailOptions = {
            to: email,
            from: process.env.EMAIL,
            subject: '重置密碼',
            text: `請點擊以下連結來重置您的密碼:\n\n` +
                  `http://${req.headers.host}/reset-password.html?token=${token}\n\n` +
                  `如果您沒有請求此操作，請忽略此電子郵件，您的密碼將保持不變。`
        };

        transporter.sendMail(mailOptions, (err) => {
            if (err) {
                console.error('無法發送郵件:', err);
                res.status(500).json({ message: '無法發送重置密碼郵件！' });
            } else {
                res.json({ message: '重置密碼郵件已發送！' });
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '重置密碼請求失敗！' });
    } finally {
        await client.close();
    }
});

app.post('/reset-password', async (req, res) => {
    const client = await connectToDatabase();
    const { token, newPassword } = req.body;
    try {
        const database = client.db('myDatabase');
        const collection = database.collection('users');
        const user = await collection.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        if (!user) {
            return res.status(400).json({ message: '重置密碼令牌無效或已過期！' });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await collection.updateOne({ _id: user._id }, {
            $set: {
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null
            }
        });
        res.json({ message: '密碼已重置！' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '重置密碼失敗！' });
    } finally {
        await client.close();
    }
});

app.get('/user-info', (req, res) => {
    if (req.session.username) {
        res.json({
            username: req.session.username,
            email: req.session.email,
            uid: req.session.uid
        });
    } else {
        res.status(401).json({ message: '未登入！' });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: '登出失敗！' });
        }
        res.json({ message: '已登出！' });
    });
});

app.post('/change-password', async (req, res) => {
    const client = await connectToDatabase();
    const { currentPassword, newPassword } = req.body;
    if (!req.session.username) {
        return res.status(401).json({ message: '未登入！' });
    }
    try {
        const database = client.db('myDatabase');
        const collection = database.collection('users');
        const user = await collection.findOne({ username: req.session.username });
        if (user && await bcrypt.compare(currentPassword, user.password)) {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await collection.updateOne({ username: req.session.username }, {
                $set: { password: hashedPassword }
            });
            res.json({ message: '密碼已變更！' });
        } else {
            res.status(400).json({ message: '當前密碼錯誤！' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '變更密碼失敗！' });
    } finally {
        await client.close();
    }
});

app.get('/query-uid', async (req, res) => {
    const client = await connectToDatabase();
    const { uid } = req.query;
    try {
        const database = client.db('myDatabase');
        const collection = database.collection('users');
        const user = await collection.findOne({ _id: new ObjectId(uid) });
        if (user) {
            res.json({
                username: user.username,
                email: user.email,
                loginMethod: user.loginMethod || '未提供'
            });
        } else {
            res.status(404).json({ message: '查無此UID！' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '查詢失敗！' });
    } finally {
        await client.close();
    }
});

app.post('/delete-account', async (req, res) => {
    const client = await connectToDatabase();
    const { password } = req.body;
    if (!req.session.username) {
        return res.status(401).json({ message: '未登入！' });
    }
    try {
        const database = client.db('myDatabase');
        const collection = database.collection('users');
        const user = await collection.findOne({ username: req.session.username });
        if (user && await bcrypt.compare(password, user.password)) {
            await collection.deleteOne({ username: req.session.username });
            req.session.destroy(err => {
                if (err) {
                    return res.status(500).json({ message: '登出失敗！' });
                }
                res.json({ message: '帳號已刪除！' });
            });
        } else {
            res.status(400).json({ message: '密碼錯誤！' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '刪除帳號失敗！' });
    } finally {
        await client.close();
    }
});

app.listen(port, () => {
    console.log(`伺服器正在 http://localhost:${port} 上運行`);
});
