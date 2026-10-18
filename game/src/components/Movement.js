import * as THREE from 'three';

const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    KeyW: false,
    KeyS: false,
    KeyA: false,
    KeyD: false
};

// Change this to a much higher number, like 70 or 90
const MOVE_SPEED = 80;
const ROTATION_SPEED = 14;
const PLAYER_RADIUS = 8;

window.addEventListener('keydown', (e) => {
    if (e.code in keys) keys[e.code] = true;
});

window.addEventListener('keyup', (e) => {
    if (e.code in keys) keys[e.code] = false;
});

function canOccupy(x, y, houses) {
    return houses.every((house) => {
        const box = house.userData.collisionBox;
        if (!box) return true;

        const closestX = THREE.MathUtils.clamp(x, box.min.x, box.max.x);
        const closestY = THREE.MathUtils.clamp(y, box.min.y, box.max.y);
        const dx = x - closestX;
        const dy = y - closestY;
        return dx * dx + dy * dy >= PLAYER_RADIUS * PLAYER_RADIUS;
    });
}

export function updateMovement(player, delta = 0.016, houses = []) {
    if (!player) return;

    const pivot = player.userData.pivot || player;
    const model = player.userData.model || pivot;

    let moveX = 0;
    let moveY = 0;

    if (keys.ArrowUp || keys.KeyW) moveY += 1;
    if (keys.ArrowDown || keys.KeyS) moveY -= 1;
    if (keys.ArrowLeft || keys.KeyA) moveX -= 1;
    if (keys.ArrowRight || keys.KeyD) moveX += 1;

    if (moveX !== 0 || moveY !== 0) {
        const dir = new THREE.Vector2(moveX, moveY).normalize();

        const distance = MOVE_SPEED * delta;
        const nextX = player.position.x + dir.x * distance;
        const nextY = player.position.y + dir.y * distance;

        if (canOccupy(nextX, player.position.y, houses)) {
            player.position.x = nextX;
        }
        if (canOccupy(player.position.x, nextY, houses)) {
            player.position.y = nextY;
        }

        const targetAngle = Math.atan2(dir.y, dir.x) - Math.PI / 2;
        model.rotation.z = THREE.MathUtils.lerp(
            model.rotation.z,
            targetAngle,
            ROTATION_SPEED * delta
        );
    }
}