// Game constants
const PLAYER_SIZE = 16;
const BULLET_SIZE = 8;
const ENEMY_SIZE = 16;
const ROOM_TEMPLATES = [
    { width: 800, height: 600, doors: ['top', 'right', 'bottom'] },
    { width: 800, height: 600, doors: ['left', 'bottom', 'right'] },
    { width: 800, height: 600, doors: ['top', 'left', 'bottom'] },
    { width: 800, height: 600, doors: ['top', 'right'] },
    { width: 800, height: 600, doors: ['left', 'bottom'] },
    { width: 1000, height: 800, doors: ['top', 'right', 'bottom', 'left'] },
    { width: 1000, height: 800, doors: ['top', 'left', 'right'] },
    { width: 600, height: 800, doors: ['top', 'bottom'] }
];
const DOOR_SIZE = 32;
const TOTAL_FLOORS = 5;
const MINI_MAP_SCALE = 0.1;
const MINI_MAP_PADDING = 10;
const CAMERA_PADDING = 100;

// Game variables
let canvas, ctx;
let player = {
    x: 0,
    y: 0,
    speed: 3,
    health: 50,
    direction: { x: 0, y: -1 },
    lastMoveDirection: { x: 0, y: -1 }
};
let bullets = [];
let enemies = [];
let rooms = [];
let currentRoom = null;
let currentRoomIndex = 0;
let bossDefeated = false;
let score = 0;
let keys = {};
let gameRunning = false;
let lastShotTime = 0;
const shotDelay = 300;
let camera = { x: 0, y: 0 };
let roomConnections = {};

// Pixel art assets
const assets = {
    player: { color: '#3498db' },
    bullet: { color: '#f1c40f' },
    enemy: { color: '#e74c3c' },
    boss: { color: '#9b59b6' },
    wall: { color: '#7f8c8d' },
    floor: { color: '#34495e' },
    door: { color: '#8e44ad' },
    stairs: { color: '#8e44ad' },
    miniMap: {
        room: '#2c3e50',
        currentRoom: '#3498db',
        player: '#e74c3c',
        bossRoom: '#9b59b6',
        door: '#8e44ad'
    }
};

// Initialize game
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    document.addEventListener('keydown', keyDown);
    document.addEventListener('keyup', keyUp);
    document.getElementById('start-button').addEventListener('click', startGame);
    
    document.fonts.load('12px "Press Start 2P"').then(() => {});
}

function startGame() {
    document.getElementById('start-screen').style.display = 'none';
    gameRunning = true;
    player.health = 50;
    player.currentFloor = 1;
    score = 0;
    bossDefeated = false;
    player.direction = { x: 0, y: -1 };
    player.lastMoveDirection = { x: 0, y: -1 };
    updateUI();
    generateFloor(player.currentFloor);
    gameLoop();
}

function gameLoop() {
    if (!gameRunning) return;
    
    update();
    render();
    
    requestAnimationFrame(gameLoop);
}

function update() {
    // Player movement - 8 directions
    updatePlayerMovement();
    
    // Update player position with collision checks
    updatePlayerPosition();
    
    // Check room transitions
    checkDoorCollision();
    
    // Shooting
    if ((keys[' '] || keys['Spacebar']) && Date.now() - lastShotTime > shotDelay) {
        shoot();
        lastShotTime = Date.now();
    }
    
    // Update bullets
    updateBullets();
    
    // Update enemies
    updateEnemies();
    
    // Update camera position
    updateCamera();
}

function updatePlayerMovement() {
    player.direction = { x: 0, y: 0 };
    
    const up = keys['w'] || keys['ц'] || keys['ArrowUp'];
    const down = keys['s'] || keys['ы'] || keys['ArrowDown'];
    const left = keys['a'] || keys['ф'] || keys['ArrowLeft'];
    const right = keys['d'] || keys['в'] || keys['ArrowRight'];

    // 8-directional movement
    if (up && !down) {
        if (left && !right) player.direction = { x: -0.7071, y: -0.7071 }; // up-left
        else if (right && !left) player.direction = { x: 0.7071, y: -0.7071 }; // up-right
        else player.direction = { x: 0, y: -1 }; // up
    } 
    else if (down && !up) {
        if (left && !right) player.direction = { x: -0.7071, y: 0.7071 }; // down-left
        else if (right && !left) player.direction = { x: 0.7071, y: 0.7071 }; // down-right
        else player.direction = { x: 0, y: 1 }; // down
    }
    else if (left && !right) player.direction = { x: -1, y: 0 }; // left
    else if (right && !left) player.direction = { x: 1, y: 0 }; // right

    if (player.direction.x !== 0 || player.direction.y !== 0) {
        player.lastMoveDirection = { ...player.direction };
    }
}

function updatePlayerPosition() {
    const newX = player.x + player.direction.x * player.speed;
    const newY = player.y + player.direction.y * player.speed;
    
    // Wall collision
    if (newX - PLAYER_SIZE/2 > 0 && newX + PLAYER_SIZE/2 < currentRoom.width) {
        player.x = newX;
    }
    if (newY - PLAYER_SIZE/2 > 0 && newY + PLAYER_SIZE/2 < currentRoom.height) {
        player.y = newY;
    }
}

function updateCamera() {
    // Center camera on player with padding
    camera.x = player.x - canvas.width/2;
    camera.y = player.y - canvas.height/2;
    
    // Clamp camera to room boundaries
    camera.x = Math.max(0, Math.min(camera.x, currentRoom.width - canvas.width));
    camera.y = Math.max(0, Math.min(camera.y, currentRoom.height - canvas.height));
}

function checkDoorCollision() {
    const doorMargin = 20;
    const room = currentRoom;
    
    // Check all possible doors
    for (const door of room.doors) {
        let inDoor = false;
        let newRoomIndex = -1;
        
        switch(door) {
            case 'top':
                if (player.y < doorMargin && 
                    player.x > room.width/2 - DOOR_SIZE && 
                    player.x < room.width/2 + DOOR_SIZE) {
                    inDoor = true;
                    newRoomIndex = roomConnections[currentRoomIndex].top;
                }
                break;
            case 'bottom':
                if (player.y > room.height - doorMargin && 
                    player.x > room.width/2 - DOOR_SIZE && 
                    player.x < room.width/2 + DOOR_SIZE) {
                    inDoor = true;
                    newRoomIndex = roomConnections[currentRoomIndex].bottom;
                }
                break;
            case 'left':
                if (player.x < doorMargin && 
                    player.y > room.height/2 - DOOR_SIZE && 
                    player.y < room.height/2 + DOOR_SIZE) {
                    inDoor = true;
                    newRoomIndex = roomConnections[currentRoomIndex].left;
                }
                break;
            case 'right':
                if (player.x > room.width - doorMargin && 
                    player.y > room.height/2 - DOOR_SIZE && 
                    player.y < room.height/2 + DOOR_SIZE) {
                    inDoor = true;
                    newRoomIndex = roomConnections[currentRoomIndex].right;
                }
                break;
        }
        
        if (inDoor && newRoomIndex !== -1) {
            changeRoom(newRoomIndex);
            return;
        }
    }
    
    // Check stairs to next floor
    if (bossDefeated && currentRoom.hasStairs) {
        if (checkCollision(player, {x: room.width/2, y: room.height/2}, PLAYER_SIZE, DOOR_SIZE*2)) {
            player.currentFloor++;
            if (player.currentFloor <= TOTAL_FLOORS) {
                generateFloor(player.currentFloor);
            } else {
                gameWin();
            }
        }
    }
}

function changeRoom(roomIndex) {
    const prevRoomIndex = currentRoomIndex;
    currentRoomIndex = roomIndex;
    currentRoom = rooms[roomIndex];
    enemies = [...currentRoom.enemies];
    
    // Position player at appropriate door
    const connection = findConnection(prevRoomIndex, roomIndex);
    if (connection) {
        switch(connection.door) {
            case 'top':
                player.x = currentRoom.width/2;
                player.y = currentRoom.height - PLAYER_SIZE - 10;
                break;
            case 'bottom':
                player.x = currentRoom.width/2;
                player.y = PLAYER_SIZE + 10;
                break;
            case 'left':
                player.x = currentRoom.width - PLAYER_SIZE - 10;
                player.y = currentRoom.height/2;
                break;
            case 'right':
                player.x = PLAYER_SIZE + 10;
                player.y = currentRoom.height/2;
                break;
        }
    }
    
    // Update canvas size
    canvas.width = Math.min(currentRoom.width, window.innerWidth);
    canvas.height = Math.min(currentRoom.height, window.innerHeight);
    updateCamera();
}

function findConnection(fromIndex, toIndex) {
    const fromRoom = roomConnections[fromIndex];
    for (const [dir, index] of Object.entries(fromRoom)) {
        if (index === toIndex) {
            return { door: dir, from: fromIndex, to: toIndex };
        }
    }
    return null;
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].x += bullets[i].dx * bullets[i].speed;
        bullets[i].y += bullets[i].dy * bullets[i].speed;
        
        // Remove bullets that go off screen
        if (bullets[i].x < 0 || bullets[i].x > currentRoom.width || 
            bullets[i].y < 0 || bullets[i].y > currentRoom.height) {
            bullets.splice(i, 1);
            continue;
        }
        
        // Check bullet-enemy collisions
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (checkCollision(bullets[i], enemies[j], BULLET_SIZE, ENEMY_SIZE)) {
                enemies[j].health -= bullets[i].damage;
                bullets.splice(i, 1);
                
                if (enemies[j].health <= 0) {
                    if (enemies[j].isBoss) {
                        bossDefeated = true;
                        currentRoom.hasStairs = true;
                    }
                    score += enemies[j].isBoss ? 5 : 1;
                    enemies.splice(j, 1);
                    updateUI();
                }
                break;
            }
        }
    }
}

function updateEnemies() {
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
        
        // Player-enemy collision
        if (checkCollision(player, enemies[i], PLAYER_SIZE, ENEMY_SIZE)) {
            pushApart(player, enemies[i], 0.8);
            player.health -= enemies[i].isBoss ? 2 : 0.5;
            updateUI();
            
            if (player.health <= 0) {
                gameOver();
            }
        }
    }
    
    // Enemy-enemy collision
    for (let i = 0; i < enemies.length; i++) {
        for (let j = i + 1; j < enemies.length; j++) {
            if (checkCollision(enemies[i], enemies[j], ENEMY_SIZE, ENEMY_SIZE)) {
                pushApart(enemies[i], enemies[j], 0.3);
            }
        }
    }
}

function shoot() {
    // Use last move direction if not moving
    const shootDirection = (player.direction.x === 0 && player.direction.y === 0) 
        ? player.lastMoveDirection 
        : player.direction;

    bullets.push({
        x: player.x,
        y: player.y,
        dx: shootDirection.x,
        dy: shootDirection.y,
        speed: 5,
        damage: 25
    });
}

function generateFloor(floorNumber) {
    rooms = [];
    roomConnections = {};
    bossDefeated = false;
    
    // Generate 5-8 rooms per floor
    const roomCount = 5 + Math.floor(Math.random() * 4);
    const usedTemplates = [];
    
    // Create rooms
    for (let i = 0; i < roomCount; i++) {
        const template = ROOM_TEMPLATES[Math.floor(Math.random() * ROOM_TEMPLATES.length)];
        
        const roomEnemies = [];
        const enemyCount = 3 + Math.floor(floorNumber / 2);
        
        for (let j = 0; j < enemyCount; j++) {
            const isBoss = (i === roomCount - 1 && j === enemyCount - 1);
            
            roomEnemies.push({
                x: 100 + Math.random() * (template.width - 200),
                y: 100 + Math.random() * (template.height - 200),
                speed: 1 + floorNumber * 0.2,
                health: 50 + floorNumber * 10,
                isBoss: isBoss,
                direction: { x: 0, y: 0 }
            });
        }
        
        rooms.push({
            width: template.width,
            height: template.height,
            doors: [...template.doors],
            enemies: roomEnemies,
            isBossRoom: i === roomCount - 1,
            hasStairs: false
        });
        
        roomConnections[i] = { top: -1, bottom: -1, left: -1, right: -1 };
    }
    
    // Connect rooms
    connectRooms();
    
    // Set first room as current
    currentRoomIndex = 0;
    currentRoom = rooms[0];
    enemies = [...currentRoom.enemies];
    
    // Position player in center
    player.x = currentRoom.width / 2;
    player.y = currentRoom.height / 2;
    
    // Set canvas size
    canvas.width = Math.min(currentRoom.width, window.innerWidth);
    canvas.height = Math.min(currentRoom.height, window.innerHeight);
    updateCamera();
}

function connectRooms() {
    // Create a tree structure to ensure all rooms are connected
    const connected = new Set([0]);
    const unconnected = new Set([...Array(rooms.length).keys()].slice(1));
    
    while (unconnected.size > 0) {
        // Find a random connected room with available doors
        let fromIndex, fromRoom, availableDoors;
        
        do {
            fromIndex = [...connected][Math.floor(Math.random() * connected.size)];
            fromRoom = rooms[fromIndex];
            availableDoors = fromRoom.doors.filter(door => 
                roomConnections[fromIndex][door] === -1);
        } while (availableDoors.length === 0);
        
        const door = availableDoors[Math.floor(Math.random() * availableDoors.length)];
        
        // Find a random unconnected room with matching door
        let toIndex, toRoom, matchingDoor;
        const oppositeDoor = {
            top: 'bottom',
            bottom: 'top',
            left: 'right',
            right: 'left'
        }[door];
        
        const possibleRooms = [...unconnected].filter(i => 
            rooms[i].doors.includes(oppositeDoor) && 
            roomConnections[i][oppositeDoor] === -1);
        
        if (possibleRooms.length > 0) {
            toIndex = possibleRooms[Math.floor(Math.random() * possibleRooms.length)];
            toRoom = rooms[toIndex];
            matchingDoor = oppositeDoor;
        } else {
            // If no perfect match, find any unconnected room with any available door
            toIndex = [...unconnected][Math.floor(Math.random() * unconnected.size)];
            toRoom = rooms[toIndex];
            const availableToDoors = toRoom.doors.filter(d => 
                roomConnections[toIndex][d] === -1);
            matchingDoor = availableToDoors[Math.floor(Math.random() * availableToDoors.length)];
        }
        
        // Connect the rooms
        roomConnections[fromIndex][door] = toIndex;
        roomConnections[toIndex][matchingDoor] = fromIndex;
        
        connected.add(toIndex);
        unconnected.delete(toIndex);
    }
    
    // Add some extra random connections
    const extraConnections = Math.floor(rooms.length / 3);
    for (let i = 0; i < extraConnections; i++) {
        const fromIndex = Math.floor(Math.random() * rooms.length);
        const fromRoom = rooms[fromIndex];
        const availableDoors = fromRoom.doors.filter(door => 
            roomConnections[fromIndex][door] === -1);
        
        if (availableDoors.length > 0) {
            const door = availableDoors[Math.floor(Math.random() * availableDoors.length)];
            const oppositeDoor = {
                top: 'bottom',
                bottom: 'top',
                left: 'right',
                right: 'left'
            }[door];
            
            // Find a room with matching door
            const possibleRooms = [...Array(rooms.length).keys()].filter(i => 
                i !== fromIndex && 
                rooms[i].doors.includes(oppositeDoor) && 
                roomConnections[i][oppositeDoor] === -1);
            
            if (possibleRooms.length > 0) {
                const toIndex = possibleRooms[Math.floor(Math.random() * possibleRooms.length)];
                roomConnections[fromIndex][door] = toIndex;
                roomConnections[toIndex][oppositeDoor] = fromIndex;
            }
        }
    }
}



function renderMiniMap() {
    const miniMapSize = 150;
    const roomSize = 10;
    const padding = 5;
    
    const startX = canvas.width - miniMapSize - MINI_MAP_PADDING;
    const startY = MINI_MAP_PADDING;
    
    // Draw background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(startX, startY, miniMapSize, miniMapSize);
    
    // Calculate center position for current room
    const centerX = startX + miniMapSize/2;
    const centerY = startY + miniMapSize/2;
    
    // Draw all rooms relative to current room
    for (let i = 0; i < rooms.length; i++) {
        // Calculate position relative to current room
        let relX = 0, relY = 0;
        const visited = new Set();
        const queue = [{ index: currentRoomIndex, x: 0, y: 0 }];
        
        while (queue.length > 0) {
            const current = queue.shift();
            if (current.index === i) {
                relX = current.x;
                relY = current.y;
                break;
            }
            
            if (visited.has(current.index)) continue;
            visited.add(current.index);
            
            const connections = roomConnections[current.index];
            if (connections.top !== -1) {
                queue.push({ index: connections.top, x: current.x, y: current.y - 1 });
            }
            if (connections.bottom !== -1) {
                queue.push({ index: connections.bottom, x: current.x, y: current.y + 1 });
            }
            if (connections.left !== -1) {
                queue.push({ index: connections.left, x: current.x - 1, y: current.y });
            }
            if (connections.right !== -1) {
                queue.push({ index: connections.right, x: current.x + 1, y: current.y });
            }
        }
        
        // Draw room
        const roomX = centerX + relX * (roomSize + padding);
        const roomY = centerY + relY * (roomSize + padding);
        
        ctx.fillStyle = i === currentRoomIndex ? assets.miniMap.currentRoom : 
                        rooms[i].isBossRoom ? assets.miniMap.bossRoom : 
                        assets.miniMap.room;
        ctx.fillRect(roomX - roomSize/2, roomY - roomSize/2, roomSize, roomSize);
        
        // Draw doors
        ctx.fillStyle = assets.miniMap.door;
        const room = rooms[i];
        if (room.doors.includes('top') && roomConnections[i].top !== -1) {
            ctx.fillRect(roomX - 2, roomY - roomSize/2 - 2, 4, 3);
        }
        if (room.doors.includes('bottom') && roomConnections[i].bottom !== -1) {
            ctx.fillRect(roomX - 2, roomY + roomSize/2 - 1, 4, 3);
        }
        if (room.doors.includes('left') && roomConnections[i].left !== -1) {
            ctx.fillRect(roomX - roomSize/2 - 2, roomY - 2, 3, 4);
        }
        if (room.doors.includes('right') && roomConnections[i].right !== -1) {
            ctx.fillRect(roomX + roomSize/2 - 1, roomY - 2, 3, 4);
        }
    }
    
    // Draw player (always in center)
    ctx.fillStyle = assets.miniMap.player;
    ctx.fillRect(centerX - 2, centerY - 2, 4, 4);
}

function render() {
    const room = currentRoom;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate visible area based on camera
    const visibleX = Math.max(0, camera.x);
    const visibleY = Math.max(0, camera.y);
    const visibleWidth = Math.min(canvas.width, room.width - camera.x);
    const visibleHeight = Math.min(canvas.height, room.height - camera.y);
    
    // Draw floor (visible part only)
    ctx.fillStyle = assets.floor.color;
    ctx.fillRect(-camera.x, -camera.y, room.width, room.height);
    
    // Draw walls (visible part only)
    ctx.fillStyle = assets.wall.color;
    // Top wall
    if (visibleY === 0) {
        ctx.fillRect(-camera.x, 0, room.width, 5);
    }
    // Left wall
    if (visibleX === 0) {
        ctx.fillRect(0, -camera.y, 5, room.height);
    }
    // Right wall
    if (visibleX + canvas.width >= room.width) {
        ctx.fillRect(room.width - 5 - camera.x, -camera.y, 5, room.height);
    }
    // Bottom wall
    if (visibleY + canvas.height >= room.height) {
        ctx.fillRect(-camera.x, room.height - 5 - camera.y, room.width, 5);
    }
    
    // Draw doors (visible part only)
    ctx.fillStyle = assets.door.color;
    for (const door of room.doors) {
        if (roomConnections[currentRoomIndex][door] !== -1) {
            switch(door) {
                case 'top':
                    if (visibleY === 0) {
                        ctx.fillRect(room.width/2 - DOOR_SIZE - camera.x, 0, DOOR_SIZE*2, DOOR_SIZE/2);
                    }
                    break;
                case 'bottom':
                    if (visibleY + canvas.height >= room.height) {
                        ctx.fillRect(room.width/2 - DOOR_SIZE - camera.x, room.height - DOOR_SIZE/2 - camera.y, DOOR_SIZE*2, DOOR_SIZE/2);
                    }
                    break;
                case 'left':
                    if (visibleX === 0) {
                        ctx.fillRect(0, room.height/2 - DOOR_SIZE - camera.y, DOOR_SIZE/2, DOOR_SIZE*2);
                    }
                    break;
                case 'right':
                    if (visibleX + canvas.width >= room.width) {
                        ctx.fillRect(room.width - DOOR_SIZE/2 - camera.x, room.height/2 - DOOR_SIZE - camera.y, DOOR_SIZE/2, DOOR_SIZE*2);
                    }
                    break;
            }
        }
    }
    
    // Draw stairs to next floor (if boss defeated)
    if (bossDefeated && currentRoom.hasStairs) {
        ctx.fillStyle = assets.stairs.color;
        ctx.fillRect(
            room.width/2 - DOOR_SIZE - camera.x, 
            room.height/2 - DOOR_SIZE - camera.y, 
            DOOR_SIZE*2, 
            DOOR_SIZE*2
        );
    }
    
    // Draw enemies (visible only)
    for (let enemy of enemies) {
        if (enemy.x + ENEMY_SIZE/2 >= camera.x && 
            enemy.x - ENEMY_SIZE/2 <= camera.x + canvas.width &&
            enemy.y + ENEMY_SIZE/2 >= camera.y && 
            enemy.y - ENEMY_SIZE/2 <= camera.y + canvas.height) {
            
            ctx.fillStyle = enemy.isBoss ? assets.boss.color : assets.enemy.color;
            ctx.fillRect(
                enemy.x - ENEMY_SIZE/2 - camera.x, 
                enemy.y - ENEMY_SIZE/2 - camera.y, 
                ENEMY_SIZE, 
                ENEMY_SIZE
            );
            
            // Draw health bar
            const healthWidth = ENEMY_SIZE * (enemy.health / (50 + player.currentFloor * 10));
            ctx.fillStyle = enemy.isBoss ? '#9b59b6' : '#e74c3c';
            ctx.fillRect(
                enemy.x - ENEMY_SIZE/2 - camera.x, 
                enemy.y - ENEMY_SIZE/2 - 5 - camera.y, 
                healthWidth, 
                3
            );
        }
    }
    
    // Draw bullets (visible only)
    ctx.fillStyle = assets.bullet.color;
    for (let bullet of bullets) {
        if (bullet.x + BULLET_SIZE/2 >= camera.x && 
            bullet.x - BULLET_SIZE/2 <= camera.x + canvas.width &&
            bullet.y + BULLET_SIZE/2 >= camera.y && 
            bullet.y - BULLET_SIZE/2 <= camera.y + canvas.height) {
            
            ctx.fillRect(
                bullet.x - BULLET_SIZE/2 - camera.x, 
                bullet.y - BULLET_SIZE/2 - camera.y, 
                BULLET_SIZE, 
                BULLET_SIZE
            );
        }
    }
    
    // Draw player (always visible)
    ctx.fillStyle = assets.player.color;
    ctx.save();
    ctx.translate(player.x - camera.x, player.y - camera.y);
    
    // Calculate angle for rotation
    const angle = Math.atan2(player.lastMoveDirection.y, player.lastMoveDirection.x);
    ctx.rotate(angle + Math.PI/2);
    
    // Draw player body
    ctx.fillRect(-PLAYER_SIZE/2, -PLAYER_SIZE/2, PLAYER_SIZE, PLAYER_SIZE);
    
    // Draw player direction indicator
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2, -PLAYER_SIZE/2 - 2, 4, 4);
    
    ctx.restore();
    
    // Draw mini-map
    renderMiniMap();
}

function updateUI() {
    document.getElementById('health').textContent = Math.floor(player.health);
    document.getElementById('score').textContent = score;
    document.getElementById('floor').textContent = player.currentFloor;
    document.getElementById('room').textContent = `${currentRoomIndex + 1}/${rooms.length}`;
}

function gameOver() {
    gameRunning = false;
    document.getElementById('start-screen').style.display = 'flex';
    document.querySelector('#start-screen h1').textContent = 'GAME OVER';
    document.getElementById('start-button').textContent = 'TRY AGAIN';
}

function gameWin() {
    gameRunning = false;
    document.getElementById('start-screen').style.display = 'flex';
    document.querySelector('#start-screen h1').textContent = 'YOU WIN!';
    document.getElementById('start-button').textContent = 'PLAY AGAIN';
}

function keyDown(e) {
    keys[e.key] = true;
}

function keyUp(e) {
    keys[e.key] = false;
}

function checkCollision(obj1, obj2, size1, size2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (size1/2 + size2/2);
}

function pushApart(obj1, obj2, force = 0.5) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return;

    const nx = dx / distance;
    const ny = dy / distance;

    obj1.x += nx * force;
    obj1.y += ny * force;
    obj2.x -= nx * force;
    obj2.y -= ny * force;
}

// Start the game
window.onload = init;
