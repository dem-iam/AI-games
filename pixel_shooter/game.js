// Game constants
        const PLAYER_SIZE = 16;
        const BULLET_SIZE = 8;
        const ENEMY_SIZE = 16;
        const ROOM_WIDTH = 800;
        const ROOM_HEIGHT = 600;
        const DOOR_SIZE = 32;
        
        // Game variables
        let canvas, ctx;
        let player = {
            x: ROOM_WIDTH / 2,
            y: ROOM_HEIGHT / 2,
            speed: 3,
            health: 50,
            direction: { x: 0, y: -1 } // Начальное направление вверх
        };
        let bullets = [];
        let enemies = [];
        let currentRoom = 1;
	let roomStates = {};
        let score = 0;
        let keys = {};
        let gameRunning = false;
        let lastShotTime = 0;
        const shotDelay = 300; // ms between shots
        
        // Pixel art assets (simple colored rectangles for this example)
        const assets = {
            player: { color: '#3498db' },
            bullet: { color: '#f1c40f' },
            enemy: { color: '#e74c3c' },
            wall: { color: '#7f8c8d' },
            floor: { color: '#34495e' },
            door: { color: '#8e44ad' }
        };
        
	function pushApart(obj1, obj2, force = 0.5) {
	    const dx = obj1.x - obj2.x;
	    const dy = obj1.y - obj2.y;
	    const distance = Math.sqrt(dx * dx + dy * dy);
    
	    if (distance === 0) return; // На случай одинаковых позиций
    
	    // Нормализованный вектор направления
	    const nx = dx / distance;
	    const ny = dy / distance;
    
	    // Раздвигаем объекты
	    obj1.x += nx * force;
	    obj1.y += ny * force;
	    obj2.x -= nx * force;
	    obj2.y -= ny * force;
	}

        // Initialize game
        function init() {
            canvas = document.getElementById('gameCanvas');
            ctx = canvas.getContext('2d');
            
            // Set canvas size
            resizeCanvas();
            window.addEventListener('resize', resizeCanvas);
            
            // Event listeners
            document.addEventListener('keydown', keyDown);
            document.addEventListener('keyup', keyUp);
            document.getElementById('start-button').addEventListener('click', startGame);
            
            // Load font
            document.fonts.load('12px "Press Start 2P"').then(() => {
                // Font loaded
            });
        }
        
        function resizeCanvas() {
            // Scale canvas to fit window while maintaining aspect ratio
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            
            const scale = Math.min(windowWidth / ROOM_WIDTH, windowHeight / ROOM_HEIGHT);
            
            canvas.width = ROOM_WIDTH;
            canvas.height = ROOM_HEIGHT;
            canvas.style.width = `${ROOM_WIDTH * scale}px`;
            canvas.style.height = `${ROOM_HEIGHT * scale}px`;
        }
        // Значение при каждом запуске игры
        function startGame() {
            document.getElementById('start-screen').style.display = 'none';
            gameRunning = true;
            player.health = 50;
            score = 0;
            currentRoom = 1;
	    roomStates = {};
            updateUI();
            generateRoom(currentRoom);
            gameLoop();
        }
        
        function gameLoop() {
            if (!gameRunning) return;
            
            update();
            render();
            
            requestAnimationFrame(gameLoop);
        }
        
        function update() {
            // Player movement
	    let moved = false;
            player.direction = {x: 0, y: 0};
            
            if (keys['w'] || keys['ц'] || keys['ArrowUp']) {
                player.direction.y = -1; moved = true;
            }
            if (keys['s'] || keys['ы'] || keys['ArrowDown']) {
                player.direction.y = 1; moved = true;
            }
            if (keys['a'] || keys['ф'] || keys['ArrowLeft']) {
                player.direction.x = -1; moved = true;
            }
            if (keys['d'] || keys['в'] || keys['ArrowRight']) {
                player.direction.x = 1; moved = true;
            }
	    
	    if (moved) {
		if (player.direction.x !== 0 && player.direction.y !== 0) {
		    player.direction.x *= 0.7071;
		    player.direction.y *= 0.7071;
		}
	    }
            
            // Нормализация диагоналей (чтобы скорость была одинаковой)
            if (player.direction.x !== 0 && player.direction.y !== 0) {
    		player.direction.x *= 0.7071; // 1/√2
    		player.direction.y *= 0.7071;
            }
	    // Применение движения
	    moveX = player.direction.x;
	    moveY = player.direction.y;
            
            // Update player position with collision checks
            const newX = player.x + moveX * player.speed;
            const newY = player.y + moveY * player.speed;
            
            // Wall collision
            if (newX - PLAYER_SIZE/2 > 0 && newX + PLAYER_SIZE/2 < ROOM_WIDTH) {
                player.x = newX;
            }
            if (newY - PLAYER_SIZE/2 > 0 && newY + PLAYER_SIZE/2 < ROOM_HEIGHT) {
                player.y = newY;
            }
            
            // Door collision (room transition)
            checkDoorCollision();
            
            // Shooting
            if ((keys[' '] || keys['Spacebar']) && Date.now() - lastShotTime > shotDelay) {
                shoot();
                lastShotTime = Date.now();
            }
            
            // Update bullets
            for (let i = bullets.length - 1; i >= 0; i--) {
                bullets[i].x += bullets[i].dx * bullets[i].speed;
                bullets[i].y += bullets[i].dy * bullets[i].speed;
                
                // Remove bullets that go off screen
                if (bullets[i].x < 0 || bullets[i].x > ROOM_WIDTH || 
                    bullets[i].y < 0 || bullets[i].y > ROOM_HEIGHT) {
                    bullets.splice(i, 1);
                    continue;
                }
                
                // Check bullet-enemy collisions
                for (let j = enemies.length - 1; j >= 0; j--) {
                    if (checkCollision(bullets[i], enemies[j], BULLET_SIZE, ENEMY_SIZE)) {
                        enemies[j].health -= bullets[i].damage;
                        bullets.splice(i, 1);
                        
                        if (enemies[j].health <= 0) {
                            score += 1;
                            enemies.splice(j, 1);
                            updateUI();
                        }
			// Сохраняем текущее состояние комнаты
    			roomStates[currentRoom] = { enemies: JSON.parse(JSON.stringify(enemies)) };
                        break;
                    }
                }
            }
            
            // Update enemies
            for (let i = 0; i < enemies.length; i++) {
                // Simple AI: move toward player
                const dx = player.x - enemies[i].x;
                const dy = player.y - enemies[i].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 0) {
		    enemies[i].direction = {
			x: dx / dist,
			y: dy / dist
		    };

                    enemies[i].x += enemies[i].direction.x * enemies[i].speed;
                    enemies[i].y += enemies[i].direction.y * enemies[i].speed;
                }
                
                // Проверка столкновения игрока с врагами
		for (let i = 0; i < enemies.length; i++) {
                    if (checkCollision(player, enemies[i], PLAYER_SIZE, ENEMY_SIZE)) {
			pushApart(player, enemies[i], 0.8);
                	player.health -= 0.5;
                	updateUI();
                    
                    	if (player.health <= 0) {
                            gameOver();
                    	}
                    }
            	}
		
		// Проверка столкновений между врагами
		for (let i = 0; i < enemies.length; i++) {
    		    for (let j = i + 1; j < enemies.length; j++) {
        		if (checkCollision(enemies[i], enemies[j], ENEMY_SIZE, ENEMY_SIZE)) {
            		    pushApart(enemies[i], enemies[j], 0.3); // Мягкое отталкивание
        		}
    		    }
		}
	    }
        }
        
        function checkDoorCollision() {
	    roomStates[currentRoom] = { 
            	enemies: JSON.parse(JSON.stringify(enemies)) 
            };
            // Check if player is near any door and change room
            const doorMargin = -20;
            
            // Top door (leads to room above)
            if (player.y < DOOR_SIZE + doorMargin && 
                player.x > ROOM_WIDTH/2 - DOOR_SIZE/2 && 
                player.x < ROOM_WIDTH/2 + DOOR_SIZE/2) {
                currentRoom -= 3; // Rooms are numbered in a grid pattern
                generateRoom(currentRoom);
                player.y = ROOM_HEIGHT - DOOR_SIZE - PLAYER_SIZE;
            }
            
            // Bottom door (leads to room below)
            if (player.y > ROOM_HEIGHT - DOOR_SIZE - doorMargin && 
                player.x > ROOM_WIDTH/2 - DOOR_SIZE/2 && 
                player.x < ROOM_WIDTH/2 + DOOR_SIZE/2) {
                currentRoom += 3;
                generateRoom(currentRoom);
                player.y = DOOR_SIZE + PLAYER_SIZE;
            }
            
            // Left door (leads to room to the left)
            if (player.x < DOOR_SIZE + doorMargin && 
                player.y > ROOM_HEIGHT/2 - DOOR_SIZE/2 && 
                player.y < ROOM_HEIGHT/2 + DOOR_SIZE/2) {
                currentRoom -= 1;
                generateRoom(currentRoom);
                player.x = ROOM_WIDTH - DOOR_SIZE - PLAYER_SIZE;
            }
            
            // Right door (leads to room to the right)
            if (player.x > ROOM_WIDTH - DOOR_SIZE - doorMargin && 
                player.y > ROOM_HEIGHT/2 - DOOR_SIZE/2 && 
                player.y < ROOM_HEIGHT/2 + DOOR_SIZE/2) {
                currentRoom += 1;
                generateRoom(currentRoom);
                player.x = DOOR_SIZE + PLAYER_SIZE;
            }
        }
        
        function checkCollision(obj1, obj2, size1, size2) {
            const dx = obj1.x - obj2.x;
            const dy = obj1.y - obj2.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < (size1/2 + size2/2);
        }
        
	let lastValidDirection = { x: 0, y: -1 };
        function shoot() {
	    let bulletDirX = player.direction.x;
	    let bulletDirY = player.direction.y;
            // Если игрок стоит на месте, то используется последнее направление
	    if (bulletDirX === 0 && bulletDirY === 0) {
		bulletDirX = lastValidDirection.x;
		bulletDirY = lastValidDirection.y;
	    } else {
		lastValidDirection.x = bulletDirX;
		lastValidDirection.y = bulletDirY;
	    }

	    // Создание пули
	    bullets.push({
                x: player.x,
                y: player.y,
                dx: bulletDirX,
                dy: bulletDirY,
                speed: 5,
                damage: 25
            });
        }
        
        function generateRoom(roomNumber) {
	    if (roomStates[roomNumber]) {
		enemies = JSON.parse(JSON.stringify(roomStates[roomNumber].enemies));
	    }
	    else {
            enemies = [];

            
            // Simple room generation based on room number
            let enemyCount = 3 + Math.floor(roomNumber / 2);
            
            for (let i = 0; i < enemyCount; i++) {
                enemies.push({
                    x: 100 + Math.random() * (ROOM_WIDTH - 200),
                    y: 100 + Math.random() * (ROOM_HEIGHT - 200),
                    speed: 1,
                    health: 50
                });
            }
	    roomStates[roomNumber] = { enemies: JSON.parse(JSON.stringify(enemies)) };
    }
            updateUI();
            
            // Center player in room (unless coming from another room)
            if (roomNumber === 1) {
                player.x = ROOM_WIDTH / 2;
                player.y = ROOM_HEIGHT / 2;
            }
        }
        
        function render() {
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw floor
            ctx.fillStyle = assets.floor.color;
            ctx.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
            
            // Draw walls
            ctx.fillStyle = assets.wall.color;
            ctx.fillRect(0, 0, ROOM_WIDTH, 5); // top
            ctx.fillRect(0, 0, 5, ROOM_HEIGHT); // left
            ctx.fillRect(ROOM_WIDTH - 5, 0, 5, ROOM_HEIGHT); // right
            ctx.fillRect(0, ROOM_HEIGHT - 5, ROOM_WIDTH, 5); // bottom
            
            // Draw doors
            ctx.fillStyle = assets.door.color;
            // Top door
            ctx.fillRect(ROOM_WIDTH/2 - DOOR_SIZE/2, 0, DOOR_SIZE, DOOR_SIZE/2);
            // Bottom door
            ctx.fillRect(ROOM_WIDTH/2 - DOOR_SIZE/2, ROOM_HEIGHT - DOOR_SIZE/2, DOOR_SIZE, DOOR_SIZE/2);
            // Left door
            ctx.fillRect(0, ROOM_HEIGHT/2 - DOOR_SIZE/2, DOOR_SIZE/2, DOOR_SIZE);
            // Right door
            ctx.fillRect(ROOM_WIDTH - DOOR_SIZE/2, ROOM_HEIGHT/2 - DOOR_SIZE/2, DOOR_SIZE/2, DOOR_SIZE);
            
            // Draw player
            ctx.fillStyle = assets.player.color;
            ctx.fillRect(
                player.x - PLAYER_SIZE/2, 
                player.y - PLAYER_SIZE/2, 
                PLAYER_SIZE, 
                PLAYER_SIZE
            );
	    ctx.beginPath();
	    ctx.moveTo(
		player.x + player.direction.x * PLAYER_SIZE/2, 
		player.y + player.direction.y * PLAYER_SIZE/2
	    );
	    ctx.lineTo(
		player.x - player.direction.y * PLAYER_SIZE/3 - player.direction.x * PLAYER_SIZE/3,
		player.y + player.direction.x * PLAYER_SIZE/3 - player.direction.y * PLAYER_SIZE/3
	    );
	    ctx.lineTo(
		player.x + player.direction.y * PLAYER_SIZE/3 - player.direction.x * PLAYER_SIZE/3,
		player.y - player.direction.x * PLAYER_SIZE/3 - player.direction.y * PLAYER_SIZE/3
	    );
	    ctx.closePath();
	    ctx.fill();
            
            // Draw direction indicator
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(
                player.x + player.direction.x * PLAYER_SIZE/2 - 2, 
                player.y + player.direction.y * PLAYER_SIZE/2 - 2, 
                4, 
                4
            );
            
            // Draw bullets
            ctx.fillStyle = assets.bullet.color;
            for (let bullet of bullets) {
                ctx.fillRect(
                    bullet.x - BULLET_SIZE/2, 
                    bullet.y - BULLET_SIZE/2, 
                    BULLET_SIZE, 
                    BULLET_SIZE
                );
            }
            
            // Draw enemies
            ctx.fillStyle = assets.enemy.color;
            for (let enemy of enemies) {
                ctx.fillRect(
                    enemy.x - ENEMY_SIZE/2, 
                    enemy.y - ENEMY_SIZE/2, 
                    ENEMY_SIZE, 
                    ENEMY_SIZE
                );
                
                // Draw health bar
                const healthWidth = ENEMY_SIZE * (enemy.health / 50);
                ctx.fillStyle = '#e74c3c';
                ctx.fillRect(
                    enemy.x - ENEMY_SIZE/2, 
                    enemy.y - ENEMY_SIZE/2 - 5, 
                    healthWidth, 
                    3
                );
            }
        }
        
        function updateUI() {
            document.getElementById('health').textContent = player.health;
            document.getElementById('score').textContent = score;
            document.getElementById('room').textContent = currentRoom;
        }
        
        function gameOver() {
            gameRunning = false;
            document.getElementById('start-screen').style.display = 'flex';
            document.querySelector('#start-screen h1').textContent = 'GAME OVER';
            document.getElementById('start-button').textContent = 'TRY AGAIN';
	}
        
        function keyDown(e) {
            keys[e.key] = true;
        }
        
        function keyUp(e) {
            keys[e.key] = false;
        }
        
        // Start the game
        window.onload = init;