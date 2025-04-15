import * as THREE from 'three';
import { CameraController } from '../components/CameraController';
import solarSystem from '../components/SolarSystem';
// import { Cube } from '../components/Cube';

// TypeScript declaration for window.electronAPI
declare global {
    interface Window {
        require?: any;
        electronAPI?: {
            closeApp: () => void;
        };
    }
}

// Create the scene
const scene = new THREE.Scene();
// scene.background = new THREE.Color(0x000000);

// Inject scene into solarSystem
solarSystem.setScene(scene);

// Create and add cube
// const cube = new Cube();
// cube.init();

// Debug logging
// console.log('Scene initialized');
// console.log('Scene background:', scene.background);
// console.log('Scene lights:', scene.children.filter(child => child instanceof THREE.Light).length);

// Create camera controller with the scene
const cameraController = new CameraController(scene);

// Now that scene has been injected, we can set up the solar system
solarSystem.setupScene();

// Function to get camera controller for other components
export const getCameraController = (): CameraController => cameraController;

// Setup ESC key handler to exit the application
const setupExitHandler = () => {
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            console.log('ESC key pressed, attempting to exit application');
            
            // Direct access to electron if nodeIntegration is enabled
            if (window.require) {
                try {
                    const electron = window.require('electron');
                    // Try to send message via IPC
                    if (electron.ipcRenderer) {
                        console.log('Sending exit signal via IPC');
                        electron.ipcRenderer.send('app-exit');
                    }
                    
                    // As a fallback, try to access app directly (if nodeIntegration is true)
                    const remote = electron.remote;
                    if (remote && remote.app) {
                        console.log('Calling app.quit via remote');
                        remote.app.quit();
                    }
                } catch (error) {
                    console.error('Failed to exit using Electron API:', error);
                    alert('Press ESC again to exit. If the application does not close, use Alt+F4 or Command+Q to force close.');
                }
            } else {
                // Web environment - just show a message
                alert('ESC key pressed. In the desktop app, this would exit the application.');
            }
        }
    });
};

// Initialize the exit handler
setupExitHandler();

// Animation loop
const animate = () => {
    requestAnimationFrame(animate);
    // cube.update();
    cameraController.update();
    
    // Update the solar system
    solarSystem.update();
    
    // Update sun light intensity based on airplane position
    const airplanePosition = cameraController.getAirplanePosition();
    if (airplanePosition) {
        solarSystem.updateSunLightForAirplane(airplanePosition);
    }
};

animate();

// Make scene accessible globally for the Cube class
(window as any).scene = scene;

export { scene }; 