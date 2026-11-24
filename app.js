const express = require('express');
const app = express();
const User = require('./user');
const { fetchExternalData } = require('./externalService');
const externalService = require('./externalService');


app.use(express.json());

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

app.get('/api/hello', (req, res) => {
    const message = req.query.name ? `Hello ${req.query.name}` : 'Hello World';
    res.json({ message });
});

app.post('/api/echo', (req, res) => {
    const { message } = req.body;
    if (!message) {
        return res.status(400).json({ error: 'Escriba un mensaje'});
    }
    res.json({ message });
});

app.post('/api/users', async (req, res) => {
    try {
        const { name, email } = req.body;
        const user = new User({ name, email });
        await user.save();
        res.status(201).json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/external', async (req, res) => {
    try {
        const data = await externalService.fetchExternalData();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message })
    };
});

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Token Requerido' });
    }

    if (authHeader !== 'Bearer mi-token-secreto') {
        return res.status(403).json({ error: 'Token Inválido' });
    }
    next();
};

app.get('/api/profile', authMiddleware, (req, res) => {
    res.json({ user: 'Alex', role: 'admin' });
});

app.get('/api/greeting', (req, res) => {
    const message = req.query.name ? `Hello, ${req.query.name}!` : 'Hello, World!';
    res.type('text/plain').send(message);
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email } = req.body;
        const user = await User.findByIdAndUpdate(id, { name, email }, { new: true, runValidators: true });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = app;