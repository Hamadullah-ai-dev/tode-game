import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const houses = [];

export function loadHouses(scene) {
    const loader = new GLTFLoader();

    // Use the small_house.glb model located in /models/ at a scale of 65[cite: 24]
    loader.load("/models/small_house.glb", (gltf) => {
        const baseHouse = gltf.scene;
        baseHouse.scale.setScalar(65);

        // Rotate all houses Math.PI / 2 around the X-axis to align with the Z-up coordinate system[cite: 24]
        baseHouse.rotation.x = Math.PI / 2;

        // Add 3 houses to the map in random positions[cite: 24]
        for (let i = 0; i < 3; i++) {
            const house = baseHouse.clone();

            // Assign each house a random rotation around the Y-axis in multiples of Math.PI / 2[cite: 24]
            const rotSteps = Math.floor(Math.random() * 4);
            house.rotation.y = rotSteps * (Math.PI / 2);

            let box;
            let spacingRadius;
            let placed = false;
            for (let attempt = 0; attempt < 1000; attempt++) {
                const x = (Math.random() - 0.5) * 600;
                const y = (Math.random() - 0.5) * 600;
                house.position.set(x, y, 0);
                house.updateMatrixWorld(true);

                // Ground the house and measure its rotated footprint.
                box = new THREE.Box3().setFromObject(house);
                house.position.z = -box.min.z;
                house.updateMatrixWorld(true);
                box = new THREE.Box3().setFromObject(house);
                const size = box.getSize(new THREE.Vector3());
                spacingRadius = Math.hypot(size.x / 2, size.y / 2);

                const hasClearance = houses.every((other) => {
                    const otherBox = other.userData.collisionBox;
                    const otherSize = otherBox.getSize(new THREE.Vector3());
                    const otherRadius = Math.hypot(otherSize.x / 2, otherSize.y / 2);
                    return Math.hypot(x - other.position.x, y - other.position.y)
                        >= spacingRadius + otherRadius + 40;
                });
                const hasSpawnClearance = Math.hypot(x, y) >= spacingRadius + 35;
                if (hasClearance && hasSpawnClearance) {
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                console.error("Could not place a house with 40 units of clearance.");
                return;
            }

            house.userData.collisionBox = box;
            houses.push(house);
            scene.add(house);
        }
    });

    return houses;
}