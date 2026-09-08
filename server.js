const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const todasAsPalavras = require('./palavras');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const rooms = {};

function embaralhar(array) {
    let arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function gerarPIN() {
    let pin;
    do { pin = Math.floor(1000 + Math.random() * 9000).toString(); } while (rooms[pin]);
    return pin;
}

function puxarNovaPalavra(room) {
    if (room.words.length === 0) room.words = embaralhar(todasAsPalavras);
    return room.words.pop();
}

// NOVO: Função para limpar o objeto antes de enviar aos jogadores
function getRoomState(room) {
    return {
        pin: room.pin,
        score1: room.score1,
        score2: room.score2,
        currentWord: room.currentWord,
        timeLeft: room.timeLeft,
        activeTeam: room.activeTeam,
        isRunning: room.isRunning,
        targetScore: room.targetScore,
        winner: room.winner
    };
}

io.on('connection', (socket) => {
    
    socket.on('createRoom', () => {
        const pin = gerarPIN();
        rooms[pin] = {
            pin: pin, score1: 0, score2: 0,
            words: embaralhar(todasAsPalavras),
            timeLeft: 60, activeTeam: 1, isRunning: false,
            targetScore: 10, winner: null, timerInterval: null
        };
        rooms[pin].currentWord = puxarNovaPalavra(rooms[pin]);
        
        socket.join(pin);
        socket.emit('roomCreated', pin);
        // Sempre usamos getRoomState(rooms[pin]) no emit
        socket.emit('updateState', getRoomState(rooms[pin]));
    });

    socket.on('joinRoom', (pin) => {
        if (rooms[pin]) {
            socket.join(pin);
            socket.emit('joinedRoom', pin);
            io.to(pin).emit('updateState', getRoomState(rooms[pin]));
        } else {
            socket.emit('error', 'Sala não encontrada!');
        }
    });

    socket.on('startTurn', (data) => {
        const room = rooms[data.pin];
        if (!room || room.isRunning || room.winner) return;
        
        if (data.target) room.targetScore = data.target;
        room.isRunning = true;
        room.timeLeft = 60;
        io.to(data.pin).emit('updateState', getRoomState(room));

        room.timerInterval = setInterval(() => {
            room.timeLeft--;
            if (room.timeLeft <= 0) {
                clearInterval(room.timerInterval);
                room.isRunning = false;
                room.activeTeam = room.activeTeam === 1 ? 2 : 1;
            }
            io.to(data.pin).emit('updateState', getRoomState(room));
        }, 1000);
    });

    socket.on('correctGuess', (pin) => {
        const room = rooms[pin];
        if (!room || !room.isRunning) return;
        
        if (room.activeTeam === 1) room.score1++;
        else room.score2++;
        
        if (room.score1 >= room.targetScore) room.winner = 1;
        else if (room.score2 >= room.targetScore) room.winner = 2;

        if (room.winner) {
            clearInterval(room.timerInterval);
            room.isRunning = false;
        } else {
            room.currentWord = puxarNovaPalavra(room);
        }
        io.to(pin).emit('updateState', getRoomState(room));
    });

    socket.on('passWord', (pin) => {
        const room = rooms[pin];
        if (!room || !room.isRunning) return;
        room.currentWord = puxarNovaPalavra(room);
        io.to(pin).emit('updateState', getRoomState(room));
    });

    socket.on('resetGame', (pin) => {
        const room = rooms[pin];
        if (!room) return;
        clearInterval(room.timerInterval);
        room.score1 = 0; room.score2 = 0;
        room.winner = null; room.isRunning = false; room.timeLeft = 45;
        room.currentWord = puxarNovaPalavra(room);
        io.to(pin).emit('updateState', getRoomState(room));
    });
});

server.listen(3000, '0.0.0.0', () => console.log('Servidor rodando!'));