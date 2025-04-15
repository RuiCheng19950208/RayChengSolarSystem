import * as THREE from 'three';
import { Airplane } from './Airplane';

export class AirplaneController {
    private airplane: Airplane;
    private keys: {
        w: boolean; //forward
        s: boolean; // backward
        a: boolean; // left
        d: boolean; // right
        q: boolean; // upward
        e: boolean; // downward
    };
    private thrustIncrement: number = 0.1;

    constructor(airplane: Airplane) {
        this.airplane = airplane;
        this.keys = {
            w: false,
            s: false,
            a: false,
            d: false,
            q: false,
            e: false,
        };

        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
    }

    private handleKeyDown = (event: KeyboardEvent): void => {
        const key = event.key.toLowerCase();
        if (key in this.keys) {
            this.keys[key as keyof typeof this.keys] = true;
        }
    };

    private handleKeyUp = (event: KeyboardEvent): void => {
        const key = event.key.toLowerCase();
        if (key in this.keys) {
            this.keys[key as keyof typeof this.keys] = false;
        }
    };

    public update(deltaTime: number, cameraForward: THREE.Vector3): void {
        // Create a thrust vector in camera-relative space
        const thrustVector = new THREE.Vector3(0, 0, 0);
        
        // Apply thrusts in 6 directions based on keys
        // Forward/backward along camera Z-axis
        if (this.keys.w) {
            thrustVector.z += this.thrustIncrement;
        }
        if (this.keys.s) {
            thrustVector.z -= this.thrustIncrement;
        }
        
        // Left/right along camera X-axis
        if (this.keys.a) {
            thrustVector.x -= this.thrustIncrement;
        }
        if (this.keys.d) {
            thrustVector.x += this.thrustIncrement;
        }
        
        // Up/down along camera Y-axis
        if (this.keys.q) {
            thrustVector.y += this.thrustIncrement;
        }
        if (this.keys.e) {
            thrustVector.y -= this.thrustIncrement;
        }
        
        // Limit maximum thrust in any direction
        if (thrustVector.length() > 1) {
            thrustVector.normalize();
        }
        
        // Set controls with the new thrust vector
        const controls = {
            thrustVector: thrustVector,
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