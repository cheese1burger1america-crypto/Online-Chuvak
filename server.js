const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Разрешаем подключения со всех адресов
        methods: ["GET", "POST"]
    }
});

// Раздаем статические файлы (index.html и другие) из текущей папки
app.use(express.static(__dirname));

// Хранилище игроков (Объект не очищается при дисконнекте!)
const players = {};

io.on('connection', (socket) => {
    console.log(`Игрок подключился: ${socket.id}`);

    // Создаем данные нового игрока, если его еще нет
    // Используем случайный цвет и начальные координаты
    players[socket.id] = {
        id: socket.id,
        x: (Math.random() - 0.5) * 10,
        z: (Math.random() - 0.5) * 10,
        ry: 0,
        nickname: `User_${socket.id.substr(0, 4)}`,
        color: Math.random() * 0xffffff
    };

    // 1. Отправляем текущему игроку список всех, кто уже есть (включая "статуи")
    socket.emit('currentPlayers', players);

    // 2. Оповещаем всех остальных о появлении нового игрока
    socket.broadcast.emit('newPlayer', players[socket.id]);

    // 3. Обработка перемещения
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].z = movementData.z;
            players[socket.id].ry = movementData.ry;
            
            // Рассылаем обновленные координаты всем остальным
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    // 4. Обработка выхода
    socket.on('disconnect', () => {
        console.log(`Игрок ${socket.id} отключился. Персонаж остается в мире.`);
        // ВНИМАНИЕ: Мы намеренно НЕ удаляем players[socket.id], 
        // чтобы модель персонажа осталась на сцене у других игроков навсегда.
    });
});

// Настройка порта для Railway и других хостингов
const PORT = process.env.PORT || 3000;

// Запуск сервера на 0.0.0.0 обязателен для доступа из интернета
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ======================================
    СЕРВЕР ЗАПУЩЕН!
    Порт: ${PORT}
    Локально: http://localhost:${PORT}
    ======================================
    `);
});