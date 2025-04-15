import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export const modelLoader = async (path: string): Promise<THREE.Object3D> => {
    const loader = new GLTFLoader();
    return new Promise((resolve, reject) => {
        loader.load(
            path,
            (gltf) => {
                console.log(`Model loaded from ${path}:`, gltf);
                resolve(gltf.scene);
            },
            (xhr) => {
                console.log(`${(xhr.loaded / xhr.total * 100).toFixed(2)}% loaded for ${path}`);
            },
            (error) => {
                console.error(`Error loading model from ${path}:`, error);
                reject(error);
            }
        );
    });
};