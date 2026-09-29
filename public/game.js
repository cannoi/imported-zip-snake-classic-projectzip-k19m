const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score-display');
const bestScoreDisplay = document.getElementById('best-score-display');
const finalScoreEl = document.getElementById('final-score');
const bestScoreEl = document.getElementById('best-score');
const activePowerupEl = document.getElementById('active-powerup');
const powerupTextEl = document.getElementById('powerup-text');
const toastEl = document.getElementById('toast');

const GRID_SIZE = 20;
const TILE_COUNT = 20;
canvas.width = canvas.height = 400;

// Game State
let snake = [{x: 10, y: 10}];
let food = {x: 5, y: 5, type: 'normal'};
let dx = 0;
let dy = 0;
let score = 0;
let gameInterval = null;
let gameTick = 0;

// Powerup states
let speedBoostTicks = 0;
let ghostModeTicks = 0;

// Settings & State from LocalStorage
let state = {
    highScore: parseInt(localStorage.getItem('snakeHighScore')) || 0,
    skin: localStorage.getItem('snakeSkin') || 'lime',
    speed: parseInt(localStorage.getItem('snakeSpeed')) || 2,
    sound: localStorage.getItem('snakeSound') !== 'false',
    vibrate: localStorage.getItem('snakeVibrate') !== 'false',
    missions: JSON.parse(localStorage.getItem('snakeMissions')) || {
        score100: false,
        gold5: false,
        length20: false,
        goldEaten: 0
    }
};

// Audio System (Web Audio API)
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
}

function playSound(type) {
    if (!state.sound) return;
    initAudio();
    if (!audioCtx) return;

    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'eat') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'eat-gold') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.setValueAtTime(600, now + 0.08);
        osc.frequency.setValueAtTime(900, now + 0.16);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
    } else if (type === 'die') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(60, now + 0.4);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
    } else if (type === 'mission') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554, now + 0.1);
        osc.frequency.setValueAtTime(659, now + 0.2);
        osc.frequency.setValueAtTime(880, now + 0.3);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
    } else if (type === 'move') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.03);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
        osc.start(now);
        osc.stop(now + 0.03);
    }
}

// Vibration System
function triggerVibration(duration) {
    if (state.vibrate && navigator.vibrate) {
        navigator.vibrate(duration);
    }
}

// Toast Notifications
function showToast(message) {
    if (!toastEl) return;
    toastEl.innerText = message;
    toastEl.classList.remove('hidden');
    setTimeout(() => {
        toastEl.classList.add('hidden');
    }, 2500);
}

// UI Screen Management
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    if (screenId !== 'none') {
        const target = document.getElementById(screenId);
        if (target) target.classList.add('active');
    }
    if (screenId === 'screen-missions') {
        updateMissionsUI();
    }
}

// Settings Handlers
function updateSpeedSetting(val) {
    state.speed = parseInt(val);
    localStorage.setItem('snakeSpeed', state.speed);
    const labels = { 1: 'Slow', 2: 'Normal', 3: 'Fast' };
    const speedValEl = document.getElementById('speed-val');
    if (speedValEl) speedValEl.innerText = labels[state.speed] || 'Normal';
}

function toggleSound(enabled) {
    state.sound = enabled;
    localStorage.setItem('snakeSound', enabled);
    initAudio();
}

function toggleVibration(enabled) {
    state.vibrate = enabled;
    localStorage.setItem('snakeVibrate', enabled);
}

function setSkin(skinName) {
    state.skin = skinName;
    localStorage.setItem('snakeSkin', skinName);
    updateSkinsUI();
    showToast(`Skin set to ${skinName.toUpperCase()}`);
}

function updateSkinsUI() {
    document.querySelectorAll('.skin-opt').forEach(opt => {
        opt.classList.remove('selected');
    });
    const activeOpt = document.getElementById(`skin-${state.skin}`);
    if (activeOpt) activeOpt.classList.add('selected');
}

// Missions Logic
function checkMissions() {
    let updated = false;

    if (!state.missions.score100 && score >= 100) {
        state.missions.score100 = true;
        updated = true;
        showToast("🏆 Mission Complete: Score 100 Points!");
        playSound('mission');
    }

    if (!state.missions.gold5 && state.missions.goldEaten >= 5) {
        state.missions.gold5 = true;
        updated = true;
        showToast("🏆 Mission Complete: Eat 5 Golden Apples!");
        playSound('mission');
    }

    if (!state.missions.length20 && snake.length >= 20) {
        state.missions.length20 = true;
        updated = true;
        showToast("🏆 Mission Complete: Reach Length 20!");
        playSound('mission');
    }

    if (updated) {
        localStorage.setItem('snakeMissions', JSON.stringify(state.missions));
    }
}

function updateMissionsUI() {
    const elProgScore = document.getElementById('prog-score');
    const elStatusScore = document.getElementById('status-score');
    const elMissionScore = document.getElementById('mission-score');
    if (elProgScore) elProgScore.innerText = `${Math.min(score, 100)} / 100`;
    if (elStatusScore) elStatusScore.innerText = state.missions.score100 ? '✅' : '❌';
    if (elMissionScore) elMissionScore.className = `mission-item ${state.missions.score100 ? 'completed' : ''}`;

    const elProgGold = document.getElementById('prog-gold');
    const elStatusGold = document.getElementById('status-gold');
    const elMissionGold = document.getElementById('mission-gold');
    if (elProgGold) elProgGold.innerText = `${Math.min(state.missions.goldEaten, 5)} / 5`;
    if (elStatusGold) elStatusGold.innerText = state.missions.gold5 ? '✅' : '❌';
    if (elMissionGold) elMissionGold.className = `mission-item ${state.missions.gold5 ? 'completed' : ''}`;

    const elProgLength = document.getElementById('prog-length');
    const elStatusLength = document.getElementById('status-length');
    const elMissionLength = document.getElementById('mission-length');
    if (elProgLength) elProgLength.innerText = `${Math.min(snake.length, 20)} / 20`;
    if (elStatusLength) elStatusLength.innerText = state.missions.length20 ? '✅' : '❌';
    if (elMissionLength) elMissionLength.className = `mission-item ${state.missions.length20 ? 'completed' : ''}`;
}

// Game Loop & Logic
function getSpeedMs() {
    let baseSpeed = 120;
    if (state.speed === 1) baseSpeed = 160;
    if (state.speed === 3) baseSpeed = 80;

    if (speedBoostTicks > 0) {
        return baseSpeed * 0.6;
    }
    return baseSpeed;
}

function startGame() {
    initAudio();
    showScreen('none');
    snake = [
        {x: 10, y: 10},
        {x: 10, y: 11},
        {x: 10, y: 12}
    ];
    dx = 0;
    dy = -1;
    score = 0;
    speedBoostTicks = 0;
    ghostModeTicks = 0;
    gameTick = 0;
    updateScoreUI();
    resetFood();
    
    if (gameInterval) clearInterval(gameInterval);
    runGameLoop();
}

function runGameLoop() {
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, getSpeedMs());
}

function resetFood() {
    let newFood;
    let onSnake = true;
    while (onSnake) {
        newFood = {
            x: Math.floor(Math.random() * TILE_COUNT),
            y: Math.floor(Math.random() * TILE_COUNT)
        };
        onSnake = snake.some(part => part.x === newFood.x && part.y === newFood.y);
    }

    const rand = Math.random();
    if (rand < 0.70) {
        newFood.type = 'normal';
    } else if (rand < 0.85) {
        newFood.type = 'gold';
    } else if (rand < 0.95) {
        newFood.type = 'banana';
    } else {
        newFood.type = 'grape';
    }

    food = newFood;
}

function updateScoreUI() {
    if (scoreDisplay) scoreDisplay.innerText = String(score).padStart(4, '0');
    if (bestScoreDisplay) bestScoreDisplay.innerText = String(state.highScore).padStart(4, '0');
}

function gameLoop() {
    gameTick++;
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    if (speedBoostTicks > 0) {
        speedBoostTicks--;
        if (speedBoostTicks === 0) {
            showToast("Speed boost ended");
            runGameLoop();
        }
    }
    if (ghostModeTicks > 0) {
        ghostModeTicks--;
        if (ghostModeTicks === 0) {
            showToast("Ghost mode ended");
        }
    }

    if (activePowerupEl && powerupTextEl) {
        if (ghostModeTicks > 0 || speedBoostTicks > 0) {
            activePowerupEl.classList.remove('hidden');
            if (ghostModeTicks > 0) {
                powerupTextEl.innerText = `GHOST MODE: ${ghostModeTicks}`;
                powerupTextEl.style.color = 'var(--neon-pink, #ff007f)';
            } else {
                powerupTextEl.innerText = `SPEED BOOST: ${speedBoostTicks}`;
                powerupTextEl.style.color = 'var(--neon-yellow, #ffea00)';
            }
        } else {
            activePowerupEl.classList.add('hidden');
        }
    }

    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        if (ghostModeTicks > 0) {
            head.x = (head.x + TILE_COUNT) % TILE_COUNT;
            head.y = (head.y + TILE_COUNT) % TILE_COUNT;
        } else {
            return gameOver();
        }
    }

    if (snake.some(part => part.x === head.x && part.y === head.y)) {
        if (ghostModeTicks === 0) {
            return gameOver();
        }
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        triggerVibration(50);
        
        if (food.type === 'normal') {
            score += 10;
            playSound('eat');
        } else if (food.type === 'gold') {
            score += 30;
            state.missions.goldEaten++;
            localStorage.setItem('snakeMissions', JSON.stringify(state.missions));
            playSound('eat-gold');
            triggerVibration(100);
            showToast("✨ GOLDEN APPLE! +30 PTS");
        } else if (food.type === 'banana') {
            score += 15;
            speedBoostTicks = 15;
            playSound('eat');
            showToast("⚡ SPEED BOOST!");
            runGameLoop();
        } else if (food.type === 'grape') {
            score += 20;
            ghostModeTicks = 15;
            playSound('eat-gold');
            showToast("👻 GHOST MODE: Pass through walls!");
        }

        if (score > state.highScore) {
            state.highScore = score;
            localStorage.setItem('snakeHighScore', state.highScore);
        }

        updateScoreUI();
        checkMissions();
        resetFood();
    } else {
        snake.pop();
    }

    drawGame();
}

function gameOver() {
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = null;
    playSound('die');
    triggerVibration(300);

    if (score > state.highScore) {
        state.highScore = score;
        localStorage.setItem('snakeHighScore', state.highScore);
    }

    if (finalScoreEl) finalScoreEl.innerText = score;
    if (bestScoreEl) bestScoreEl.innerText = state.highScore;
    showScreen('screen-gameover');
}

function drawGame() {
    ctx.fillStyle = '#0f0f13';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid lines
    ctx.strokeStyle = '#1a1a24';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= TILE_COUNT; i++) {
        ctx.beginPath();
        ctx.moveTo(i * GRID_SIZE, 0);
        ctx.lineTo(i * GRID_SIZE, canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * GRID_SIZE);
        ctx.lineTo(canvas.width, i * GRID_SIZE);
        ctx.stroke();
    }

    // Draw Food
    if (food.type === 'normal') {
        ctx.fillStyle = '#ff3366';
        ctx.shadowColor = '#ff3366';
        ctx.shadowBlur = 10;
    } else if (food.type === 'gold') {
        ctx.fillStyle = '#ffea00';
        ctx.shadowColor = '#ffea00';
        ctx.shadowBlur = 15;
    } else if (food.type === 'banana') {
        ctx.fillStyle = '#00f3ff';
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 12;
    } else if (food.type === 'grape') {
        ctx.fillStyle = '#bf00ff';
        ctx.shadowColor = '#bf00ff';
        ctx.shadowBlur = 12;
    }

    ctx.beginPath();
    ctx.arc((food.x * GRID_SIZE) + GRID_SIZE/2, (food.y * GRID_SIZE) + GRID_SIZE/2, GRID_SIZE/2 - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw Snake
    snake.forEach((part, index) => {
        if (index === 0) {
            if (state.skin === 'lime') ctx.fillStyle = '#39ff14';
            else if (state.skin === 'cyan') ctx.fillStyle = '#00f3ff';
            else if (state.skin === 'yellow') ctx.fillStyle = '#ffea00';
            else if (state.skin === 'magenta') ctx.fillStyle = '#ff007f';
            else if (state.skin === 'rainbow') ctx.fillStyle = `hsl(${(gameTick * 10) % 360}, 100%, 50%)`;
            else ctx.fillStyle = '#39ff14';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 8;
        } else {
            if (state.skin === 'rainbow') {
                ctx.fillStyle = `hsl(${((gameTick - index * 3) * 10) % 360}, 80%, 45%)`;
            } else {
                ctx.fillStyle = index % 2 === 0 ? '#2bc20d' : '#229e0a';
                if (state.skin === 'cyan') ctx.fillStyle = index % 2 === 0 ? '#00c4cc' : '#009999';
                if (state.skin === 'yellow') ctx.fillStyle = index % 2 === 0 ? '#cca600' : '#997d00';
                if (state.skin === 'magenta') ctx.fillStyle = index % 2 === 0 ? '#cc0066' : '#99004d';
            }
            ctx.shadowBlur = 0;
        }

        ctx.fillRect(part.x * GRID_SIZE + 1, part.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);
    });
    ctx.shadowBlur = 0;
}

// Input Handling
window.addEventListener('keydown', e => {
    if (['ArrowUp', 'KeyW'].includes(e.code) && dy === 0) { dx = 0; dy = -1; playSound('move'); e.preventDefault(); }
    if (['ArrowDown', 'KeyS'].includes(e.code) && dy === 0) { dx = 0; dy = 1; playSound('move'); e.preventDefault(); }
    if (['ArrowLeft', 'KeyA'].includes(e.code) && dx === 0) { dx = -1; dy = 0; playSound('move'); e.preventDefault(); }
    if (['ArrowRight', 'KeyD'].includes(e.code) && dx === 0) { dx = 1; dy = 0; playSound('move'); e.preventDefault(); }
});

document.getElementById('btn-up').addEventListener('click', () => { if (dy === 0) { dx = 0; dy = -1; playSound('move'); } });
document.getElementById('btn-down').addEventListener('click', () => { if (dy === 0) { dx = 0; dy = 1; playSound('move'); } });
document.getElementById('btn-left').addEventListener('click', () => { if (dx === 0) { dx = -1; dy = 0; playSound('move'); } });
document.getElementById('btn-right').addEventListener('click', () => { if (dx === 0) { dx = 1; dy = 0; playSound('move'); } });

// Touch Swipe Controls
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', e => {
    if (e.touches.length > 0) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }
}, {passive: true});

canvas.addEventListener('touchend', e => {
    if (!touchStartX || !touchStartY) return;
    let diffX = e.changedTouches[0].clientX - touchStartX;
    let diffY = e.changedTouches[0].clientY - touchStartY;

    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 30 && dx === 0) { dx = 1; dy = 0; playSound('move'); }
        else if (diffX < -30 && dx === 0) { dx = -1; dy = 0; playSound('move'); }
    } else {
        if (diffY > 30 && dy === 0) { dx = 0; dy = 1; playSound('move'); }
        else if (diffY < -30 && dy === 0) { dx = 0; dy = -1; playSound('move'); }
    }
    touchStartX = 0;
    touchStartY = 0;
}, {passive: true});

// Initialize UI states on load
updateSkinsUI();
updateScoreUI();
