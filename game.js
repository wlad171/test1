const tg = window.Telegram.WebApp;
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const mainMenu = document.getElementById('mainMenu');
const controls = document.getElementById('controls');
const upButton = document.getElementById('upButton');
const downButton = document.getElementById('downButton');
const leftButton = document.getElementById('leftButton');
const rightButton = document.getElementById('rightButton');

// Initialize Telegram Mini App
tg.ready();
tg.expand();

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let snake = [{ x: 10, y: 10 }];
let food = { x: 15, y: 15 };
let dx = 0;
let dy = 0;
let score = 0;
let gameLoop;
let gameSpeed = 100;
let currentDifficulty = 'easy';
let highScores = JSON.parse(localStorage.getItem('snakeHighScores')) || {
    easy: [],
    medium: [],
    hard: []
};
let obstacles = [];

const difficultySettings = {
    easy: { speed: 100, obstacleCount: 0, pattern: 'none' },
    medium: { speed: 80, obstacleCount: 3, pattern: 'cross' },
    hard: { speed: 60, obstacleCount: 5, pattern: 'maze' }
};

const snakeSkins = ['classic', 'rainbow', 'neon'];
let currentSkin = 'classic';
let powerUpActive = false;
let powerUp = null;
const powerUpTypes = {
    speed: { color: '#FFD700', duration: 5000, effect: () => gameSpeed *= 0.7 },
    points: { color: '#9932CC', duration: 10000, effect: () => score += 20 },
    invincible: { color: '#00FFFF', duration: 8000, effect: () => powerUpActive = true }
};

function setDifficulty(difficulty) {
    const buttons = document.querySelectorAll('.difficulty-button');
    buttons.forEach(button => button.classList.remove('active'));
    document.querySelector(`[onclick="setDifficulty('${difficulty}')"]`).classList.add('active');
    currentDifficulty = difficulty;
    gameSpeed = difficultySettings[difficulty].speed;
    updateHighScoresList();
}

// Handle keyboard controls
document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'ArrowUp':
            if (dy !== 1) { dx = 0; dy = -1; }
            break;
        case 'ArrowDown':
            if (dy !== -1) { dx = 0; dy = 1; }
            break;
        case 'ArrowLeft':
            if (dx !== 1) { dx = -1; dy = 0; }
            break;
        case 'ArrowRight':
            if (dx !== -1) { dx = 1; dy = 0; }
            break;
    }
});

// Handle touch controls
function setupTouchControls() {
    let touchStartX = 0;
    let touchStartY = 0;
    const minSwipeDistance = 30;

    canvas.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
    });

    canvas.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal swipe
            if (Math.abs(deltaX) >= minSwipeDistance) {
                if (deltaX > 0 && dx !== -1) {
                    dx = 1; dy = 0;
                } else if (deltaX < 0 && dx !== 1) {
                    dx = -1; dy = 0;
                }
            }
        } else {
            // Vertical swipe
            if (Math.abs(deltaY) >= minSwipeDistance) {
                if (deltaY > 0 && dy !== -1) {
                    dx = 0; dy = 1;
                } else if (deltaY < 0 && dy !== 1) {
                    dx = 0; dy = -1;
                }
            }
        }
    });
}

function drawSnake() {
    snake.forEach((segment, index) => {
        switch(currentSkin) {
            case 'rainbow':
                ctx.fillStyle = `hsl(${(index * 25) % 360}, 100%, 50%)`;
                break;
            case 'neon':
                ctx.fillStyle = '#39FF14';
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#39FF14';
                break;
            default:
                ctx.fillStyle = '#4CAF50';
                ctx.shadowBlur = 0;
        }
        ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 2, gridSize - 2);
    });
}

function drawFood() {
    ctx.fillStyle = '#FF5722';
    ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 2, gridSize - 2);
}

function setSkin(skin) {
    const buttons = document.querySelectorAll('.skin-button');
    buttons.forEach(button => button.classList.remove('active'));
    document.querySelector(`[onclick="setSkin('${skin}')"]`).classList.add('active');
    currentSkin = skin;
}

function moveSnake() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = `Score: ${score}`;
        spawnFood();
    } else if (powerUp && head.x === powerUp.x && head.y === powerUp.y) {
        const type = powerUp.type;
        powerUpTypes[type].effect();
        setTimeout(() => {
            if (type === 'speed') gameSpeed = difficultySettings[currentDifficulty].speed;
            else if (type === 'invincible') powerUpActive = false;
        }, powerUpTypes[type].duration);
        powerUp = null;
    } else {
        snake.pop();
    }
}

function spawnFood() {
    let validPosition = false;
    while (!validPosition) {
        food.x = Math.floor(Math.random() * tileCount);
        food.y = Math.floor(Math.random() * tileCount);
        validPosition = true;
        
        // Check if food spawns on snake
        for (let segment of snake) {
            if (food.x === segment.x && food.y === segment.y) {
                validPosition = false;
                break;
            }
        }
        
        // Check if food spawns on obstacle
        for (let obstacle of obstacles) {
            if (food.x === obstacle.x && food.y === obstacle.y) {
                validPosition = false;
                break;
            }
        }
    }
}

function spawnObstacles() {
    obstacles = [];
    const settings = difficultySettings[currentDifficulty];
    const count = settings.obstacleCount;
    
    if (settings.pattern === 'cross') {
        const centerX = Math.floor(tileCount/2);
        const centerY = Math.floor(tileCount/2);
        
        // Create a cross pattern but leave space around the initial snake position
        for (let i = 0; i < tileCount; i++) {
            if (i < centerX - 3 || i > centerX + 3) {
                obstacles.push({x: i, y: centerY});
                obstacles.push({x: centerX, y: i});
            }
        }
        return;
    } else if (settings.pattern === 'maze') {
        for (let i = 0; i < tileCount; i += 3) {
            for (let j = 0; j < tileCount; j += 3) {
                obstacles.push({x: i, y: j});
            }
        }
        return;
    }
    
    for (let i = 0; i < count; i++) {
        let validPosition = false;
        while (!validPosition) {
            const obstacle = {
                x: Math.floor(Math.random() * tileCount),
                y: Math.floor(Math.random() * tileCount)
            };
            validPosition = true;
            
            // Check if obstacle spawns on snake
            for (let segment of snake) {
                if (obstacle.x === segment.x && obstacle.y === segment.y) {
                    validPosition = false;
                    break;
                }
            }
            
            // Check if obstacle spawns on food
            if (obstacle.x === food.x && obstacle.y === food.y) {
                validPosition = false;
                continue;
            }
            
            // Check if obstacle spawns on other obstacles
            for (let existingObstacle of obstacles) {
                if (obstacle.x === existingObstacle.x && obstacle.y === existingObstacle.y) {
                    validPosition = false;
                    break;
                }
            }
            
            if (validPosition) {
                obstacles.push(obstacle);
            }
        }
    }
}

function checkCollision() {
    const head = snake[0];

    // Check wall collision
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        return true;
    }

    // Check self collision
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return true;
        }
    }

    // Check obstacle collision
    for (let obstacle of obstacles) {
        if (head.x === obstacle.x && head.y === obstacle.y) {
            return true;
        }
    }

    return false;
}

function updateHighScores() {
    const scores = highScores[currentDifficulty];
    scores.push(score);
    scores.sort((a, b) => b - a);
    if (scores.length > 5) scores.length = 5;
    
    // Store scores in both localStorage and Telegram Cloud Storage
    localStorage.setItem('snakeHighScores', JSON.stringify(highScores));
    if (tg.CloudStorage && tg.CloudStorage.setItem) {
        tg.CloudStorage.setItem('snakeHighScores', JSON.stringify(highScores));
    }
    
    updateHighScoresList();
    
    // Share high score with Telegram
    if (score > 0) {
        tg.HapticFeedback.notificationOccurred('success');
        tg.MainButton.setText(`Share Score: ${score}`);
        tg.MainButton.show();
        tg.MainButton.onClick(() => {
            tg.sendData(JSON.stringify({
                action: 'shareScore',
                score: score,
                difficulty: currentDifficulty
            }));
        });
    }
}

function updateHighScoresList() {
    const highScoresList = document.getElementById('highScoresList');
    const scores = highScores[currentDifficulty];
    highScoresList.innerHTML = scores
        .map((score, index) => `<div>${index + 1}. ${score}</div>`)
        .join('');
}

function gameOver() {
    clearInterval(gameLoop);
    updateHighScores();
    mainMenu.style.display = 'block';
    document.removeEventListener('keydown', restartHandler);
}

function restartHandler(e) {
    if (e.code === 'Space') {
        document.removeEventListener('keydown', restartHandler);
        snake = [{ x: 10, y: 10 }];
        dx = 0;
        dy = 0;
        score = 0;
        scoreElement.textContent = 'Score: 0';
        spawnFood();
        startGame();
    }
}

function drawObstacles() {
    ctx.fillStyle = '#FF0000';
    obstacles.forEach(obstacle => {
        ctx.fillRect(obstacle.x * gridSize, obstacle.y * gridSize, gridSize - 2, gridSize - 2);
    });
}

function update() {
    moveSnake();
    
    if (!powerUpActive && checkCollision()) {
        gameOver();
        return;
    }

    // Random power-up spawn
    if (!powerUp && Math.random() < 0.005) {
        const types = Object.keys(powerUpTypes);
        const type = types[Math.floor(Math.random() * types.length)];
        powerUp = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount),
            type: type
        };
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawObstacles();
    drawFood();
    if (powerUp) {
        ctx.fillStyle = powerUpTypes[powerUp.type].color;
        ctx.fillRect(powerUp.x * gridSize, powerUp.y * gridSize, gridSize - 2, gridSize - 2);
    }
    drawSnake();
}

function startGame() {
    mainMenu.style.display = 'none';
    snake = [{ x: 10, y: 10 }];
    dx = 0;
    dy = 0;
    score = 0;
    scoreElement.textContent = 'Score: 0';
    spawnObstacles();
    spawnFood();
    setupTouchControls();
    gameLoop = setInterval(update, gameSpeed);
    
    // Hide share button when starting new game
    tg.MainButton.hide();
}

// Initialize game without starting it
updateHighScoresList();