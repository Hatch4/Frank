const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let player, turtle, platforms = [], powerUps = [];
let retryCount = 0;
let gameRunning = false;

// === IMAGES ===
const bgImg = new Image(); bgImg.src = "background.png";
const boyImg = new Image(); boyImg.src = "boy.png";
const girlImg = new Image(); girlImg.src = "girl.png";
const turtleImg = new Image(); turtleImg.src = "turtle.png";
const turtleExhaustedImg = new Image(); turtleExhaustedImg.src = "turtle_exhausted.png";

// === SOUNDS ===
const jumpSound = new Audio("jump.wav");
const winSound = new Audio("win.wav");
const loseSound = new Audio("lose.wav");
const powerSound = new Audio("power.wav");

// === CONTROL FLAGS ===
let leftPressed = false;
let rightPressed = false;

// === MOBILE CONTROLS ===
document.getElementById("leftBtn").addEventListener("touchstart", () => leftPressed = true);
document.getElementById("leftBtn").addEventListener("touchend", () => leftPressed = false);

document.getElementById("rightBtn").addEventListener("touchstart", () => rightPressed = true);
document.getElementById("rightBtn").addEventListener("touchend", () => rightPressed = false);

// === KEYBOARD CONTROLS ===
document.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") leftPressed = true;
    if (e.key === "ArrowRight") rightPressed = true;
});
document.addEventListener("keyup", e => {
    if (e.key === "ArrowLeft") leftPressed = false;
    if (e.key === "ArrowRight") rightPressed = false;
});

// === START GAME ===
function startGame(character) {
    document.getElementById("menu").style.display = "none";
    init(character);
    gameRunning = true;
    requestAnimationFrame(gameLoop);
}

// === INITIALIZE GAME ===
function init(character) {
    player = {
        x: 250,
        y: 600,
        w: 80,
        h: 80,
        vy: 0,
        jumpPower: -15,
        sprite: character === "boy" ? boyImg : girlImg,
        speedBoost: 0,
        boostTimer: 0,
        grounded: false
    };

    turtle = {
        x: 150,
        y: 600,
        w: 90,
        h: 90,
        speed: getTurtleSpeed(),
        exhausted: retryCount >= 5,
        collapseAngle: 0
    };

    generatePlatforms();
    generatePowerUps();
}

// === TURTLE DIFFICULTY ===
function getTurtleSpeed() {
    if (retryCount === 0) return 2.5;
    if (retryCount === 1) return 2.0;
    if (retryCount === 2) return 1.5;
    if (retryCount === 3) return 1.0;
    if (retryCount === 4) return 0.5;
    return 0;
}

// === PLATFORM GENERATION ===
function generatePlatforms() {
    platforms = [];

    for (let i = 0; i < 20; i++) {
        platforms.push({
            x: Math.random() * 420 + 40,
            y: 700 - i * 80,
            w: 100,
            h: 20
        });
    }

    // Ground floor
    platforms.push({ x: 0, y: 690, w: 500, h: 20 });
}

// === POWER-UP GENERATION ===
function generatePowerUps() {
    powerUps = [];

    for (let i = 0; i < 4; i++) {
        powerUps.push({
            x: Math.random() * 420 + 40,
            y: 700 - (i * 200 + 150),
            r: 15,
            type: "speed"
        });
    }
}

// === MAIN GAME LOOP ===
function gameLoop() {
    if (!gameRunning) return;
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// === UPDATE LOGIC ===
function update() {

    // Gravity
    player.vy += 0.5;
    player.y += player.vy;

    // Horizontal movement + directional jump
    if (leftPressed && player.grounded) {
        player.vy = player.jumpPower;
        player.x -= 20;
        jumpSound.play();
    }

    if (rightPressed && player.grounded) {
        player.vy = player.jumpPower;
        player.x += 20;
        jumpSound.play();
    }

    // PLATFORM COLLISION
    player.grounded = false;

    platforms.forEach(p => {
        const onPlatform =
            player.y + player.h >= p.y &&
            player.y + player.h <= p.y + 10 &&
            player.x + player.w > p.x &&
            player.x < p.x + p.w &&
            player.vy > 0;

        if (onPlatform) {
            player.y = p.y - player.h;
            player.vy = 0;
            player.grounded = true;
        }
    });

    // POWER-UP COLLISION
    powerUps = powerUps.filter(pu => {
        const dx = (player.x + player.w / 2) - pu.x;
        const dy = (player.y + player.h / 2) - pu.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < pu.r + 30) {
            player.speedBoost = -4;
            player.boostTimer = 300;
            powerSound.play();
            return false;
        }
        return true;
    });

    // TURTLE AI
    if (!turtle.exhausted) {
        turtle.y -= turtle.speed;
    } else if (turtle.collapseAngle < Math.PI / 1.3) {
        turtle.collapseAngle += 0.04;
    }

    // WIN / LOSE CONDITIONS
    if (player.y < 50) {
        winSound.play();
        alert("You reached the top first!");
        resetGame();
    }

    if (turtle.y < 50 && !turtle.exhausted) {
        loseSound.play();
        retryCount++;
        alert("The turtle won the race!");
        resetGame();
    }

    if (player.y > 700) {
        retryCount++;
        loseSound.play();
        alert("You fell! Turtle gets easier.");
        resetGame();
    }
}

// === RESET GAME ===
function resetGame() {
    gameRunning = false;
    document.getElementById("menu").style.display = "block";
}

// === DRAW EVERYTHING ===
function draw() {
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

    // Platforms
    ctx.fillStyle = "#8B4513";
    platforms.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));

    // Power-ups
    ctx.fillStyle = "yellow";
    powerUps.forEach(pu => {
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, pu.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = "orange";
        ctx.stroke();
    });

    // Player
    ctx.drawImage(player.sprite, player.x, player.y, player.w, player.h);

    // Turtle
    ctx.save();
    ctx.translate(turtle.x + turtle.w / 2, turtle.y + turtle.h / 2);
    ctx.rotate(turtle.collapseAngle);
    const tImg = turtle.exhausted ? turtleExhaustedImg : turtleImg;
    ctx.drawImage(tImg, -turtle.w / 2, -turtle.h / 2, turtle.w, turtle.h);
    ctx.restore();
}
