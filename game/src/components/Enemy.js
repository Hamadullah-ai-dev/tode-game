import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export function loadEnemy(scene, x, y) {
    const enemyGroup = new THREE.Group();
    enemyGroup.position.set(x, y, 0);

    new GLTFLoader().load("/models/enemy.glb", (gltf) => {
        const model = gltf.scene;
        // Scale 5 and rotate Math.PI / 2 per specification
        model.scale.setScalar(5);
        model.rotation.x = Math.PI / 2;

        // Ground the enemy on the Z-axis
        const box = new THREE.Box3().setFromObject(model);
        model.position.z = -box.min.z;

        enemyGroup.add(model);
    });

    scene.add(enemyGroup);
    return enemyGroup;
}