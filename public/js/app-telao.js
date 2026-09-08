// public/js/app-telao.js
const socket = io("https://superpassword.onrender.com/");
const tickSound = document.getElementById('tick-sound');
const timerUI = document.getElementById('timer');
let audioEnabled = false;

// Gerenciamento de Telas do Telão
const screens = {
    init: document.getElementById('screen-init'),
    lobby: document.getElementById('screen-lobby'),
    game: document.getElementById('screen-game'),
    victory: document.getElementById('screen-victory')
};

function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    if (screens[screenName]) screens[screenName].classList.add('active');
}

// 1. Inicialização do Áudio e Conexão
document.getElementById('btn-init-audio').addEventListener('click', () => {
    audioEnabled = true;
    tickSound.play().then(() => { 
        tickSound.pause(); 
        tickSound.currentTime = 0; 
    }).catch(e => console.log("Áudio bloqueado", e));
    
    socket.emit('createRoom');
});

// 2. Eventos de Conexão da Sala
socket.on('roomCreated', (pin) => {
    document.getElementById('pin-display').style.display = 'block';
    document.getElementById('room-pin').innerText = pin;
    showScreen('lobby');
});

// 3. Sincronização de Estado do Servidor
socket.on('updateState', (state) => {
    // Atualiza Placares e Tempo
    document.getElementById('score1').innerText = state.score1;
    document.getElementById('score2').innerText = state.score2;
    timerUI.innerText = state.timeLeft;
    
    // Controle Visual da Equipe Ativa
    document.getElementById('ui-score1')?.classList.toggle('active-team', state.activeTeam === 1);
    document.getElementById('ui-score2')?.classList.toggle('active-team', state.activeTeam === 2);
    
    // Se houver um vencedor, mostra a tela de vitória
    if (state.winner) {
        showScreen('victory');
        const winnerText = document.getElementById('winner-text');
        winnerText.innerText = `EQUIPE ${state.winner} VENCEU!`;
        winnerText.className = state.winner === 1 ? "team1-text" : "team2-text";
        tickSound.pause();
        return;
    }

    // Gerencia o fluxo entre o Lobby de espera e o Jogo rodando
    if (state.isRunning) {
        showScreen('game');
        const turnLabel = document.getElementById('turn-label');
        turnLabel.innerText = `Vez da Equipe ${state.activeTeam} (Meta: ${state.targetScore})`;
        turnLabel.className = state.activeTeam === 1 ? "team1-text" : "team2-text";
        
        // Efeito sonoro nos últimos 10 segundos
        if (state.timeLeft <= 10 && state.timeLeft > 0) {
            timerUI.classList.add('timer-danger');
            if (audioEnabled) tickSound.play().catch(()=>{});
        } else {
            timerUI.classList.remove('timer-danger');
            tickSound.pause();
            tickSound.currentTime = 0;
        }
    } else {
        // Se a partida começou mas o turno está parado, mantém na tela de jogo aguardando
        if (state.score1 > 0 || state.score2 > 0 || state.targetScore) {
            showScreen('game');
            document.getElementById('turn-label').innerText = `Equipe ${state.activeTeam}, preparem-se!`;
            document.getElementById('turn-label').className = "";
        } else {
            showScreen('lobby');
        }
        timerUI.classList.remove('timer-danger');
        tickSound.pause();
        tickSound.currentTime = 0;
    }
});