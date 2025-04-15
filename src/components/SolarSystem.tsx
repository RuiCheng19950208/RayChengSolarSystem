import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { textureLoader } from './TextureLoader';

// Import textures
import starsTexture from '../imgs/stars.jpg';
import sunTexture from '../imgs/sun.jpg';
import mercuryTexture from '../imgs/mercury.jpg';
import venusTexture from '../imgs/venus.jpg';
import earthTexture from '../imgs/earth.jpg';
import marsTexture from '../imgs/mars.jpg';
import jupiterTexture from '../imgs/jupiter.jpg';
import saturnTexture from '../imgs/saturn.jpg';
import saturnRingTexture from '../imgs/saturn_ring.png';
import uranusTexture from '../imgs/uranus.jpg';
import uranusRingTexture from '../imgs/uranus_ring.png';
import neptuneTexture from '../imgs/neptune.jpg';
import plutoTexture from '../imgs/pluto.jpg';

class SolarSystem {
    private planets: THREE.Object3D[];
    private sun: THREE.Mesh;
    private sunLight!: THREE.PointLight;
    private baseLightIntensity: number = 1000000000;
    private baseLightDistance: number = 20000; // Maximum distance where light is at minimum
    private selfRotationSpeed: number;
    private orbitSpeed: number;
    private sizeRatio: number;
    private distanceRatio: number;
    private baseSelfRotationSpeeds: number[];
    private baseOrbitSpeeds: number[];
    private baseSizes: number[];
    private baseDistances: number[];
    private planetNames: string[];
    private planetAxialTilts: number[]; // Store axial tilts in radians
    private indicatorsVisible: boolean = false;
    private colorList: number[]; // Planet colors for indicators and UI
    private scene: THREE.Scene;
    
    // Singleton instance
    private static instance: SolarSystem;

    // Make constructor private to prevent new instances
    private constructor() {
        this.planets = [];
        this.sun = new THREE.Mesh();
        this.selfRotationSpeed = 0.02;
        this.orbitSpeed = 0.002;
        this.sizeRatio = 1.0;
        this.distanceRatio = 1.0;
        this.baseSelfRotationSpeeds = [0.004, 0.002, 0.02, 0.018, 0.04, 0.038, 0.03, 0.032, 0.008];
        this.baseOrbitSpeeds = [
            0.041667, // Mercury: 0.01/0.24 (88 days)
            0.016129, // Venus: 0.01/0.62 (225 days)
            0.01,     // Earth: reference (365.25 days)
            0.005319, // Mars: 0.01/1.88 (687 days)
            0.000843, // Jupiter: 0.01/11.86 (4,333 days)
            0.000339, // Saturn: 0.01/29.46 (10,759 days)
            0.000119, // Uranus: 0.01/84.01 (30,687 days)
            0.000061, // Neptune: 0.01/164.8 (60,190 days)
            0.000040  // Pluto: 0.01/248 (90,560 days)
        ];
        this.planetNames = ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
        
        // Axial tilts for each planet in radians
        this.planetAxialTilts = [
            0.034 * Math.PI / 180,   // Mercury (almost no tilt)
            177.4 * Math.PI / 180,   // Venus (retrograde rotation)
            23.4 * Math.PI / 180,    // Earth
            25.2 * Math.PI / 180,    // Mars
            3.1 * Math.PI / 180,     // Jupiter
            26.7 * Math.PI / 180,    // Saturn
            97.8 * Math.PI / 180,    // Uranus (almost sideways)
            28.3 * Math.PI / 180,    // Neptune
            57.5 * Math.PI / 180     // Pluto
        ];

        this.colorList = [
            0xFF3030, // Red (Mercury)
            0xFFFF00, // Yellow (Venus)
            0x228B22, // Green (Earth)
            0xFFA500, // Orange (Mars)
            0x964B00, // Dark Brown (Jupiter)
            0xFF69B4, // Pink (Saturn)
            0x00FFFF, // Cyan (Uranus)
            0x0033FF, // Blue (Neptune)
            0xFFFFFF  // White (Pluto)
        ];
        this.baseSizes = [
            10900,  // Sun (109 × Earth) - index 0
            38,     // Mercury (0.383 × Earth) - index 1
            95,     // Venus (0.949 × Earth) - index 2
            100,    // Earth - index 3
            53,     // Mars (0.532 × Earth) - index 4
            1121,   // Jupiter (11.209 × Earth) - index 5
            945,    // Saturn (9.449 × Earth) - index 6
            401,    // Uranus (4.007 × Earth) - index 7
            388,    // Neptune (3.883 × Earth) - index 8
            19      // Pluto (0.186 × Earth) - index 9
        ];
        
        // Scale distances with Mercury at 1500 units
        this.baseDistances = [
            15000,      // Mercury (0.387 AU) - index 0
            28020,      // Venus (0.723 AU) - index 1
            38760,      // Earth (1 AU) - index 2
            59070,      // Mars (1.524 AU) - index 3
            201630,     // Jupiter (5.203 AU) - index 4
            371390,     // Saturn (9.582 AU) - index 5
            744190,     // Uranus (19.201 AU) - index 6
            1164570,    // Neptune (30.047 AU) - index 7
            1530080     // Pluto (39.482 AU) - index 8
        ];
        
        // Scene will be injected later via setScene()
        this.scene = new THREE.Scene(); // Temporary scene
    }
    
    // Static method to get the singleton instance
    public static getInstance(): SolarSystem {
        if (!SolarSystem.instance) {
            SolarSystem.instance = new SolarSystem();
        }
        return SolarSystem.instance;
    }
    
    // Method to inject the scene after it's been created
    public setScene(scene: THREE.Scene): void {
        this.scene = scene;
    }

    public setupScene(): void {
        // Setup skybox
        const cubeTextureLoader = new THREE.CubeTextureLoader();
        
        // Handle electron environment for skybox textures
        let skyTexture = starsTexture;
        if (window.location.protocol === 'file:') {
            skyTexture = './imgs/stars.jpg';
        }
        
        this.scene.background = cubeTextureLoader.load([
            skyTexture, skyTexture, // right, left
            skyTexture, skyTexture, // top, bottom
            skyTexture, skyTexture  // front, back
        ]);

        // Setup lights
        const ambientLight = new THREE.AmbientLight(0x333333);
        this.scene.add(ambientLight);

        // const pointLight = new THREE.PointLight(0xFFFFFF, 2, 300);
        // this.scene.add(pointLight);

        // Create sun and planets
        this.createSun();
        this.createPlanets();
    }

    private createSun(): void {
        // Increase sun geometry resolution from 128,128 to 256,256
        const sunGeo = new THREE.SphereGeometry(this.baseSizes[0]*this.sizeRatio, 512, 512);
        
        // Debug texture loading
        console.log("Attempting to load sun texture:", sunTexture);
        const texture = textureLoader(sunTexture);
        console.log("Texture loaded object:", texture);
        
        // Create a material that doesn't require lighting to be visible
        const sunMat = new THREE.MeshBasicMaterial({
            map: texture,
            // color: 0xff8800 // Orange fallback color that will be visible even if texture fails
        });
        
        // Log texture properties
        if (sunMat.map) {
            console.log("Sun texture dimensions:", sunMat.map.image?.width, "x", sunMat.map.image?.height);
            
            // Set high-quality texture rendering
            sunMat.map.minFilter = THREE.LinearFilter;
            sunMat.map.magFilter = THREE.LinearFilter;
            sunMat.map.anisotropy = 16;
            sunMat.needsUpdate = true;
        } else {
            console.warn("Sun texture map not available - will show as solid orange");
        }
        
        this.sun = new THREE.Mesh(sunGeo, sunMat);
        this.scene.add(this.sun);

        // Create point light at sun's position with infinite range
        this.sunLight = new THREE.PointLight(0xffffff, this.baseLightIntensity, Infinity);
        this.sunLight.position.set(0, 0, 0);
        this.sunLight.castShadow = true;
        // Increase shadow map resolution for better shadows
        this.sunLight.shadow.mapSize.width = 4096;
        this.sunLight.shadow.mapSize.height = 4096;
        this.sunLight.shadow.camera.near = 50;
        this.sunLight.shadow.camera.far = 1500000;
        this.sunLight.shadow.bias = -0.00001;
        this.scene.add(this.sunLight);
    }

    private createPlanet(
        radius: number, 
        texture: string | THREE.Texture, 
        distance: number, 
        orbitPhase: number, 
        rotationPhase: number, 
        ring?: { innerRadius: number, outerRadius: number, texture: string | THREE.Texture },
        axialTilt?: number
    ): THREE.Object3D {
        const planetGroup = new THREE.Group();
        
        // Create the planet with higher resolution geometry
        // Increase segments from 32,32 to 64,64 for higher detail
        const planetGeometry = new THREE.SphereGeometry(radius, 512, 512);
        const planetMaterial = new THREE.MeshPhongMaterial({
            map: typeof texture === 'string' ? textureLoader(texture) : texture,
            shininess: 5
        });
        
        // Set texture properties if available
        if (planetMaterial.map) {
            planetMaterial.map.minFilter = THREE.LinearFilter;
            planetMaterial.map.magFilter = THREE.LinearFilter;
            // Set maximum anisotropy for the texture
            planetMaterial.map.anisotropy = 16;
        }
        
        const planet = new THREE.Mesh(planetGeometry, planetMaterial);
        
        // Set initial position based on orbit phase
        planet.position.x = distance * Math.cos(orbitPhase);
        planet.position.z = distance * Math.sin(orbitPhase);
        planet.rotation.y = rotationPhase;
        
        // Apply axial tilt if provided
        if (axialTilt !== undefined) {
            planet.rotation.x = axialTilt;
        }
        
        // Save orbit properties for animation
        planetGroup.userData = {
            radius: radius,
            distance: distance,
            orbitPhase: orbitPhase,
            rotationSpeed: 0.01 / Math.sqrt(distance),  // Rotation speed inversely proportional to square root of distance
            orbitSpeed: 0.005 / Math.pow(distance, 1.5)  // Orbit speed inversely proportional to distance^1.5 (approximating Kepler's law)
        };

        planetGroup.add(planet);

        // If the planet has a ring, create it with higher resolution
        if (ring) {
            // Increase ring segments from 32 to 64 for higher detail
            const ringGeometry = new THREE.RingGeometry(ring.innerRadius, ring.outerRadius, 512);
            
            // Change from MeshBasicMaterial to MeshPhongMaterial to make rings responsive to lighting
            const ringMaterial = new THREE.MeshPhongMaterial({
                map: typeof ring.texture === 'string' ? textureLoader(ring.texture) : ring.texture,
                side: THREE.DoubleSide,
                transparent: true,
                shininess: 30,
                specular: 0x333333,
                emissive: 0x222222,          // Add slight emissive for visibility from back
                emissiveIntensity: 0.2,       // Low intensity so it doesn't overpower lighting
                depthWrite: false,            // Prevents sorting issues with transparency
                blending: THREE.CustomBlending, // Use custom blending for better transparency
                blendSrc: THREE.SrcAlphaFactor,
                blendDst: THREE.OneMinusSrcAlphaFactor,
                blendEquation: THREE.AddEquation
            });
            
            // Set texture properties if available
            if (ringMaterial.map) {
                ringMaterial.map.minFilter = THREE.LinearFilter;
                ringMaterial.map.magFilter = THREE.LinearFilter;
                // Set maximum anisotropy for the texture
                ringMaterial.map.anisotropy = 16;
            }
            
            const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
            ringMesh.rotation.x = Math.PI / 2;  // Rotate to be horizontal
            ringMesh.castShadow = true;
            ringMesh.receiveShadow = true;
            planet.add(ringMesh);
        }

        this.scene.add(planetGroup);
        return planetGroup;
    }

    private createPlanets(): void {
        // Clear any existing planets
        this.planets.forEach(planet => {
            this.scene.remove(planet);
        });
        this.planets = [];

        // Create planets with real-ish proportions and random phases
        // Mercury
        const mercury = this.createPlanet(
            this.baseSizes[1] * this.sizeRatio, 
            mercuryTexture, 
            this.baseDistances[0] * this.distanceRatio,
            Math.random() * Math.PI * 2, // Random orbit phase
            Math.random() * Math.PI * 2,  // Random rotation phase
            undefined,
            this.planetAxialTilts[0]
        );
        mercury.name = "Mercury";
        this.planets.push(mercury);

        // Venus
        const venus = this.createPlanet(
            this.baseSizes[2] * this.sizeRatio, 
            venusTexture,
            this.baseDistances[1] * this.distanceRatio,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            undefined,
            this.planetAxialTilts[1]
        );
        venus.name = "Venus";
        this.planets.push(venus);

        // Earth
        const earth = this.createPlanet(
            this.baseSizes[3] * this.sizeRatio, 
            earthTexture,
            this.baseDistances[2] * this.distanceRatio,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            undefined,
            this.planetAxialTilts[2]
        );
        earth.name = "Earth";
        this.planets.push(earth);

        // Mars
        const mars = this.createPlanet(
            this.baseSizes[4] * this.sizeRatio, 
            marsTexture,
            this.baseDistances[3] * this.distanceRatio,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            undefined,
            this.planetAxialTilts[3]
        );
        mars.name = "Mars";
        this.planets.push(mars);

        // Jupiter
        const jupiter = this.createPlanet(
            this.baseSizes[5] * this.sizeRatio, 
            jupiterTexture,
            this.baseDistances[4] * this.distanceRatio,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            undefined,
            this.planetAxialTilts[4]
        );
        jupiter.name = "Jupiter";
        this.planets.push(jupiter);

        // Saturn
        const saturn = this.createPlanet(
            this.baseSizes[6] * this.sizeRatio, 
            saturnTexture,
            this.baseDistances[5] * this.distanceRatio,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            {
                innerRadius: 10 * this.baseSizes[3], // Earth size reference
                outerRadius: 20 * this.baseSizes[3], // Earth size reference
                texture: saturnRingTexture
            },
            this.planetAxialTilts[5]
        );
        saturn.name = "Saturn";
        this.planets.push(saturn);

        // Uranus
        const uranus = this.createPlanet(
            this.baseSizes[7] * this.sizeRatio, 
            uranusTexture,
            this.baseDistances[6] * this.distanceRatio,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            {
                innerRadius: 7 * this.baseSizes[3], // Earth size reference
                outerRadius: 12 * this.baseSizes[3], // Earth size reference
                texture: uranusRingTexture
            },
            this.planetAxialTilts[6]
        );
        uranus.name = "Uranus";
        this.planets.push(uranus);

        // Neptune
        const neptune = this.createPlanet(
            this.baseSizes[8] * this.sizeRatio, 
            neptuneTexture,
            this.baseDistances[7] * this.distanceRatio,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            undefined,
            this.planetAxialTilts[7]
        );
        neptune.name = "Neptune";
        this.planets.push(neptune);

        // Pluto
        const pluto = this.createPlanet(
            this.baseSizes[9] * this.sizeRatio, 
            plutoTexture,
            this.baseDistances[8] * this.distanceRatio,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            undefined,
            this.planetAxialTilts[8]
        );
        pluto.name = "Pluto";
        this.planets.push(pluto);
    }

    public update(): void {
        // Self-rotation - rotate the sun around Y axis
        this.sun.rotateY(0.004 * this.selfRotationSpeed);
        
        // Update each planet
        this.planets.forEach((planet, index) => {
            const userData = planet.userData;
            
            // Rotate the planet around its axis
            const planetMesh = planet.children[0] as THREE.Mesh;
            planetMesh.rotateY(this.baseSelfRotationSpeeds[index] * this.selfRotationSpeed);
            
            // Rotate the planet around the sun
            planet.rotateY(this.baseOrbitSpeeds[index] * this.orbitSpeed);
            
            // Update indicator position if visible
            if (this.indicatorsVisible && userData.indicator) {
                const worldPosition = new THREE.Vector3();
                planetMesh.getWorldPosition(worldPosition);
                userData.indicator.position.copy(worldPosition);
            }
        });
    }

    // Method to update the sun light intensity based on airplane position
    public updateSunLightForAirplane(airplanePosition: THREE.Vector3): void {
        // Calculate distance to sun
        const distanceToSun = airplanePosition.length();
        
        // Calculate intensity based on distance
        // Map distance from 0 to maxLightDistance to intensity from baseLightIntensity to minLightIntensity
        let intensity: number;
        
        if (distanceToSun <= this.baseLightDistance) {
            intensity = this.baseLightIntensity;
        } else {
            // Linear interpolation
            const t = distanceToSun / this.baseLightDistance;
            intensity = this.baseLightIntensity * t* t ;
        }
        
        // Apply intensity to sun light
        this.sunLight.intensity = intensity;
        
        // Log for debugging
        // console.log(`Distance to sun: ${distanceToSun.toFixed(0)}, Light intensity: ${intensity.toExponential(2)}`);
    }

    // Add methods to update speeds
    public setSelfRotationSpeed(speed: number): void {
        this.selfRotationSpeed = speed;
    }

    public setOrbitSpeed(speed: number): void {
        this.orbitSpeed = speed;
    }

    public setSizeRatio(ratio: number): void {
        this.sizeRatio = ratio;
    }

    public getSizeRatio(): number {
        return this.sizeRatio;
    }

    public setDistanceRatio(ratio: number): void {
        this.distanceRatio = ratio;
    }

    // Get the world position of a planet or the sun based on its name
    public getObjectPosition(objectName: string): THREE.Vector3 | null {
        // Check if looking for the sun
        if (objectName === "Sun") {
            const position = new THREE.Vector3();
            this.sun.getWorldPosition(position);
            return position;
        }
        
        // Find the planet by name
        const planet = this.planets.find(p => p.name === objectName);
        if (!planet) {
            console.warn(`Planet "${objectName}" not found`);
            return null;
        }
        
        // Get and return the world position of the planet's first child (the mesh)
        const position = new THREE.Vector3();
        const planetMesh = planet.children[0] as THREE.Mesh;
        planetMesh.getWorldPosition(position);
        return position;
    }

    // Get color for a specific planet by index
    public getPlanetColor(index: number): number {
        if (index >= 0 && index < this.colorList.length) {
            return this.colorList[index];
        }
        return 0xFFFFFF; // Default white if index is out of bounds
    }
    
    // Get the entire color list
    public getColorList(): number[] {
        return [...this.colorList]; // Return a copy to prevent external modification
    }

    // Get the base size of a planet or sun by name
    public getObjectBaseSize(objectName: string): number {
        // Check if looking for the sun
        if (objectName === "Sun") {
            return this.baseSizes[0];
        }
        
        // Find the planet index
        const planetIndex = this.planetNames.indexOf(objectName);
        if (planetIndex === -1) {
            console.warn(`Planet "${objectName}" not found`);
            return 0;
        }
        
        // Return the base size (adding 1 to account for sun being at index 0)
        return this.baseSizes[planetIndex + 1];
    }

    // Get the base distance of a planet from the sun by name
    public getObjectBaseDistance(objectName: string): number {
        // Find the planet index
        const planetIndex = this.planetNames.indexOf(objectName);
        if (planetIndex === -1) {
            console.warn(`Planet "${objectName}" not found for distance`);
            return 0;
        }
        
        // Return the base distance for this planet
        return this.baseDistances[planetIndex];
    }

    // Toggle visibility of planet indicators
    public togglePlanetIndicators(): void {
        this.indicatorsVisible = !this.indicatorsVisible;
        
        if (this.indicatorsVisible) {
            this.createPlanetIndicators();
        } else {
            this.removePlanetIndicators();
        }
    }
    
    // Create indicators for all planets
    private createPlanetIndicators(): void {
        // Use the class property for planet colors
        this.planets.forEach((planet, index) => {
            // Get the color for this planet
            const planetColor = this.colorList[index % this.colorList.length];
            
            // Create a group for the indicator
            const indicator = new THREE.Group();
            
            // Get world position of the planet
            const worldPosition = new THREE.Vector3();
            const planetMesh = planet.children[0] as THREE.Mesh;
            planetMesh.getWorldPosition(worldPosition);
            
            // Create a line pointing upward
            const lineHeight = 50000;
            const lineMaterial = new THREE.LineBasicMaterial({ color: planetColor });
            const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(0, lineHeight, 0)
            ]);
            const line = new THREE.Line(lineGeometry, lineMaterial);
            
            // Create a sphere at the top of the line
            const sphereGeo = new THREE.SphereGeometry(50, 16, 16);
            const sphereMat = new THREE.MeshBasicMaterial({ color: planetColor });
            const sphere = new THREE.Mesh(sphereGeo, sphereMat);
            sphere.position.y = lineHeight;
            
            // Create text label with planet name
            // Since we can't directly create text in Three.js, we'll use a simple alternative
            const labelGeo = new THREE.PlaneGeometry(300, 100);
            const canvas = document.createElement('canvas');
            canvas.width = 300;
            canvas.height = 100;
            const context = canvas.getContext('2d');
            if (context) {
                // Convert hex color to RGB for canvas
                const r = (planetColor >> 16) & 255;
                const g = (planetColor >> 8) & 255;
                const b = planetColor & 255;
                
                context.fillStyle = '#000000';
                context.fillRect(0, 0, 300, 100);
                context.font = 'Bold 40px Arial';
                context.fillStyle = `rgb(${r},${g},${b})`;
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.fillText(planet.name, 150, 50);
            }
            const texture = new THREE.CanvasTexture(canvas);
            const labelMat = new THREE.MeshBasicMaterial({ 
                map: texture, 
                transparent: true,
                side: THREE.DoubleSide
            });
            const label = new THREE.Mesh(labelGeo, labelMat);
            label.position.y = 300;
            
            // Add elements to indicator group
            indicator.add(line);
            indicator.add(sphere);
            indicator.add(label);
            
            // Position the indicator at the planet's world position
            indicator.position.copy(worldPosition);
            
            // Add indicator to scene and store reference
            this.scene.add(indicator);
            planet.userData.indicator = indicator;
        });
    }
    
    // Remove all planet indicators
    private removePlanetIndicators(): void {
        this.planets.forEach(planet => {
            if (planet.userData.indicator) {
                this.scene.remove(planet.userData.indicator);
                planet.userData.indicator = undefined;
            }
        });
    }

    public dispose(): void {
        // Remove all objects from scene including indicators
        this.removePlanetIndicators();
        this.scene.remove(this.sun);
        this.scene.remove(this.sunLight);
        this.planets.forEach(planet => {
            this.scene.remove(planet);
            const planetMesh = planet.children[0] as THREE.Mesh;
            if (planetMesh) {
                planetMesh.geometry.dispose();
                if (Array.isArray(planetMesh.material)) {
                    planetMesh.material.forEach(mat => mat.dispose());
                } else {
                    planetMesh.material.dispose();
                }
            }
        });
        this.sun.geometry.dispose();
        if (Array.isArray(this.sun.material)) {
            this.sun.material.forEach(mat => mat.dispose());
        } else {
            this.sun.material.dispose();
        }
    }
}

// Create and export the singleton instance
const solarSystem = SolarSystem.getInstance();

// Export the singleton instance
export default solarSystem;
