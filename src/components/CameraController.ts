import * as THREE from 'three';
import { camera } from '../globals/camera';
import { Airplane } from './Airplane';
import { AirplaneController } from './AirplaneController';

export class CameraController {
    private airplane: Airplane;
    private controller: AirplaneController;
    private followDistance: number = 30;
    private followHeight: number = 2;
    private initialRatio: number = 30 / 2; // Store the initial ratio
    private yaw: number = Math.PI;
    private pitch: number = 0;
    private isMouseDown: boolean = false;
    private previousMousePosition: { x: number; y: number };
    private mouseSensitivity: number = 0.003;
    private scene: THREE.Scene;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.airplane = new Airplane(scene);
        this.controller = new AirplaneController(this.airplane);
        this.previousMousePosition = { x: 0, y: 0 };

        window.addEventListener('mousedown', this.handleMouseDown);
        window.addEventListener('mouseup', this.handleMouseUp);
        window.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('wheel', this.handleWheel);
    }

    private handleMouseDown = (event: MouseEvent): void => {
        this.isMouseDown = true;
        this.previousMousePosition = { x: event.clientX, y: event.clientY };
    };

    private handleMouseUp = (): void => {
        this.isMouseDown = false;
    };

    private handleMouseMove = (event: MouseEvent): void => {
        if (!this.isMouseDown) return;

        const deltaX = event.clientX - this.previousMousePosition.x;
        const deltaY = event.clientY - this.previousMousePosition.y;

        this.yaw -= deltaX * this.mouseSensitivity;
        this.pitch += deltaY * this.mouseSensitivity;
        // Limit pitch to ±85 degrees (1.48 radians) to prevent gimbal lock
        this.pitch = Math.max(-1.48, Math.min(1.48, this.pitch));

        this.previousMousePosition = { x: event.clientX, y: event.clientY };
    };

    private handleWheel = (event: WheelEvent): void => {
        // Calculate new follow distance
        const newFollowDistance = this.followDistance + event.deltaY * 0.05;
        const clampedDistance = Math.max(5, Math.min(20, newFollowDistance));
        
        // Update distance first
        this.followDistance = clampedDistance;
        
        // Calculate height based on the initial ratio
        this.followHeight = clampedDistance / this.initialRatio;
        
        // Ensure height is within its bounds
        this.followHeight = Math.max(2, Math.min(20, this.followHeight));
    };

    private updateCameraPosition(): void {
        const airplanePos = this.airplane.getPosition();
        
        // Create a consistent up vector - always keep world up
        const worldUp = new THREE.Vector3(0, 1, 0);
        
        // Calculate forward vector based on yaw and pitch
        const forwardX = Math.sin(this.yaw) * Math.cos(this.pitch);
        const forwardY = Math.sin(this.pitch);
        const forwardZ = Math.cos(this.yaw) * Math.cos(this.pitch);
        const forward = new THREE.Vector3(forwardX, forwardY, forwardZ).normalize();
        
        // Calculate camera position using the forward vector
        const cameraPos = airplanePos.clone().add(
            forward.clone().multiplyScalar(-this.followDistance)
                .add(new THREE.Vector3(0, this.followHeight, 0))
        );
        
        // Set camera position
        camera.position.copy(cameraPos);
        
        // Create right vector (perpendicular to forward and world up)
        const right = new THREE.Vector3().crossVectors(forward, worldUp).normalize();
        // Create a corrected up vector (perpendicular to forward and right)
        const up = new THREE.Vector3().crossVectors(right, forward).normalize();
        
        // Create look-at matrix
        const lookAtMatrix = new THREE.Matrix4().makeBasis(right, up, forward.clone().negate());
        lookAtMatrix.setPosition(camera.position);
        
        // Extract rotation as quaternion from the matrix
        camera.quaternion.setFromRotationMatrix(lookAtMatrix);
    }

    public teleportAirplane(position: THREE.Vector3, direction?: THREE.Vector3): void {
        // Teleport the airplane to the given position
        this.airplane.teleportTo(position, direction);
        
        // If a direction is provided, set the initial view to match
        if (direction) {
            // Create a quaternion from the direction vector
            // (looking at the direction)
            const lookAtMatrix = new THREE.Matrix4().lookAt(
                new THREE.Vector3(0, 0, 0),
                direction,
                new THREE.Vector3(0, 1, 0) // Up is always world up
            );
            
            // Calculate the yaw based on the direction vector
            this.yaw = Math.atan2(direction.x, direction.z);
            
            // Reset pitch to be level (zero)
            this.pitch = 0;
        }
        
        // Update camera position to follow airplane
        this.updateCameraPosition();
        
        console.log(`Teleported airplane to position: ${position.x}, ${position.y}, ${position.z}`);
        if (direction) {
            console.log(`Facing direction: ${direction.x}, ${direction.y}, ${direction.z}`);
        }
    }

    public update(deltaTime: number = 1 / 60): void {
        const airplanePos = this.airplane.getPosition();
        
        // Create a consistent up vector - always keep world up
        const worldUp = new THREE.Vector3(0, 1, 0);
        
        // Calculate forward vector based on yaw and pitch
        const forwardX = Math.sin(this.yaw) * Math.cos(this.pitch);
        const forwardY = Math.sin(this.pitch);
        const forwardZ = Math.cos(this.yaw) * Math.cos(this.pitch);
        const forward = new THREE.Vector3(forwardX, forwardY, forwardZ).normalize();
        
        // Calculate camera position using the forward vector
        const cameraPos = airplanePos.clone().add(
            forward.clone().multiplyScalar(-this.followDistance)
                .add(new THREE.Vector3(0, this.followHeight, 0))
        );
        
        // Set camera position
        camera.position.copy(cameraPos);
        
        // Create right vector (perpendicular to forward and world up)
        const right = new THREE.Vector3().crossVectors(forward, worldUp).normalize();
        // Create a corrected up vector (perpendicular to forward and right)
        const up = new THREE.Vector3().crossVectors(right, forward).normalize();
        
        // Create look-at matrix
        const lookAtMatrix = new THREE.Matrix4().makeBasis(right, up, forward.clone().negate());
        lookAtMatrix.setPosition(camera.position);
        
        // Extract rotation as quaternion from the matrix
        camera.quaternion.setFromRotationMatrix(lookAtMatrix);
        
        // Compute camera forward direction for controls
        const cameraForward = forward.clone().negate();
        
        // Update controller with camera forward direction
        this.controller.update(deltaTime, cameraForward);
    }

    // Get the current position of the airplane
    public getAirplanePosition(): THREE.Vector3 {
        return this.airplane.getPosition();
    }

    public dispose(): void {
        this.controller.dispose();
        this.airplane.dispose();
        window.removeEventListener('mousedown', this.handleMouseDown);
        window.removeEventListener('mouseup', this.handleMouseUp);
        window.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('wheel', this.handleWheel);
    }
}