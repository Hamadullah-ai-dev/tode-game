import * as THREE from "three";

export function createMap() {
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 2;
    const ctx = canvas.getContext("2d");

    // Alternate between Dark Green and Light Green[cite: 24]
    ctx.fillStyle = "#90EE90"; ctx.fillRect(0, 0, 1, 1); ctx.fillRect(1, 1, 1, 1);
    ctx.fillStyle = "#228B22"; ctx.fillRect(1, 0, 1, 1); ctx.fillRect(0, 1, 1, 1);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(50, 50);
    texture.colorSpace = THREE.SRGBColorSpace;

    // Create a grid-based floor using a checkerboard pattern[cite: 24]
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(4000, 4000),
        new THREE.MeshStandardMaterial({ map: texture })
    );
    return floor;
}