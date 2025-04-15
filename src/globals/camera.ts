import * as THREE from 'three';

// Create camera with a wider field of view
const camera = new THREE.PerspectiveCamera(
    75, // Field of view
    window.innerWidth / window.innerHeight,
    0.1,
    100000000
);


// Function to update camera on window resize
export const updateCameraOnResize = (width: number, height: number) => {
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
};

export { camera }; 