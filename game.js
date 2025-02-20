class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.score = 0;
        this.highScore = 150;
        this.gameSpeed = 100;
        this.tileSize = 20;
        this.snake = [];
        this.food = {};
        this.powerUp = null;
        this.direction = 'right';
        this.nextDirection = 'right';
        this.isPlaying = false;
        this.skin = 'classic';
        this.difficulty = 'medium';

        this.setupCanvas();
        this.setupEventListeners();
        this.loadHighScore();
    }

    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = window.innerHeight - 40;
        const size = Math.min(containerWidth, containerHeight);

        this.canvas.width = size;
        this.canvas.height = size;
        this.tileSize = Math.floor(size / 20);

        if (this.isPlaying) {
            this.draw();
        }
    }

    setupEventListeners() {
        document.getElementById('startGame').addEventListener('click', () => this.startGame());
        document.getElementById('classicSkin').addEventListener('click', () => this.setSkin('classic'));
        document.getElementById('rainbowSkin').addEventListener('click', () => this.setSkin('rainbow'));
        document.getElementById('neonSkin').addEventListener('click', () => this.setSkin('neon'));
        document.getElementById('easyMode').addEventListener('click', () => this.setDifficulty('easy'));
        document.getElementById('mediumMode').addEventListener('click', () => this.setDifficulty('medium'));
        document.getElementById('hardMode').addEventListener('click', () => this.setDifficulty('hard'));

        let touchStartX = 0;
        let touchStartY = 0;

        this.canvas.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!touchStartX || !touchStartY) return;

            const touchEndX = e.touches[0].clientX;
            const touchEndY = e.touches[0].clientY;

            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;

            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (deltaX > 0 && this.direction !== 'left') this.nextDirection = 'right';
                else if (deltaX < 0 && this.direction !== 'right') this.nextDirection = 'left';
            } else {
                if (deltaY > 0 && this.direction !== 'up') this.nextDirection = 'down';
                else if (deltaY < 0 && this.direction !== 'down') this.nextDirection = 'up';
            }

            touchStartX = null;
            touchStartY = null;
        });
    }

    setSkin(skin) {
        this.skin = skin;
        document.querySelectorAll('.button').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${skin}Skin`).classList.add('active');
    }

    setDifficulty(level) {
        this.difficulty = level;
        switch(level) {
            case 'easy': this.gameSpeed = 150; break;
            case 'medium': this.gameSpeed = 100; break;
            case 'hard': this.gameSpeed = 70; break;
        }
        document.querySelectorAll('.button').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${level}Mode`).classList.add('active');
    }

    startGame() {
        this.isPlaying = true;
        this.score = 0;
        this.snake = [
            { x: 5, y: 5 },
            { x: 4, y: 5 },
            { x: 3, y: 5 }
        ];
        this.direction = 'right';
        this.nextDirection = 'right';
        this.spawnFood();
        document.getElementById('menu').classList.remove('active');
        this.updateScore();
        this.gameLoop();
    }

    spawnFood() {
        const type = Math.random() < 0.2 ? 'special' : 'normal';
        do {
            this.food = {
                x: Math.floor(Math.random() * (this.canvas.width / this.tileSize)),
                y: Math.floor(Math.random() * (this.canvas.height / this.tileSize)),
                type: type
            };
        } while (this.snake.some(segment => segment.x === this.food.x && segment.y === this.food.y));

        if (Math.random() < 0.1 && !this.powerUp) {
            this.spawnPowerUp();
        }
    }

    spawnPowerUp() {
        do {
            this.powerUp = {
                x: Math.floor(Math.random() * (this.canvas.width / this.tileSize)),
                y: Math.floor(Math.random() * (this.canvas.height / this.tileSize)),
                type: ['speed', 'points', 'shrink'][Math.floor(Math.random() * 3)]
            };
        } while (this.snake.some(segment => segment.x === this.powerUp.x && segment.y === this.powerUp.y));
    }

    gameLoop() {
        if (!this.isPlaying) return;

        this.direction = this.nextDirection;
        const head = { x: this.snake[0].x, y: this.snake[0].y };

        switch(this.direction) {
            case 'up': head.y--; break;
            case 'down': head.y++; break;
            case 'left': head.x--; break;
            case 'right': head.x++; break;
        }

        if (this.checkCollision(head)) {
            this.gameOver();
            return;
        }

        this.snake.unshift(head);

        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += this.food.type === 'special' ? 5 : 1;
            this.updateScore();
            this.spawnFood();
        } else {
            this.snake.pop();
        }

        if (this.powerUp && head.x === this.powerUp.x && head.y === this.powerUp.y) {
            this.applyPowerUp();
        }

        this.draw();
        setTimeout(() => this.gameLoop(), this.gameSpeed);
    }

    applyPowerUp() {
        switch(this.powerUp.type) {
            case 'speed':
                const originalSpeed = this.gameSpeed;
                this.gameSpeed = this.gameSpeed * 0.5;
                setTimeout(() => this.gameSpeed = originalSpeed, 5000);
                break;
            case 'points':
                this.score += 10;
                this.updateScore();
                break;
            case 'shrink':
                if (this.snake.length > 3) {
                    this.snake = this.snake.slice(0, this.snake.length - 2);
                }
                break;
        }
        this.powerUp = null;
    }

    checkCollision(head) {
        return head.x < 0 ||
               head.y < 0 ||
               head.x >= this.canvas.width / this.tileSize ||
               head.y >= this.canvas.height / this.tileSize ||
               this.snake.some(segment => segment.x === head.x && segment.y === head.y);
    }

    draw() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw snake
        this.snake.forEach((segment, index) => {
            switch(this.skin) {
                case 'rainbow':
                    const hue = (index * 15) % 360;
                    this.ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
                    break;
                case 'neon':
                    this.ctx.fillStyle = '#0ff';
                    this.ctx.shadowBlur = 10;
                    this.ctx.shadowColor = '#0ff';
                    break;
                default:
                    this.ctx.fillStyle = index === 0 ? '#0f0' : '#090';
                    this.ctx.shadowBlur = 0;
            }
            this.ctx.fillRect(segment.x * this.tileSize, segment.y * this.tileSize, this.tileSize - 1, this.tileSize - 1);
        });

        // Draw food
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = this.food.type === 'special' ? '#ff0' : '#f00';
        this.ctx.fillRect(this.food.x * this.tileSize, this.food.y * this.tileSize, this.tileSize - 1, this.tileSize - 1);

        // Draw power-up
        if (this.powerUp) {
            this.ctx.fillStyle = '#f0f';
            this.ctx.fillRect(this.powerUp.x * this.tileSize, this.powerUp.y * this.tileSize, this.tileSize - 1, this.tileSize - 1);
        }
    }

    updateScore() {
        document.getElementById('score').textContent = `Score: ${this.score}`;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
            document.getElementById('highScore').textContent = `1. ${this.highScore}`;
        }
    }

    gameOver() {
        this.isPlaying = false;
        document.getElementById('menu').classList.add('active');
    }

    saveHighScore() {
        localStorage.setItem('snakeHighScore', this.highScore);
    }

    loadHighScore() {
        const saved = localStorage.getItem('snakeHighScore');
        if (saved) {
            this.highScore = parseInt(saved);
            document.getElementById('highScore').textContent = `1. ${this.highScore}`;
        }
    }
}

new SnakeGame();