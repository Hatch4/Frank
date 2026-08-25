const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let player, turtle, platforms = [], powerUps = [], flag;
let retryCount = 0;
let gameRunning = false;
let cameraY = 0;
let gameStartedClimbing = false;

// === IMAGES ===
const bgImg = new Image(); bgImg.src = "background.png";
const nightImg = new Image(); nightImg.src = "night.png";
const boyImg = new Image(); boyImg.src = "boy.png";
const girlImg = new Image(); girlImg.src = "girl.png";
const turtleImg = new Image(); turtleImg.src = "turtle.png";
const turtleExhaustedImg = new Image(); turtleExhaustedImg.src = "turtle_exhausted.png";
const flagImg = new Image(); flagImg.src = "flag.png";

// === SOUNDS ===
const jumpSound = new Audio("jump.wav");
const winSound = new Audio("win.wav");
const loseSound = new Audio("lose.wav");
const powerSound = new Audio("power.wav");

// === CONTROLS ===
let leftPressed = false;
let rightPressed = false;

document.getElementById("leftBtn").addEventListener("touchstart", () => leftPressed = true);
document.getElementById("leftBtn").addEventListener("touchend", () => leftPressed = false);

document.getElementById("rightBtn").addEventListener("touchstart", () => rightPressed = true);
document.getElementById("rightBtn").addEventListener("touchend", () => rightPressed = false);

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

// === INITIALIZE ===
function init(character) {
    gameStartedClimbing = false;

    player = {
        x: 250,
        y: 600,
        w: 80,
        h: 80,
        vy: 0,
        jumpPower: -9,
        sprite: character === "boy" ? boyImg : girlImg,
        grounded: false
    };

    turtle = {
        x: 150,
        y: 600,
        w: 90,
        h: 90,
        vy: 0,
        jumpPower: -10, // slightly weaker for safe climbing
        speed: getTurtleSpeed(),
        exhausted: retryCount >= 5,
        collapseAngle: 0,
        grounded: false,
        targetPlatform: null,
        stuckTimer: 0
    };

    leftPressed = false;
    rightPressed = false;

    generatePlatforms();
    generatePowerUps();
    generateFlag();

    cameraY = 0;
}

// === TURTLE SPEED ===
function getTurtleSpeed() {
    return Math.max(1, 3 - retryCount * 0.4); // slower, safer
}

// === PLATFORM GENERATION ===
function generatePlatforms() {
    platforms = [];

    let x = 200;
    let y = 650;
    const stepY = 50;
    const maxShift = 120;

    for (let i = 0; i < 20; i++) {
        x += (Math.random() * maxShift * 2) - maxShift;
        x = Math.max(20, Math.min(380, x));

        platforms.push({ x, y, w: 100, h: 20 });
        y -= stepY;
    }

    platforms.push({ x: 0, y: 690, w: 500, h: 20 }); // ground
}

// === FLAG OBJECT ===
function generateFlag() {
    const top = getTopPlatform();

    flag = {
        x: top.x + 20,
        y: top.y - 200,
        w: 60,
        h: 60
    };
}

// === FIND TRUE TOP PLATFORM ===
function getTopPlatform() {
    return platforms.reduce((highest, p) => p.y < highest.y ? p : highest);
}

// === SAFE TURTLE TARGETING ===
function getSafeNextPlatform(turtleY) {
    // Find platforms slightly above turtle
    let candidates = platforms.filter(p => p.y < turtleY - 20);

    if (candidates.length === 0) return null;

    // Choose the CLOSEST platform above (safe climbing)
    return candidates.reduce((closest, p) =>
        Math.abs(p.y - turtleY) < Math.abs(closest.y - turtleY) ? p : closest
    );
}

// === POWER-UPS ===
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

// === GAME LOOP ===
function gameLoop() {
    if (!gameRunning) return;
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// === UPDATE ===
function update() {

    // Gravity
    player.vy += 0.6;
    player.y += player.vy;

    turtle.vy += 0.6;
    turtle.y += turtle.vy;

    // Start climbing check
    if (!gameStartedClimbing && player.y < 500) {
        gameStartedClimbing = true;
    }

    // === CAMERA ===
    cameraY = player.y - 300;
    if (cameraY > 0) cameraY = 0;
    if (cameraY < -3200) cameraY = -3200;

    // === PLAYER MOVEMENT ===
    if (player.grounded) {
        if (leftPressed) {
            player.vy = player.jumpPower;
            player.x -= 20;
            player.grounded = false;
            jumpSound.play();
        }
        if (rightPressed) {
            player.vy = player.jumpPower;
            player.x += 20;
            player.grounded = false;
            jumpSound.play();
        }
    }

    // === SAFE TURTLE AI ===

    // 1. If turtle has no target, pick nearest safe platform
    if (!turtle.targetPlatform) {
        turtle.targetPlatform = getSafeNextPlatform(turtle.y);
    }

    // 2. If turtle fell BELOW its target, pick a new one
    if (turtle.targetPlatform && turtle.y > turtle.targetPlatform.y + 60) {
        turtle.targetPlatform = getSafeNextPlatform(turtle.y);
    }

    // 3. If turtle is stuck for a long time, retarget
    if (!turtle.grounded && Math.abs(turtle.vy) < 0.1) {
        turtle.stuckTimer++;
        if (turtle.stuckTimer > 30) {
            turtle.targetPlatform = getSafeNextPlatform(turtle.y);
            turtle.stuckTimer = 0;
        }
    } else {
        turtle.stuckTimer = 0;
    }

    // 4. Move turtle toward center of target platform
    if (!turtle.exhausted && turtle.targetPlatform) {
        const center = turtle.targetPlatform.x + turtle.targetPlatform.w / 2;
        const tCenter = turtle.x + turtle.w / 2;

        if (tCenter < center - 5) turtle.x += turtle.speed;
        else if (tCenter > center + 5) turtle.x -= turtle.speed;

        // 5. Jump ONLY when perfectly centered
        if (Math.abs(center - tCenter) < 10 && turtle.grounded) {
            turtle.vy = turtle.jumpPower;
            turtle.grounded = false;
        }
    }

    // === PLATFORM COLLISION (PLAYER) ===
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

    // === PLATFORM COLLISION (TURTLE) ===
    turtle.grounded = false;

    platforms.forEach(p => {
        const onPlatform =
            turtle.x + turtle.w > p.x &&
            turtle.x < p.x + p.w &&
            turtle.y + turtle.h >= p.y &&
            turtle.y + turtle.h <= p.y + 10 &&
            turtle.vy >= 0;

        if (onPlatform) {
            turtle.y = p.y - turtle.h;
            turtle.vy = 0;
            turtle.grounded = true;

            turtle.targetPlatform = getSafeNextPlatform(turtle.y);
        }
    });

    // === POWER-UP COLLISION ===
    powerUps = powerUps.filter(pu => {
        const dx = (player.x + player.w / 2) - pu.x;
        const dy = (player.y + player.h / 2) - pu.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < pu.r + 30) {
            player.jumpPower -= 1;
            powerSound.play();
            return false;
        }
        return true;
    });

    // === WIN CONDITION ===
    const playerScreenY = player.y - cameraY;
    const flagScreenY = flag.y - cameraY;

    if (gameStartedClimbing && playerScreenY < flagScreenY + 50) {
        winSound.play();
        alert("You reached the top!");
        resetGame();
    }

    // === TURTLE WIN ===
    const turtleScreenY = turtle.y - cameraY;
    if (gameStartedClimbing && turtleScreenY < flagScreenY + 50 && !turtle.exhausted) {
        loseSound.play();
        retryCount++;
        alert("The turtle won the race!");
        resetGame();
    }

    // === FALL LOSE ===
    if (player.y > 700) {
        retryCount++;
        loseSound.play();
        alert("You fell! Turtle gets easier.");
        resetGame();
    }
}

// === RESET ===
function resetGame() {
    gameRunning = false;
    document.getElementById("menu").style.display = "block";

    leftPressed = false;
    rightPressed = false;

    if (player) {
        player.grounded = false;
        player.vy = 0;
    }
    if (turtle) {
        turtle.grounded = false;
        turtle.vy = 0;
    }
}

// === DRAW ===
function draw() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(nightImg, 0, -cameraY - canvas.height, canvas.width, canvas.height);
    ctx.drawImage(bgImg, 0, -cameraY, canvas.width, canvas.height);

    ctx.fillStyle = "#8B4513";
    platforms.forEach(p => {
        ctx.fillRect(p.x, p.y - cameraY, p.w, p.h);
    });

    ctx.fillStyle = "yellow";
    powerUps.forEach(pu => {
        ctx.beginPath();
        ctx.arc(pu.x, pu.y - cameraY, pu.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = "orange";
        ctx.stroke();
    });

    ctx.drawImage(flagImg, flag.x, flag.y - cameraY, flag.w, flag.h);

    ctx.drawImage(player.sprite, player.x, player.y - cameraY, player.w, player.h);

    ctx.save();
    ctx.translate(
        turtle.x + turtle.w / 2,
        turtle.y - cameraY + turtle.h / 2
    );
    ctx.rotate(turtle.collapseAngle);
    const tImg = turtle.exhausted ? turtleExhaustedImg : turtleImg;
    ctx.drawImage(tImg, -turtle.w / 2, -turtle.h / 2, turtle.w, turtle.h);
    ctx.restore();
}
