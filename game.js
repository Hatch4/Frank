const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let player, turtle, platforms = [], powerUps = [];
let retryCount = 0;
let gameRunning = false;
let cameraY = 0;

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
        jumpPower: -8,
        sprite: character === "boy" ? boyImg : girlImg,
        grounded: false
    };

    turtle = {
        x: 150,
        y: 600,
        w: 90,
        h: 90,
        vy: 0,
        jumpPower: -8,
        speed: getTurtleSpeed(),
        exhausted: retryCount >= 5,
        collapseAngle: 0,
        grounded: false
    };

    generatePlatforms();
    generatePowerUps();
}

// === TURTLE DIFFICULTY ===
function getTurtleSpeed() {
    if (retryCount === 0) return 4;   // hardest
    if (retryCount === 1) return 3.5;
    if (retryCount === 2) return 3;
    if (retryCount === 3) return 2.5;
    if (retryCount === 4) return 2;
    return 1; // easiest
}

// === PLATFORM GENERATION (REACHABLE + TALL LEVEL) ===
function generatePlatforms() {
    platforms = [];

    let x = 200;
    let y = 650;
    const stepY = 50;     // reachable height
    const maxShift = 120;

    for (let i = 0; i < 40; i++) {
        x += (Math.random() * maxShift * 2) - maxShift;
        x = Math.max(20, Math.min(380, x));

        platforms.push({
            x: x,
            y: y,
            w: 100,
            h: 20
        });

        y -= stepY;
    }

    platforms.push({ x: 0, y: 690, w: 500, h: 20 });
}

// === POWER-UP GENERATION ===
function generatePowerUps() {
    powerUps = [];

    for (let i = 0; i < 6; i++) {
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

    turtle.vy += 0.5;
    turtle.y += turtle.vy;

    // Camera follows player smoothly
    cameraY = player.y - 300;
    if (cameraY < 0) cameraY = 0;

    // Directional jump (player)
    if (player.grounded) {
        if (leftPressed) {
            player.vy = player.jumpPower;
            player.x -= 20;
            jumpSound.play();
        }
        if (rightPressed) {
            player.vy = player.jumpPower;
            player.x += 20;
            jumpSound.play();
        }
    }

    // Turtle AI: find the NEXT platform above
    let next = null;
    for (let p of platforms) {
        if (p.y < turtle.y - 10) {
            next = p;
            break;
        }
    }

    // Turtle horizontal movement
    if (!turtle.exhausted && next) {
        const center = next.x + next.w / 2;
        const tCenter = turtle.x + turtle.w / 2;

        if (tCenter < center) {
            turtle.x += turtle.speed;
        } else {
            turtle.x -= turtle.speed;
        }
    }

    // Turtle jump only when centered
    if (turtle.grounded && next) {
        const center = next.x + next.w / 2;
        const tCenter = turtle.x + turtle.w / 2;

        if (Math.abs(center - tCenter) < 20) {
            turtle.vy = turtle.jumpPower;
        }
    }

    // PLATFORM COLLISION (PLAYER)
    player.grounded = false;

    platforms.forEach(p => {
        const onPlatform =
            player.x + player.w > p.x &&
            player.x < p.x + p.w &&
            player.y + player.h >= p.y &&
            player.y + player.h <= p.y + 10 &&
            player.vy >= 0;

        if (onPlatform) {
            player.y = p.y - player.h;
            player.vy = 0;
            player.grounded = true;
        }
    });

    // PLATFORM COLLISION (TURTLE)
    turtle.grounded = false;

    platforms.forEach(p => {
        const turtleOnPlatform =
            turtle.x + turtle.w > p.x &&
            turtle.x < p.x + p.w &&
            turtle.y + turtle.h >= p.y &&
            turtle.y + turtle.h <= p.y + 10 &&
            turtle.vy >= 0;

        if (turtleOnPlatform) {
            turtle.y = p.y - turtle.h;
            turtle.vy = 0;
            turtle.grounded = true;
        }
    });

    // POWER-UP COLLISION
    powerUps = powerUps.filter(pu => {
        const dx = (player.x + player.w / 2) - pu.x;
        const dy = (player.y + player.h / 2) - pu.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < pu.r + 30) {
            player.jumpPower -= 2;
            powerSound.play();
            return false;
        }
        return true;
    });

    // WIN / LOSE CONDITIONS
    const highestPlatform = platforms[0].y;

    if (player.y < highestPlatform - 200) {
        winSound.play();
        alert("You reached the top!");
        resetGame();
    }

    if (turtle.y < highestPlatform - 200 && !turtle.exhausted) {
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
    ctx.drawImage(bgImg, 0, -cameraY, canvas.width, canvas.height);

    // Platforms
    ctx.fillStyle = "#8B4513";
    platforms.forEach(p => ctx.fillRect(p.x, p.y - cameraY, p.w, p.h));

    // Power-ups
    ctx.fillStyle = "yellow";
    powerUps.forEach(pu => {
        ctx.beginPath();
        ctx.arc(pu.x, pu.y - cameraY, pu.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = "orange";
        ctx.stroke();
    });

    // Player
    ctx.drawImage(player.sprite, player.x, player.y - cameraY, player.w, player.h);

    // Turtle
    ctx.save();
    ctx.translate(turtle.x + turtle.w / 2, turtle.y - cameraY + turtle.h / 2);
    ctx.rotate(turtle.collapseAngle);
    const tImg = turtle.exhausted ? turtleExhaustedImg : turtleImg;
    ctx.drawImage(tImg, -turtle.w / 2, -turtle.h / 2, turtle.w, turtle.h);
    ctx.restore();
}
