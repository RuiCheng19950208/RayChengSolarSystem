import * as THREE from 'three';
import { Airplane } from './Airplane';

export class AirplaneController {
    private airplane: Airplane;
    private keys: { [key: string]: boolean } = {
        w: false,
        s: false,
        a: false,
        d: false,
        q: false,
        e: false
    };
    private thrustIncrement: number = 0.01; // How quickly thrust builds up
    private thrustDecay: number = 0.1; // How quickly thrust decays when keys aren't pressed
    private currentThrust: THREE.Vector3 = new THREE.Vector3(0, 0, 0); // Store current thrust state

    constructor(airplane: Airplane) {
        this.airplane = airplane;
        
        // Add event listeners for keydown and keyup
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
    }

    private handleKeyDown = (event: KeyboardEvent): void => {
        const key = event.key.toLowerCase();
        // Only handle WASDQE keys
        if (key === 'w' || key === 'a' || key === 's' || key === 'd' || key === 'q' || key === 'e') {
            this.keys[key] = true;
        }
    };

    private handleKeyUp = (event: KeyboardEvent): void => {
        const key = event.key.toLowerCase();
        // Only handle WASDQE keys
        if (key === 'w' || key === 'a' || key === 's' || key === 'd' || key === 'q' || key === 'e') {
            this.keys[key] = false;
        }
    };

    public update(deltaTime: number, cameraForward: THREE.Vector3): void {
        // Track if any thrust keys are being pressed
        let anyThrustKeyPressed = false;
        
        // Create a thrust change vector based on current inputs
        const thrustChange = new THREE.Vector3(0, 0, 0);
        
        // Apply thrusts in 6 directions based on keys
        // Forward/backward along camera Z-axis
        if (this.keys['w']) {
            thrustChange.z += this.thrustIncrement;
            anyThrustKeyPressed = true;
        }
        if (this.keys['s']) {
            thrustChange.z -= this.thrustIncrement;
            anyThrustKeyPressed = true;
        }
        
        // Left/right along camera X-axis
        if (this.keys['a']) {
            thrustChange.x -= this.thrustIncrement;
            anyThrustKeyPressed = true;
        }
        if (this.keys['d']) {
            thrustChange.x += this.thrustIncrement;
            anyThrustKeyPressed = true;
        }
        
        // Up/down along camera Y-axis
        if (this.keys['q']) {
            thrustChange.y += this.thrustIncrement;
            anyThrustKeyPressed = true;
        }
        if (this.keys['e']) {
            thrustChange.y -= this.thrustIncrement;
            anyThrustKeyPressed = true;
        }
        
        // If no thrust keys are pressed, apply decay to current thrust
        if (!anyThrustKeyPressed) {
            // Gradually reduce thrust back to zero when no keys are pressed
            this.currentThrust.multiplyScalar(1 - this.thrustDecay);
            
            // If thrust is very small, just set it to zero to avoid floating point issues
            if (this.currentThrust.length() < 0.01) {
                this.currentThrust.set(0, 0, 0);
            }
        } else {
            // Add the change to the current thrust
            this.currentThrust.add(thrustChange);
            
            // Limit maximum thrust in any direction
            if (this.currentThrust.length() > 1) {
                this.currentThrust.normalize();
            }
        }
        
        
        
        // Set controls with the accumulated thrust vector
        const controls = {
            thrustVector: this.currentThrust.clone(),
            cameraForward: cameraForward.clone(),
        };
        
        this.airplane.setControls(controls);
        this.airplane.update(deltaTime);
    }

    public dispose(): void {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
    }
}