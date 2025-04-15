import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { modelLoader } from './ModelLoader';


export class Airplane {
    private mesh: THREE.Group;
    private velocity: THREE.Vector3;
    private thrust: THREE.Vector3;
    private maxThrust: number = 5000;
    private mass: number = 1;
    private rotationSpeed: number = 3;
    private friction: number = 0.5;
    private initialPosition: THREE.Vector3;
    private modelScale: number = 0.3;
    private lastLogTime: number = 0;
    private scene: THREE.Scene;
    // private shipLight: THREE.PointLight;
    private controls: {
        thrustVector: THREE.Vector3;
        cameraForward: THREE.Vector3;
    } = {
        thrustVector: new THREE.Vector3(0, 0, 0),
        cameraForward: new THREE.Vector3(0, 0, -1),
    };
    private lastVelocityDirection: THREE.Vector3 | null = null;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.velocity = new THREE.Vector3();
        this.thrust = new THREE.Vector3();
        this.mesh = new THREE.Group();
        this.initialPosition = new THREE.Vector3(0, 0, 12000);
        this.scene.add(this.mesh);
        
        // Create a visible placeholder box
        const boxGeometry = new THREE.BoxGeometry(1, 1, 1); 
        const boxMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            wireframe: true,
            transparent: true,
            opacity: 0.8
        });
        const placeholderBox = new THREE.Mesh(boxGeometry, boxMaterial);
        placeholderBox.castShadow = true;
        placeholderBox.receiveShadow = true;
        this.mesh.add(placeholderBox);
        
        // Add a point light to the ship
        // this.shipLight = new THREE.PointLight(0xffffff, 5000, 2000);
        // this.shipLight.castShadow = true;
        // this.shipLight.shadow.mapSize.width = 512;  // Shadow map resolution
        // this.shipLight.shadow.mapSize.height = 512;
        // this.shipLight.shadow.camera.near = 0.5;    // Shadow camera near plane
        // this.shipLight.shadow.camera.far = 200;     // Shadow camera far plane
        // this.shipLight.position.set(0, 0, 0);
        // this.mesh.add(this.shipLight);
        
        this.loadSpaceship();
    }

    private async loadSpaceship(): Promise<void> {
        try {
            // Remove placeholder box
            if (this.mesh.children.length > 0) {
                this.mesh.remove(this.mesh.children[0]);
            }
            // Load and add model
            const model = await modelLoader('/Spaceship.glb');
            
            // Create a parent container for the model
            const modelContainer = new THREE.Group();
            modelContainer.add(model);
            
            // Apply rotation to the container
            modelContainer.rotation.y = Math.PI; // 180 degrees
            
            // Apply the transformation to the geometry instead of as rotation
            modelContainer.updateMatrixWorld(true);
            model.applyMatrix4(modelContainer.matrixWorld);
            
            // Reset the container's transformation
            modelContainer.rotation.set(0, 0, 0);
            modelContainer.updateMatrixWorld(true);
            
            // Add the model directly to the mesh
            this.mesh.add(model);
            
            // Enable shadows for the model and make it self-illuminated
            model.traverse((object) => {
                if (object instanceof THREE.Mesh) {
                    object.castShadow = true;
                    object.receiveShadow = true;
                    
                    // Make the ship self-illuminated
                    if (object.material) {
                        // Clone the material to avoid affecting other instances
                        if (Array.isArray(object.material)) {
                            object.material = object.material.map(mat => {
                                const newMat = mat.clone();
                                newMat.emissive = new THREE.Color(0x444444);
                                newMat.emissiveIntensity = 0.1;
                                return newMat;
                            });
                        } else {
                            const material = object.material.clone();
                            material.emissive = new THREE.Color(0x444444);
                            material.emissiveIntensity = 0.1;
                            object.material = material;
                        }
                    }
                }
            });
            
            // Adjust model properties
            model.scale.set(this.modelScale, this.modelScale, this.modelScale);
            this.mesh.position.copy(this.initialPosition);
        } catch (error) {
            console.error('Failed to load spaceship model:', error);
        }
    }

    public setControls(controls: {
        thrustVector: THREE.Vector3;
        cameraForward: THREE.Vector3;
    }): void {
        // Scale the thrust vector by max thrust
        this.thrust.copy(controls.thrustVector).multiplyScalar(this.maxThrust);
        this.controls = controls;
    }

    public update(deltaTime: number): void {
        if (!this.mesh) return;
    
        // Track if manual rotation was applied this frame
        let manualRotationApplied = false;
    
        // Apply thrust in camera-aligned directions
        if (!this.controls.thrustVector.equals(new THREE.Vector3(0, 0, 0))) {
            // Create a basis for camera-relative coordinates
            const forward = this.controls.cameraForward.clone().normalize();
            const right = new THREE.Vector3(0, 1, 0).cross(forward).normalize();
            const up = forward.clone().cross(right).normalize();
            
            // Transform the thrust vector from camera space to world space
            const worldThrustVector = new THREE.Vector3();
            worldThrustVector.addScaledVector(forward, -this.controls.thrustVector.z); // Forward is -Z
            worldThrustVector.addScaledVector(right, this.controls.thrustVector.x);    // Right is +X
            worldThrustVector.addScaledVector(up, this.controls.thrustVector.y);       // Up is +Y
            
            // Apply thrust force
            const thrustForce = worldThrustVector.multiplyScalar(this.maxThrust);
            const acceleration = thrustForce.divideScalar(this.mass);
            this.velocity.add(acceleration.multiplyScalar(deltaTime));
        }
    
        // Apply friction
        this.velocity.multiplyScalar(Math.pow(this.friction, deltaTime));
    
        // Update position
        this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));
    
        // Only auto-rotate if velocity is significant
        const minSpeed = 1.0;
        if (this.velocity.length() > minSpeed) {
            const velocityDirection = this.velocity.clone().normalize();
            
            const smoothingFactor = 0.8; // Tighter smoothing
            const smoothedDirection = this.lastVelocityDirection
                ? this.lastVelocityDirection.clone().lerp(velocityDirection, 1 - smoothingFactor)
                : velocityDirection.clone();
        
            this.lastVelocityDirection = smoothedDirection.clone();
        
            // Create a target quaternion that looks in the velocity direction
            const up = new THREE.Vector3(0, 1, 0); // World up
            const targetQuat = new THREE.Quaternion().setFromRotationMatrix(
                new THREE.Matrix4().lookAt(
                    new THREE.Vector3(0, 0, 0), // From
                    smoothedDirection,          // To
                    up                          // Up direction
                )
            );
        
            // Interpolate between current and target quaternion
            const rotationSpeed = 2.0;
            const maxAnglePerFrame = 0.1;
            const angleBetween = this.mesh.quaternion.angleTo(targetQuat);
            const t = Math.min(rotationSpeed * deltaTime, maxAnglePerFrame / angleBetween);
        
            this.mesh.quaternion.slerp(targetQuat, t);
        } else {
            this.lastVelocityDirection = null;
        }
        
    
        // Log quaternion every 0.5 seconds
        // this.lastLogTime += deltaTime;
        // if (this.lastLogTime >= 0.5) {
        //     // console.log("Quaternion:", this.mesh.quaternion);
        //     console.log("Velocity:", this.velocity);
        //     this.lastLogTime = 0; // Reset timer
        // }
    }

    public getPosition(): THREE.Vector3 {
        return this.mesh.position.clone();
    }

    public teleportTo(position: THREE.Vector3, direction?: THREE.Vector3): void {
        // Reset velocity when teleporting to prevent unexpected movements
        this.velocity.set(0, 0, 0);
        
        // Update position
        this.mesh.position.copy(position);
        
        // If direction is provided, orient the airplane to face that direction
        if (direction) {
            // Create a quaternion that makes the airplane look in the specified direction
            // We use lookAt with a matrix to create a quaternion
            const worldUp = new THREE.Vector3(0, 1, 0);
            const lookAtMatrix = new THREE.Matrix4().lookAt(
                new THREE.Vector3(0, 0, 0), // From origin
                direction, // To the specified direction
                worldUp // Up vector is world up
            );
            
            // Extract the rotation quaternion from the matrix and apply it
            const quaternion = new THREE.Quaternion().setFromRotationMatrix(lookAtMatrix);
            this.mesh.quaternion.copy(quaternion);
            
            console.log(`Set airplane orientation to face direction: ${direction.x.toFixed(2)}, ${direction.y.toFixed(2)}, ${direction.z.toFixed(2)}`);
        }
        
        // Reset any accumulated rotation or movement state
        this.lastVelocityDirection = null;
    }

    public getRotation(): THREE.Euler {
        return this.mesh.rotation.clone();
    }

    public getThrust(): THREE.Vector3 {
        return this.thrust.clone();
    }

    public dispose(): void {
        this.scene.remove(this.mesh);
        this.mesh.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.geometry.dispose();
                if (object.material instanceof THREE.Material) {
                    object.material.dispose();
                }
            }
        });
        // this.shipLight.dispose();
    }
}