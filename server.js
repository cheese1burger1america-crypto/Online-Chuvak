const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Раздаем статические файлы (наш index.html)
app.use(express.static(__dirname));

// Хранилище всех игроков (они не будут удаляться)
const players = {};

io.on('connection', (socket) => {
    console.log(`Новое подключение: ${socket.id}`);

    // При входе создаем нового игрока
    players[socket.id] = {
        id: socket.id,
        x: 0,
        z: 0,
        ry: 0,
        nickname: `Player_${socket.id.substr(0, 4)}`,
        color: Math.random() * 0xffffff
    };

    // Отправляем новому игроку текущее состояние мира
    socket.emit('currentPlayers', players);

    // Оповещаем остальных о новом герое
    socket.broadcast.emit('newPlayer', players[socket.id]);

    // Обработка движения
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].z = movementData.z;
            players[socket.id].ry = movementData.ry;
            
            // Рассылаем обновление всем
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Игрок ${socket.id} покинул чат, но его персонаж остается в мире.`);
        // Мы НЕ удаляем игрока из объекта players, чтобы он остался на сцене навсегда
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});