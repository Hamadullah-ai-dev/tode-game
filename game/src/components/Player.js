import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export function createPlayer() {
    const player = new THREE.Group();
    // The pivot turns Tode to face his direction. The camera stays on the player, so it doesn't spin.
    const pivot = new THREE.Group();
    player.add(pivot);
    player.userData.pivot = pivot;

    new GLTFLoader().load(
        "/models/tode.glb",
        (gltf) => {
            const model = gltf.scene;
            model.rotation.x = Math.PI / 2;
            model.scale.setScalar(20);
            model.traverse((c) => { if (c.isMesh) c.castShadow = true; });
            model.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(model);
            model.position.z = -box.min.z;
            pivot.add(model);
        },
        undefined,
        (e) => console.error("Failed to load tode.glb", e)
    );
    return player;
}