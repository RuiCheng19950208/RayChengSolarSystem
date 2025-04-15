import * as THREE from 'three';

export class Cube {
    private mesh: THREE.Mesh;
    private rotationSpeed: number;

    constructor() {
        // Create geometry
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        
        // Create material
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            metalness: 0.3,
            roughness: 0.4,
        });

        // Create mesh
        this.mesh = new THREE.Mesh(geometry, material);
        this.rotationSpeed = 0.01;
    }

    public init(): void {
        // Add to scene
        const scene = (window as any).scene;
        if (scene) {
            scene.add(this.mesh);
        }
    }

    public update(): void {
        // Rotate the cube
        this.mesh.rotation.x += this.rotationSpeed;
        this.mesh.rotation.y += this.rotationSpeed;
    }

    public dispose(): void {
        // Remove from scene and clean up
        const scene = (window as any).scene;
        if (scene) {
            scene.remove(this.mesh);
        }
        this.mesh.geometry.dispose();
        (this.mesh.material as THREE.Material).dispose();
    }
} 