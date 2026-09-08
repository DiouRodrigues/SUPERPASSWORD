// public/js/app-controle.js
const socket = io();
let myPin = null;

// Gerenciamento de Telas do Celular
const screens = {
    login: document.getElementById('screen-login'),
    playerLobby: document.getElementById('screen-player-lobby'),
    play: document.getElementById('screen-play'),
    end: document.getElementById('screen-end')
};

function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    if (screens[screenName]) screens[screenName].classList.add('active');
}

// 1. Entrar na Sala com o PIN
document.getElementById('btn-join').addEventListener('click', () => {
    const pin = document.getElementById('input-pin').value.trim();
    if (pin.length === 4) {
        socket.emit('joinRoom', pin);
    } else {
        alert('Digite um PIN válido de 4 dígitos.');
    }
});

socket.on('joinedRoom', (pin) => {
    myPin = pin;
    showScreen('playerLobby');
});

socket.on('error', (msg) => {
    alert(msg);
});

// 2. Iniciar o Turno (Dispara o Cronômetro)
document.getElementById('btn-start-turn').addEventListener('click', () => {
    if (!myPin) return;
    const target = parseInt(document.getElementById('input-target').value) || 10;
    const customTime = parseInt(document.getElementById('input-time').value) || 60;
    
    socket.emit('startTurn', { pin: myPin, target: target, customTime: customTime });
});
// 3. Ações de Jogo (Passar / Acertar)
document.getElementById('btn-pass').addEventListener('click', () => {
    if (myPin) socket.emit('passWord', myPin);
});

document.getElementById('btn-correct').addEventListener('click', () => {
    if (myPin) socket.emit('correctGuess', myPin);
});

// 4. Reiniciar Partida
document.getElementById('btn-reset').addEventListener('click', () => {
    if (myPin) socket.emit('resetGame', myPin);
});

// 5. Sincronização de Estado enviada pelo Servidor
socket.on('updateState', (state) => {
    // Atualiza o título da equipe ativa
    document.getElementById('lobby-team-title').innerText = `Sua vez: Equipe ${state.activeTeam}`;
    document.getElementById('play-team-title').innerText = `Jogando: Equipe ${state.activeTeam}`;

    if (state.isRunning) {
        showScreen('play');
        // Exibe a palavra atual que o servidor sorteou para esta rodada/turno
        document.getElementById('word').innerText = state.currentWord;
    } else {
        showScreen('playerLobby');
        document.getElementById('input-target').value = state.targetScore;
    }

    // Se houver um vencedor
    if (state.winner) {
        showScreen('end');
        document.getElementById('end-winner-text').innerText = `EQUIPE ${state.winner} VENCEU!`;
        return;
    }

    // Se o cronômetro estiver rodando, mostra a palavra e os botões de ação
    if (state.isRunning) {
        showScreen('play');
        document.getElementById('word').innerText = state.currentWord;
    } else {
        // Se estiver parado, mostra o lobby para iniciar o turno
        showScreen('playerLobby');
        document.getElementById('input-target').value = state.targetScore;
    }
});