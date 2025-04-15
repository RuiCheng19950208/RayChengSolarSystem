import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export const modelLoader = async (modelPath: string): Promise<THREE.Group> => {
  const loader = new GLTFLoader();
  
  // Determine correct path based on environment
  let resolvedPath = modelPath;
  
  // For Electron builds, we need to adjust the path
  if (window.location.protocol === 'file:') {
    console.log('Running in Electron, adjusting path:', modelPath);
    // Remove leading slash for Electron file protocol
    resolvedPath = modelPath.startsWith('/') ? modelPath.substring(1) : modelPath;
  }
  
  console.log('Loading model from:', resolvedPath);
  
  return new Promise((resolve, reject) => {
    loader.load(
      resolvedPath,
      (gltf) => {
        console.log('Model loaded successfully!');
        resolve(gltf.scene);
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
      },
      (error) => {
        console.error('Error loading model:', error);
        reject(error);
      }
    );
  });
}; 