class FirewallDefender {
    constructor() {
        this.gameState = {
            running: false,
            paused: false,
            score: 0,
            level: 1,
            threatsInWave: 50,
            threatsDestroyed: 0,
            waveComplete: false,
            waveTimer: 0,
            gameOver: false
        };

        this.firewall = {
            x: 0,
            y: 0,
            width: 100,
            height: 10,
            speed: 8,
            color: '#00ff41',
            targetX: 0,
            velocity: 0,
            friction: 0.9
        };

        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();

        this.threats = [];
        this.dataNodes = [];
        this.particles = [];
        this.fastThreats = [];

        this.threatTypes = [
            { color: '#ff5555', speed: 2, health: 8, width: 20, height: 20, score: 10 },
            { color: '#ffaa00', speed: 3, health: 5, width: 18, height: 18, score: 15 },
            { color: '#ff00ff', speed: 4, health: 3, width: 16, height: 16, score: 20 }
        ];

        this.fastThreatType = { 
            color: '#00ffff', 
            speed: 7, 
            health: 1, 
            width: 20, 
            height: 20, 
            score: 30 
        };

        this.initElements();
        this.setupEventListeners();
        this.updateDisplays();
    }

    initElements() {
        this.startScreen = document.getElementById('startScreen');
        this.gameOverScreen = document.getElementById('gameOver');
        this.pauseScreen = document.getElementById('pauseScreen');
        this.startButton = document.getElementById('startButton');
        this.restartButton = document.getElementById('restartButton');
        this.resumeButton = document.getElementById('resumeButton');
        this.scoreDisplay = document.getElementById('score');
        this.levelDisplay = document.getElementById('level');
        this.finalScoreDisplay = document.getElementById('finalScore');
        this.waveProgress = document.getElementById('waveProgress');
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.handleTouchMove(e);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.togglePause();
            if (this.gameState.paused) return;
            if (e.key === 'ArrowLeft') this.firewall.targetX -= this.firewall.speed * 2;
            if (e.key === 'ArrowRight') this.firewall.targetX += this.firewall.speed * 2;
        });

        this.startButton.addEventListener('click', () => this.initGame());
        this.restartButton.addEventListener('click', () => this.initGame());
        this.resumeButton.addEventListener('click', () => this.togglePause());
    }

    resizeCanvas() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.canvas.width = width;
        this.canvas.height = height;
        
        // Calculate areas
        this.threatAreaHeight = height * 0.66;
        this.nodeAreaHeight = height * 0.34;
        this.firewall.y = this.threatAreaHeight - this.firewall.height;
        
        // Adjust firewall width based on screen size
        this.firewall.width = Math.max(80, width * 0.15);
        
        if (this.gameState.running) {
            this.createDataNodes();
        }
    }

    initGame() {
        this.gameState = {
            running: true,
            paused: false,
            score: 0,
            level: 1,
            threatsInWave: 50,
            threatsDestroyed: 0,
            waveComplete: false,
            waveTimer: 0,
            gameOver: false
        };

        this.threats = [];
        this.fastThreats = [];
        this.particles = [];
        
        this.firewall = {
            ...this.firewall,
            x: this.canvas.width / 2 - this.firewall.width / 2,
            y: this.threatAreaHeight - this.firewall.height,
            targetX: this.canvas.width / 2 - this.firewall.width / 2,
            velocity: 0
        };

        this.createDataNodes();
        
        this.startScreen.classList.add('hidden');
        this.gameOverScreen.classList.add('hidden');
        this.pauseScreen.classList.add('hidden');
        
        this.updateDisplays();
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        this.lastTime = performance.now();
        this.animate();
    }

    createDataNodes() {
        this.dataNodes = [];
        const nodeCount = 7;
        const minDistance = 100;
        
        for (let i = 0; i < nodeCount; i++) {
            let attempts = 0;
            let node, tooClose;
            
            do {
                tooClose = false;
                node = {
                    x: Math.random() * (this.canvas.width - 40) + 20,
                    y: this.threatAreaHeight + Math.random() * (this.nodeAreaHeight - 40) + 20,
                    radius: 15,
                    health: 10 + Math.floor(Math.random() * 10),
                    maxHealth: 0,
                    connections: []
                };
                node.maxHealth = node.health;
                
                // Check distance to other nodes
                for (const otherNode of this.dataNodes) {
                    const dx = node.x - otherNode.x;
                    const dy = node.y - otherNode.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < minDistance) {
                        tooClose = true;
                        break;
                    }
                }
                
                attempts++;
            } while (tooClose && attempts < 100);
            
            this.dataNodes.push(node);
        }
        
        // Create connections between nodes
        for (let i = 0; i < this.dataNodes.length; i++) {
            for (let j = i + 1; j < this.dataNodes.length; j++) {
                const dx = this.dataNodes[i].x - this.dataNodes[j].x;
                const dy = this.dataNodes[i].y - this.dataNodes[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 200) {
                    this.dataNodes[i].connections.push(j);
                    this.dataNodes[j].connections.push(i);
                }
            }
        }
    }

    togglePause() {
        if (!this.gameState.running) return;
        
        this.gameState.paused = !this.gameState.paused;
        this.pauseScreen.classList.toggle('hidden');
        
        if (this.gameState.paused) {
            cancelAnimationFrame(this.animationId);
        } else {
            this.lastTime = performance.now();
            this.animate();
        }
    }

    updateDisplays() {
        this.scoreDisplay.textContent = this.gameState.score;
        this.levelDisplay.textContent = this.gameState.level;
        
        const progress = (this.gameState.threatsDestroyed / this.gameState.threatsInWave) * 100;
        this.waveProgress.style.width = `${Math.min(100, progress)}%`;
    }

    handleMouseMove(e) {
        if (!this.gameState.running || this.gameState.paused) return;
        
        const rect = this.canvas.getBoundingClientRect();
        this.firewall.targetX = e.clientX - rect.left - this.firewall.width / 2;
    }

    handleTouchMove(e) {
        if (!this.gameState.running || this.gameState.paused) return;
        
        const rect = this.canvas.getBoundingClientRect();
        this.firewall.targetX = e.touches[0].clientX - rect.left - this.firewall.width / 2;
    }

    updateFirewall() {
        // Apply inertia/smoothing
        const dx = this.firewall.targetX - this.firewall.x;
        this.firewall.velocity = dx * 0.2;
        this.firewall.x += this.firewall.velocity;
        this.firewall.velocity *= this.firewall.friction;
        
        // Keep within bounds
        this.firewall.x = Math.max(0, Math.min(this.canvas.width - this.firewall.width, this.firewall.x));
    }

    createThreat() {
        if (this.gameState.threatsDestroyed >= this.gameState.threatsInWave) return;
        
        const threatType = Math.floor(Math.random() * this.threatTypes.length);
        const type = this.threatTypes[threatType];
        
        this.threats.push({
            x: Math.random() * (this.canvas.width - type.width),
            y: -type.height,
            width: type.width,
            height: type.height,
            speed: type.speed,
            color: type.color,
            health: type.health,
            score: type.score,
            targetNode: null
        });
        
        this.gameState.threatsDestroyed++;
    }

    createFastThreat() {
        if (this.gameState.level < 2) return;
        
        const type = this.fastThreatType;
        
        this.fastThreats.push({
            x: Math.random() * (this.canvas.width - type.width),
            y: -type.height,
            width: type.width,
            height: type.height,
            speed: type.speed,
            color: type.color,
            health: type.health,
            score: type.score
        });
    }

    updateThreats() {
        // Spawn new threats
        if (this.gameState.running && 
            !this.gameState.paused && 
            !this.gameState.waveComplete && 
            Math.random() < 0.02 * this.gameState.level) {
            
            if (Math.random() < 0.3 && this.gameState.level > 1) {
                this.createFastThreat();
            } else {
                this.createThreat();
            }
        }
        
        // Update normal threats
        for (let i = this.threats.length - 1; i >= 0; i--) {
            const threat = this.threats[i];
            
            // Move threat
            if (threat.targetNode === null) {
                threat.y += threat.speed;
                
                // Check collision with firewall
                if (this.checkCollision(threat, this.firewall)) {
                    this.gameState.score += threat.score;
                    this.createParticles(threat);
                    this.threats.splice(i, 1);
                    continue;
                }
                
                // Check if passed firewall
                if (threat.y > this.firewall.y + this.firewall.height) {
                    // Find closest data node
                    let closestNode = null;
                    let minDistance = Infinity;
                    
                    for (let j = 0; j < this.dataNodes.length; j++) {
                        const node = this.dataNodes[j];
                        if (node.health <= 0) continue;
                        
                        const dx = threat.x + threat.width/2 - node.x;
                        const dy = threat.y + threat.height/2 - node.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestNode = j;
                        }
                    }
                    
                    if (closestNode !== null) {
                        threat.targetNode = closestNode;
                    }
                }
            } else {
                // Move toward target node
                const target = this.dataNodes[threat.targetNode];
                if (target.health <= 0) {
                    threat.targetNode = null;
                    continue;
                }
                
                const dx = target.x - (threat.x + threat.width/2);
                const dy = target.y - (threat.y + threat.height/2);
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 5) {
                    // Hit the node
                    target.health -= threat.health;
                    this.createParticles(threat);
                    this.threats.splice(i, 1);
                    
                    if (target.health <= 0) {
                        this.checkGameOver();
                    }
                } else {
                    // Move toward node
                    threat.x += (dx / distance) * threat.speed;
                    threat.y += (dy / distance) * threat.speed;
                }
            }
        }
        
        // Update fast threats
        for (let i = this.fastThreats.length - 1; i >= 0; i--) {
            const threat = this.fastThreats[i];
            threat.y += threat.speed;
            
            // Check collision with firewall
            if (this.checkCollision(threat, this.firewall)) {
                this.gameState.score += threat.score;
                this.createParticles(threat);
                this.fastThreats.splice(i, 1);
                continue;
            }
            
            // Check if passed firewall
            if (threat.y > this.firewall.y + this.firewall.height) {
                // Fast threats can't stop - check if they hit any node
                let hit = false;
                
                for (const node of this.dataNodes) {
                    if (node.health <= 0) continue;
                    
                    const dx = threat.x + threat.width/2 - node.x;
                    const dy = threat.y + threat.height/2 - node.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < node.radius + threat.width/2) {
                        node.health -= threat.health;
                        hit = true;
                        this.checkGameOver();
                        break;
                    }
                }
                
                if (hit || threat.y > this.canvas.height) {
                    if (!hit) {
                        this.gameState.score += threat.score;
                    }
                    this.createParticles(threat);
                    this.fastThreats.splice(i, 1);
                }
            }
        }
        
        // Check wave completion
        if (!this.gameState.waveComplete && 
            this.gameState.threatsDestroyed >= this.gameState.threatsInWave && 
            this.threats.length === 0 && 
            this.fastThreats.length === 0) {
            
            this.gameState.waveComplete = true;
            this.gameState.waveTimer = 180; // 3 seconds at 60fps
        }
        
        // Handle wave transition
        if (this.gameState.waveComplete) {
            this.gameState.waveTimer--;
            
            if (this.gameState.waveTimer <= 0) {
                this.gameState.level++;
                this.gameState.threatsInWave = 50 + (this.gameState.level - 1) * 10;
                this.gameState.threatsDestroyed = 0;
                this.gameState.waveComplete = false;
                
                // Heal nodes between waves
                for (const node of this.dataNodes) {
                    if (node.health > 0) {
                        node.health = Math.min(node.maxHealth, node.health + 5);
                    }
                }
            }
        }
        
        this.updateDisplays();
    }

    checkCollision(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    }

    checkGameOver() {
        const aliveNodes = this.dataNodes.filter(node => node.health > 0).length;
        if (aliveNodes === 0) {
            this.gameOver();
        }
    }

    createParticles(obj) {
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: obj.x + obj.width/2,
                y: obj.y + obj.height/2,
                radius: Math.random() * 4 + 2,
                color: obj.color,
                speedX: Math.random() * 6 - 3,
                speedY: Math.random() * 6 - 3,
                life: 30
            });
        }
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.speedX;
            p.y += p.speedY;
            p.life--;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    drawBackground() {
        // Draw threat area
        this.ctx.fillStyle = 'rgba(10, 10, 26, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.threatAreaHeight);
        
        // Draw node area
        this.ctx.fillStyle = 'rgba(10, 26, 10, 0.3)';
        this.ctx.fillRect(0, this.threatAreaHeight, this.canvas.width, this.nodeAreaHeight);
        
        // Draw grid
        this.ctx.strokeStyle = 'rgba(0, 255, 65, 0.1)';
        this.ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = 0; x < this.canvas.width; x += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y < this.canvas.height; y += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        // Draw separator line
        this.ctx.strokeStyle = 'rgba(0, 255, 65, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.threatAreaHeight);
        this.ctx.lineTo(this.canvas.width, this.threatAreaHeight);
        this.ctx.stroke();
    }

    drawFirewall() {
        this.ctx.fillStyle = this.firewall.color;
        this.ctx.shadowColor = this.firewall.color;
        this.ctx.shadowBlur = 15;
        this.ctx.fillRect(this.firewall.x, this.firewall.y, this.firewall.width, this.firewall.height);
        this.ctx.shadowBlur = 0;
    }

    drawThreats() {
        // Draw normal threats
        this.threats.forEach(threat => {
            this.ctx.fillStyle = threat.color;
            this.ctx.shadowColor = threat.color;
            this.ctx.shadowBlur = 10;
            this.ctx.fillRect(threat.x, threat.y, threat.width, threat.height);
            this.ctx.shadowBlur = 0;
            
            // Draw health bar
            if (threat.health > 1) {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillRect(threat.x, threat.y - 5, threat.width, 2);
                this.ctx.fillStyle = '#ff0000';
                this.ctx.fillRect(threat.x, threat.y - 5, threat.width * (threat.health / 10), 2);
            }
        });
        
        // Draw fast threats (triangles)
        this.fastThreats.forEach(threat => {
            this.ctx.fillStyle = threat.color;
            this.ctx.shadowColor = threat.color;
            this.ctx.shadowBlur = 10;
            
            this.ctx.beginPath();
            this.ctx.moveTo(threat.x + threat.width/2, threat.y);
            this.ctx.lineTo(threat.x, threat.y + threat.height);
            this.ctx.lineTo(threat.x + threat.width, threat.y + threat.height);
            this.ctx.closePath();
            this.ctx.fill();
            
            this.ctx.shadowBlur = 0;
        });
    }

    drawDataNodes() {
        // Draw connections first
        this.ctx.strokeStyle = 'rgba(0, 255, 65, 0.3)';
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i < this.dataNodes.length; i++) {
            const node = this.dataNodes[i];
            if (node.health <= 0) continue;
            
            for (const j of node.connections) {
                if (j > i && this.dataNodes[j].health > 0) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(node.x, node.y);
                    this.ctx.lineTo(this.dataNodes[j].x, this.dataNodes[j].y);
                    this.ctx.stroke();
                }
            }
        }
        
        // Draw nodes
        for (const node of this.dataNodes) {
            if (node.health <= 0) continue;
            
            // Draw outer circle (health)
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.radius + 3, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw health bar
            const healthPercent = node.health / node.maxHealth;
            this.ctx.fillStyle = healthPercent > 0.5 ? '#00ff41' : 
                                healthPercent > 0.25 ? '#ffaa00' : '#ff5555';
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.radius * healthPercent, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw inner circle
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.radius * 0.5, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw health text
            this.ctx.fillStyle = '#000000';
            this.ctx.font = '10px Share Tech Mono';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(Math.floor(node.health), node.x, node.y);
        }
    }

    drawParticles() {
        this.particles.forEach(p => {
            this.ctx.globalAlpha = p.life / 30;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1;
    }

    drawWaveTimer() {
        if (this.gameState.waveComplete) {
            this.ctx.fillStyle = 'rgba(0, 255, 65, 0.7)';
            this.ctx.font = '24px Share Tech Mono';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(
                `WAVE ${this.gameState.level} COMPLETE`, 
                this.canvas.width / 2, 
                this.canvas.height / 2
            );
        }
    }

    gameOver() {
        this.gameState.running = false;
        this.gameState.gameOver = true;
        this.finalScoreDisplay.textContent = this.gameState.score;
        this.gameOverScreen.classList.remove('hidden');
        cancelAnimationFrame(this.animationId);
    }

    animate(currentTime = 0) {
        if (!this.gameState.running || this.gameState.paused) return;
        
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawBackground();
        this.updateFirewall();
        this.updateThreats();
        this.updateParticles();
        
        this.drawDataNodes();
        this.drawThreats();
        this.drawParticles();
        this.drawFirewall();
        this.drawWaveTimer();
        
        this.animationId = requestAnimationFrame((t) => this.animate(t));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const game = new FirewallDefender();
});
