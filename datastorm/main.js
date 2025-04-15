// Game setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const upgradeScreen = document.getElementById('upgradeScreen');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const continueButton = document.getElementById('continueButton');
const healthDisplay = document.getElementById('health');
const scoreDisplay = document.getElementById('score');
const levelDisplay = document.getElementById('level');
const upgradePointsDisplay = document.getElementById('upgradePoints');
const finalScoreDisplay = document.getElementById('finalScore');
const finalUpgradesDisplay = document.getElementById('finalUpgrades');
const availablePointsDisplay = document.getElementById('availablePoints');
const nextLevelDisplay = document.getElementById('nextLevel');

// Set canvas size
function resizeCanvas() {
    const size = Math.min(window.innerWidth - 40, window.innerHeight - 150, 800);
    canvas.width = size;
    canvas.height = size;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game state
let gameRunning = false;
let score = 0;
let level = 1;
let health = 100;
let maxHealth = 100;
let upgradePoints = 0;
let enemies = [];
let bullets = [];
let particles = [];
let dataNodes = [];
let keys = {};
let mouse = { x: 0, y: 0 };

// Player upgrades
const upgrades = {
    fireRate: { level: 0, cost: 5, maxLevel: 5 },
    damage: { level: 0, cost: 5, maxLevel: 5 },
    health: { level: 0, cost: 5, maxLevel: 5 },
    speed: { level: 0, cost: 5, maxLevel: 5 },
    bulletSpeed: { level: 0, cost: 5, maxLevel: 5 },
    nodeHealth: { level: 0, cost: 5, maxLevel: 5 }
};

// Player stats
let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 15,
    speed: 5,
    color: '#3b82f6',
    lastShot: 0,
    shootDelay: 300,
    bulletDamage: 1,
    bulletSpeed: 10
};

// Event listeners
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
continueButton.addEventListener('click', continueGame);

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});

canvas.addEventListener('click', (e) => {
    if (gameRunning) {
        shoot();
    }
});

// Game functions
function startGame() {
    gameRunning = true;
    score = 0;
    level = 1;
    health = maxHealth;
    upgradePoints = 0;
    enemies = [];
    bullets = [];
    particles = [];
    dataNodes = [];
    
    // Reset upgrades
    for (const upgrade in upgrades) {
        upgrades[upgrade].level = 0;
    }
    
    // Reset player stats
    player = {
        x: canvas.width / 2,
	    y: canvas.height / 2,
	    radius: 15,
    	speed: 5,
	    color: '#3b82f6',
    	lastShot: 0,
    	shootDelay: 300,
    	bulletDamage: 1,
    	bulletSpeed: 10
    };
    
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    upgradeScreen.classList.add('hidden');
    
    // Update displays
    scoreDisplay.textContent = score;
    levelDisplay.textContent = level;
    healthDisplay.textContent = `${health}%`;
    upgradePointsDisplay.textContent = upgradePoints;
    
    // Create initial data nodes
    createDataNodes();
    
    // Start game loop
    requestAnimationFrame(gameLoop);
    
    // Start enemy spawner
    setTimeout(spawnEnemy, 1000);
}

function continueGame() {
    upgradeScreen.classList.add('hidden');
    gameRunning = true;
    
    // Create data nodes for new level
    createDataNodes();
    
    // Start enemy spawner
    setTimeout(spawnEnemy, 1000);
    
    // Continue game loop
    requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameRunning = false;
    finalScoreDisplay.textContent = score;
    
    // Calculate total upgrades purchased
    let totalUpgrades = 0;
    for (const upgrade in upgrades) {
        totalUpgrades += upgrades[upgrade].level;
    }
    finalUpgradesDisplay.textContent = totalUpgrades;
    
    gameOverScreen.classList.remove('hidden');
}

function showUpgradeScreen() {
    gameRunning = false;
    upgradeScreen.classList.remove('hidden');
    
    // Update available points display
    availablePointsDisplay.textContent = upgradePoints;
    nextLevelDisplay.textContent = level + 1;
    
    // Update all upgrade displays
    updateUpgradeDisplays();
}

function updateUpgradeDisplays() {
    // Fire Rate
    document.getElementById('fireRateLevel').textContent = upgrades.fireRate.level;
    document.getElementById('fireRateCost').textContent = upgrades.fireRate.cost;
    document.getElementById('fireRateBar').style.width = `${(upgrades.fireRate.level / upgrades.fireRate.maxLevel) * 100}%`;
    
    // Damage
    document.getElementById('damageLevel').textContent = upgrades.damage.level;
    document.getElementById('damageCost').textContent = upgrades.damage.cost;
    document.getElementById('damageBar').style.width = `${(upgrades.damage.level / upgrades.damage.maxLevel) * 100}%`;
    
    // Health
    document.getElementById('healthLevel').textContent = upgrades.health.level;
    document.getElementById('healthCost').textContent = upgrades.health.cost;
    document.getElementById('healthBar').style.width = `${(upgrades.health.level / upgrades.health.maxLevel) * 100}%`;
    
    // Speed
    document.getElementById('speedLevel').textContent = upgrades.speed.level;
    document.getElementById('speedCost').textContent = upgrades.speed.cost;
    document.getElementById('speedBar').style.width = `${(upgrades.speed.level / upgrades.speed.maxLevel) * 100}%`;
    
    // Bullet Speed
    document.getElementById('bulletSpeedLevel').textContent = upgrades.bulletSpeed.level;
    document.getElementById('bulletSpeedCost').textContent = upgrades.bulletSpeed.cost;
    document.getElementById('bulletSpeedBar').style.width = `${(upgrades.bulletSpeed.level / upgrades.bulletSpeed.maxLevel) * 100}%`;
    
    // Node Health
    document.getElementById('nodeHealthLevel').textContent = upgrades.nodeHealth.level;
    document.getElementById('nodeHealthCost').textContent = upgrades.nodeHealth.cost;
    document.getElementById('nodeHealthBar').style.width = `${(upgrades.nodeHealth.level / upgrades.nodeHealth.maxLevel) * 100}%`;
    
    // Disable upgrade cards if not enough points or max level reached
    const upgradeCards = document.querySelectorAll('.upgrade-card');
    upgradeCards.forEach(card => {
        const upgradeType = card.onclick.toString().match(/purchaseUpgrade\('(.*?)'\)/)[1];
        const upgrade = upgrades[upgradeType];

        if (upgradePoints < upgrade.cost || upgrade.level >= upgrade.maxLevel) {
            card.classList.add('disabled');
        } else {
            card.classList.remove('disabled');
        }
    });
}

function purchaseUpgrade(type) {
    const upgrade = upgrades[type];
    
    // Check if player can afford this upgrade
    if (upgradePoints >= upgrade.cost && upgrade.level < upgrade.maxLevel) {
        upgradePoints -= upgrade.cost;
        upgrade.level++;

        // Apply the upgrade
        switch (type) {
            case 'fireRate':
                player.shootDelay = Math.max(100, 300 - (upgrade.level * 40));
                break;
            case 'damage':
		        player.bulletDamage = 1 + upgrade.level;
	        	break;
	        case 'health':
	        	maxHealth = 100 + (upgrade.level * 20);
	        	health = maxHealth;
	        	healthDisplay.textContent = `${health}%`;
	        	break;
    	    case 'speed':
	        	player.speed = 5 + (upgrade.level * 0.5);
	        	break;
    	    case 'bulletSpeed':
	        	player.bulletSpeed = 10 + (upgrade.level * 1.5);
	        	break;
            case 'nodeHealth':
	        	// This will affect newly spawned nodes
        		break;
	    }

	    // Increase cost for next level
	    upgrade.cost = Math.floor(upgrade.cost * 1.5);

	    // Update displays
	    upgradePointsDisplay.textContent = upgradePoints;
	    availablePointsDisplay.textContent = upgradePoints;
    	updateUpgradeDisplays();
    }
}

function createDataNodes() {
    const nodeCount = 5 + level * 2;
    dataNodes = [];
    
    // Base node health is 1, plus any upgrades
    const nodeHealth = 1 + upgrades.nodeHealth.level;
    
    for (let i = 0; i < nodeCount; i++) {
	    dataNodes.push({
    	    x: Math.random() * (canvas.width - 100) + 50,
    	    y: Math.random() * (canvas.height - 100) + 50,
    	    radius: 8 + Math.random() * 5,
    	    color: `hsl(${Math.random() * 60 + 200}, 80%, 60%)`,
    	    value: nodeHealth
	    });
    }
}

function spawnEnemy() {
    if (!gameRunning) return;
    
    const side = Math.floor(Math.random() * 4);
    let x, y;
    
    switch (side) {
	    case 0: // top
    	    x = Math.random() * canvas.width;
            y = -20;
    	    break;
	    case 1: // right
    	    x = canvas.width + 20;
    	    y = Math.random() * canvas.height;
    	    break;
	    case 2: // bottom
            x = Math.random() * canvas.width;
    	    y = canvas.height + 20;
            break;
	    case 3: // left
            x = -20;
            y = Math.random() * canvas.height;
            break;
    }
    
    const speed = 1 + Math.random() * 1 + level * 0.2;
    const health = 1 + Math.floor(level / 3);
    
    enemies.push({
	    x,
	    y,
	    radius: 12,
	    speed,
	    color: `hsl(${Math.random() * 60 + 320}, 80%, 50%)`,
	    health,
	    maxHealth: health,
	    targetNode: Math.floor(Math.random() * dataNodes.length),
	    lastHit: 0
    });
    
    // Schedule next spawn
    const spawnDelay = Math.max(500, 2000 - level * 100);
    setTimeout(spawnEnemy, spawnDelay);
}

function shoot() {
    const now = Date.now();
    if (now - player.lastShot < player.shootDelay) return;
    
    player.lastShot = now;
    
    // Calculate direction to mouse
    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    
    bullets.push({
	    x: player.x,
	    y: player.y,
    	radius: 5,
    	speed: player.bulletSpeed,
    	color: '#f59e0b',
    	damage: player.bulletDamage,
    	dx: Math.cos(angle) * player.bulletSpeed,
    	dy: Math.sin(angle) * player.bulletSpeed,
    	lifetime: 60
    });
    
    // Add muzzle flash particle
    for (let i = 0; i < 5; i++) {
	    particles.push({
    	    x: player.x,
    	    y: player.y,
    	    radius: Math.random() * 3 + 1,
    	    color: '#f59e0b',
    	    dx: Math.cos(angle) * (Math.random() * 5 + 2),
    	    dy: Math.sin(angle) * (Math.random() * 5 + 2),
    	    lifetime: 20 + Math.random() * 10
	    });
    }
}

function update() {
    // Player movement
    let dx = 0, dy = 0;
    
    if (keys['ArrowUp'] || keys['w']) dy -= player.speed;
    if (keys['ArrowDown'] || keys['s']) dy += player.speed;
    if (keys['ArrowLeft'] || keys['a']) dx -= player.speed;
    if (keys['ArrowRight'] || keys['d']) dx += player.speed;
    
    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
	    const factor = player.speed / Math.sqrt(dx * dx + dy * dy);
	    dx *= factor;
	    dy *= factor;
    }
    
    player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x + dx));
    player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y + dy));
    
    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
	    const bullet = bullets[i];
	    bullet.x += bullet.dx;
	    bullet.y += bullet.dy;
	    bullet.lifetime--;

    	// Remove bullets that are out of bounds or expired
    	if (bullet.lifetime <= 0 || 
    	    bullet.x < 0 || bullet.x > canvas.width || 
    	    bullet.y < 0 || bullet.y > canvas.height) {
    	    bullets.splice(i, 1);
    	}
    }
    
    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
	    const enemy = enemies[i];

	    // Move toward target data node
	    if (dataNodes.length > 0 && enemy.targetNode < dataNodes.length) {
    	    const target = dataNodes[enemy.targetNode];
    	    const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
    	    enemy.x += Math.cos(angle) * enemy.speed;
    	    enemy.y += Math.sin(angle) * enemy.speed;
    
    	    // Check collision with data node
	        const dist = Math.hypot(target.x - enemy.x, target.y - enemy.y);
	        if (dist < enemy.radius + target.radius) {
		        // Damage the data node
		        target.value--;
		        if (target.value <= 0) {
		            dataNodes.splice(enemy.targetNode, 1);
    
    			    // Create explosion particles
    			    for (let j = 0; j < 15; j++) {
			            particles.push({
    				        x: target.x,
        				    y: target.y,
    			    	    radius: Math.random() * 4 + 2,
    			    	    color: target.color,
    			        	dx: (Math.random() - 0.5) * 8,
    			        	dy: (Math.random() - 0.5) * 8,
    			        	lifetime: 30 + Math.random() * 20
			            });
    			    }
		        }

		        // Enemy finds new target
		        if (dataNodes.length > 0) {
    			    enemy.targetNode = Math.floor(Math.random() * dataNodes.length);
		        } else {
    		    	// No more data nodes - attack player
    		    	const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    		    	enemy.x += Math.cos(angle) * enemy.speed;
    		    	enemy.y += Math.sin(angle) * enemy.speed;
		        }
    		}
	    } else {
    		// Attack player if no data nodes
    		const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    		enemy.x += Math.cos(angle) * enemy.speed;
    		enemy.y += Math.sin(angle) * enemy.speed;
	    }

	    // Check collision with player
	    const distToPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y);
	    if (distToPlayer < player.radius + enemy.radius) {
    		const now = Date.now();
    		if (now - enemy.lastHit > 1000) {
		        health -= 10;
		        enemy.lastHit = now;
		        healthDisplay.textContent = `${health}%`;

		        if (health <= 0) {
    			    gameOver();
		        }
    		}
	    }

	    // Check collision with bullets
	    for (let j = bullets.length - 1; j >= 0; j--) {
    		const bullet = bullets[j];
    		const dist = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);
    
    		if (dist < bullet.radius + enemy.radius) {
		        enemy.health -= bullet.damage;

		        // Create hit particles
		        for (let k = 0; k < 5; k++) {
    		    	particles.push({
			            x: enemy.x,
			            y: enemy.y,
			            radius: Math.random() * 3 + 1,
			            color: enemy.color,
			            dx: (Math.random() - 0.5) * 4,
        			    dy: (Math.random() - 0.5) * 4,
			            lifetime: 20 + Math.random() * 10
    		    	});
		        }

		        bullets.splice(j, 1);

		        if (enemy.health <= 0) {
    			    // Enemy destroyed
    			    score += 10 * level;
    			    upgradePoints += 1;
    			    scoreDisplay.textContent = score;
    			    upgradePointsDisplay.textContent = upgradePoints;
    
    			    // Create explosion particles
    		    	for (let k = 0; k < 15; k++) {
			            particles.push({
    		        		x: enemy.x,
    		        		y: enemy.y,
    		        		radius: Math.random() * 4 + 2,
    		        		color: enemy.color,
    		        		dx: (Math.random() - 0.5) * 8,
    		        		dy: (Math.random() - 0.5) * 8,
    		        		lifetime: 30 + Math.random() * 20
			            });
    			    }
    			    enemies.splice(i, 1);
		        }
		        break;
    		}
	    }
    }
    
    // Update particles
	for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.x += particle.dx;
        particle.y += particle.dy;
        particle.lifetime--;

	    if (particle.lifetime <= 0) {
    		particles.splice(i, 1);
	    }
    }
    
   	// Check for level up
   	if (score > 0 && score % (100 * level) === 0 && enemies.length === 0) {
	    level++;
	    levelDisplay.textContent = level;
	    showUpgradeScreen();
   	}
    
    // Game over if all data nodes are destroyed
	if (dataNodes.length === 0 && enemies.length > 0) {
        gameOver();
   	}
}

function render() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)';
    ctx.lineWidth = 1;
    
    const gridSize = 40;
    for (let x = 0; x < canvas.width; x += gridSize) {
    	ctx.beginPath();
    	ctx.moveTo(x, 0);
    	ctx.lineTo(x, canvas.height);
    	ctx.stroke();
    }
    
    for (let y = 0; y < canvas.height; y += gridSize) {
	    ctx.beginPath();
	    ctx.moveTo(0, y);
	    ctx.lineTo(canvas.width, y);
	    ctx.stroke();
    }
    
    // Draw data nodes
    for (const node of dataNodes) {
	    ctx.beginPath();
	    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
	    ctx.fillStyle = node.color;
	    ctx.fill();

	    // Draw concentric circles
	    ctx.beginPath();
	    ctx.arc(node.x, node.y, node.radius * 1.5, 0, Math.PI * 2);
	    ctx.strokeStyle = node.color;
	    ctx.lineWidth = 1;
	    ctx.stroke();

	    // Draw value indicator
	    ctx.fillStyle = 'white';
	    ctx.font = 'bold 10px Arial';
	    ctx.textAlign = 'center';
	    ctx.textBaseline = 'middle';
	    ctx.fillText(node.value.toString(), node.x, node.y);
    }
    
    // Draw particles
    for (const particle of particles) {
	    ctx.beginPath();
	    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
	    ctx.fillStyle = particle.color;
	    ctx.fill();
    }
    
    // Draw enemies
    for (const enemy of enemies) {
	    ctx.beginPath();
	    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
	    ctx.fillStyle = enemy.color;
	    ctx.fill();

	    // Draw health bar
	    if (enemy.health < enemy.maxHealth) {
    	    const healthWidth = (enemy.radius * 2) * (enemy.health / enemy.maxHealth);
    	    ctx.fillStyle = 'red';
    	    ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 8, healthWidth, 3);
	    }
    }
    
    // Draw bullets
    for (const bullet of bullets) {
	    ctx.beginPath();
	    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
	    ctx.fillStyle = bullet.color;
    	ctx.fill();
    }
    
    // Draw player
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.fill();
    
    // Draw player direction indicator
    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    const tipX = player.x + Math.cos(angle) * (player.radius + 10);
    const tipY = player.y + Math.sin(angle) * (player.radius + 10);
    
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(tipX, tipY);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw small circle at tip
    ctx.beginPath();
    ctx.arc(tipX, tipY, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    
    // Draw health circle around player
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 5, 0, (Math.PI * 2) * (health / maxHealth));
    ctx.strokeStyle = health > 30 ? '#10b981' : '#ef4444';
    ctx.lineWidth = 3;
    ctx.stroke();
}

function gameLoop() {
    if (!gameRunning) return;
    update();
    render();
    requestAnimationFrame(gameLoop);
}
