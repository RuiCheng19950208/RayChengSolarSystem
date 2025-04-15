import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { scene } from '../globals/scene';
import { camera, updateCameraOnResize } from '../globals/camera';
import solarSystem from './SolarSystem';
import { getCameraController } from '../globals/scene';

const Renderer: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [planetLabelsOn, setPlanetLabelsOn] = useState(false);
  const [rotationSpeed, setRotationSpeed] = useState(3); // 0-8 scale (2^0 to 2^8)
  const [orbitSpeed, setOrbitSpeed] = useState(3); // 0-8 scale (2^0 to 2^8)
  const [thrustPower, setThrustPower] = useState(500); // Default 500, range 100-2000
  const [selectedPlanet, setSelectedPlanet] = useState("Earth");
  const [uiVisible, setUiVisible] = useState(true); // State for UI visibility
  const [airplaneSpeed, setAirplaneSpeed] = useState(0); // State to store airplane speed
  
  // Get planet colors from the solarSystem
  const planetColors = solarSystem.getColorList();
  
  // Planet options with name and color for the dropdown
  const planetOptions = [
    { name: "Mercury", color: `#${planetColors[0].toString(16).padStart(6, '0')}` },
    { name: "Venus", color: `#${planetColors[1].toString(16).padStart(6, '0')}` },
    { name: "Earth", color: `#${planetColors[2].toString(16).padStart(6, '0')}` },
    { name: "Mars", color: `#${planetColors[3].toString(16).padStart(6, '0')}` },
    { name: "Jupiter", color: `#${planetColors[4].toString(16).padStart(6, '0')}` },
    { name: "Saturn", color: `#${planetColors[5].toString(16).padStart(6, '0')}` },
    { name: "Uranus", color: `#${planetColors[6].toString(16).padStart(6, '0')}` },
    { name: "Neptune", color: `#${planetColors[7].toString(16).padStart(6, '0')}` },
    { name: "Pluto", color: `#${planetColors[8].toString(16).padStart(6, '0')}` },
    { name: "0.01 Light Years", color: "#D3D3D3" }, // Add Kuiper Belt with a light gray color
    { name: "Sun", color: "#FFFF00" }, // Keep Sun's color custom
    
  ];

  // Effect to update airplane speed
  useEffect(() => {
    const updateSpeed = () => {
      const cameraController = getCameraController();
      if (cameraController && cameraController.getAirplane()) {
        // Get the airplane velocity magnitude
        const velocity = cameraController.getAirplane().getVelocity().length();
        
        // Get Earth's diameter in the same units
        const earthDiameter = solarSystem.getObjectBaseSize("Earth") * 2 * solarSystem.getSizeRatio();
        
        // Calculate speed in Earth diameters per second
        const speedInEarthDiameters = velocity / earthDiameter;
        
        setAirplaneSpeed(speedInEarthDiameters);
      }
      
      // Request next frame
      requestAnimationFrame(updateSpeed);
    };
    
    // Start the update loop
    const animationId = requestAnimationFrame(updateSpeed);
    
    // Cleanup
    return () => cancelAnimationFrame(animationId);
  }, []);

  const handleTeleport = () => {
    // Get planet or sun position
    const position = solarSystem.getObjectPosition(selectedPlanet);
    
    // Special case for Kuiper Belt - 1.3 times Pluto's distance
    if (selectedPlanet === "0.01 Light Years") {
      // Get Pluto's distance using the getter method
      const plutoDistance = solarSystem.getObjectBaseDistance("Pluto");
      const kuiperBeltDistance = plutoDistance * 16 * solarSystem.getSizeRatio();
      
      // Create position 1.3 times Pluto's distance on the x-axis, z=0
      const teleportPosition = new THREE.Vector3(
        kuiperBeltDistance,
        0, // No elevation for Kuiper Belt
        0  // z=0 as requested
      );
      
      // Direction toward the center (sun)
      const directionToCenter = new THREE.Vector3(0, 0, 0).sub(teleportPosition).normalize();
      directionToCenter.y = 0;
      directionToCenter.normalize();
      
      // Teleport to the Kuiper Belt
      const cameraController = getCameraController();
      if (cameraController) {
        cameraController.teleportAirplane(teleportPosition, directionToCenter);
      }
      
      return;
    }
    
    if (position) {
      // Get the planet's base size and calculate appropriate distance
      const baseSize = solarSystem.getObjectBaseSize(selectedPlanet);
      const objectRadius = baseSize * solarSystem.getSizeRatio();
      
      // Add 100 units plus half the planet's diameter above the object
      const teleportPosition = new THREE.Vector3(
        position.x,
        position.y + 100 + objectRadius,
        position.z
      );
      
      // Calculate direction vector pointing toward the center (0,0,0)
      const directionToCenter = new THREE.Vector3(0, 0, 0).sub(teleportPosition).normalize();
      
      // But we want to keep y level (flat), so zero out the y component and renormalize
      directionToCenter.y = 0;
      directionToCenter.normalize();
      
      // Get camera controller and teleport the airplane with the facing direction
      const cameraController = getCameraController();
      if (cameraController) {
        cameraController.teleportAirplane(teleportPosition, directionToCenter);
      }
    }
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
    mountRef.current.appendChild(renderer.domElement);

    // Make sure camera renders all layers
    camera.layers.enableAll();

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!mountRef.current) return;

      // Get container dimensions
      const container = mountRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;

      // Update camera and renderer
      updateCameraOnResize(width, height);
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);

      console.log('Resized to:', width, 'x', height);
    };

    // Initial size setup
    handleResize();

    // Add resize listener with debounce
    let resizeTimeout: number;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', debouncedResize);

    // Add keyboard event listener for UI toggle
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setUiVisible(prevState => !prevState);
        event.preventDefault(); // Prevent scrolling when space is pressed
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('keydown', handleKeyDown);
      mountRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);
  
  // Toggle planet labels
  const togglePlanetLabels = () => {
    solarSystem.togglePlanetIndicators();
    setPlanetLabelsOn(!planetLabelsOn);
  };

  // Handle rotation speed change
  const handleRotationSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setRotationSpeed(value);
    
    // Special case: if slider is at 0, set speed to 0
    if (value === 0) {
      solarSystem.setSelfRotationSpeed(0);
    } else {
      // Otherwise apply exponential scaling: 2^(value-3) relative to default (at position 3)
      const scaleFactor = Math.pow(2, value - 3);
      solarSystem.setSelfRotationSpeed(0.02 * scaleFactor);
    }
  };

  // Handle orbit speed change
  const handleOrbitSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setOrbitSpeed(value);
    
    // Special case: if slider is at 0, set speed to 0
    if (value === 0) {
      solarSystem.setOrbitSpeed(0);
    } else {
      // Otherwise apply exponential scaling: 2^(value-3) relative to default (at position 3)
      const scaleFactor = Math.pow(2, value - 3);
      solarSystem.setOrbitSpeed(0.002 * scaleFactor);
    }
  };

  // Handle thrust power change
  const handleThrustPowerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setThrustPower(value);
    
    // Update the airplane's max thrust
    const cameraController = getCameraController();
    if (cameraController && cameraController.getAirplane()) {
      cameraController.getAirplane().setMaxThrust(value);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />
      
      {/* Instructions hint */}
      <div style={{ 
        position: 'absolute', 
        bottom: '20px', 
        left: '50%', 
        transform: 'translateX(-50%)',
        color: 'white',
        fontSize: '16px',
        opacity: 0.7,
        textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
        transition: 'opacity 0.3s',
        textAlign: 'center',
        pointerEvents: 'none'
      }}>
        Press SPACE to {uiVisible ? 'hide' : 'show'} UI
      </div>
      
      {uiVisible && (
        <>
          <div style={{ 
            position: 'absolute', 
            top: '20px', 
            left: '50%', 
            transform: 'translateX(-50%)',
            color: 'white',
            fontSize: '24px',
            fontWeight: 'bold',
            textShadow: '2px 2px 4px rgba(0,0,0,0.7)'
          }}>
            Ray Cheng Solar System
          </div>
          
          {/* Speed control sliders */}
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            padding: '15px',
            background: 'rgba(0,0,0,0.7)',
            borderRadius: '8px',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            width: '250px'
          }}
          onMouseDown={(e) => e.stopPropagation()} 
          onMouseMove={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                Rotation Speed: {rotationSpeed === 0 ? "Paused" : `${Math.pow(2, rotationSpeed-3).toFixed(2)}x`}
              </label>
              <input 
                type="range" 
                min="0" 
                max="8" 
                step="1"
                value={rotationSpeed}
                onChange={handleRotationSpeedChange}
                style={{
                  width: '100%',
                  height: '15px',
                  borderRadius: '5px',
                  background: '#444',
                  outline: 'none',
                  opacity: '0.7',
                  transition: 'opacity .2s'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                Orbit Speed: {orbitSpeed === 0 ? "Paused" : `${Math.pow(2, orbitSpeed-3).toFixed(2)}x`}
              </label>
              <input 
                type="range" 
                min="0" 
                max="8" 
                step="1"
                value={orbitSpeed}
                onChange={handleOrbitSpeedChange}
                style={{
                  width: '100%',
                  height: '15px',
                  borderRadius: '5px',
                  background: '#444',
                  outline: 'none',
                  opacity: '0.7',
                  transition: 'opacity .2s'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                Thrust Power: {thrustPower}
              </label>
              <input 
                type="range" 
                min="100" 
                max="5000" 
                step="100"
                value={thrustPower}
                onChange={handleThrustPowerChange}
                style={{
                  width: '100%',
                  height: '15px',
                  borderRadius: '5px',
                  background: '#444',
                  outline: 'none',
                  opacity: '0.7',
                  transition: 'opacity .2s'
                }}
              />
            </div>
            
            {/* Teleport control */}
            <div style={{ marginTop: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                Teleport to:
              </label>
              <div style={{ display: 'flex', gap: '5px' }}>
                <select 
                  value={selectedPlanet}
                  onChange={(e) => setSelectedPlanet(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '5px',
                    background: '#222',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {planetOptions.map(planet => (
                    <option 
                      key={planet.name} 
                      value={planet.name}
                      style={{ background: planet.color, color: '#000' }}
                    >
                      {planet.name}
                    </option>
                  ))}
                </select>
                <button 
                  onClick={handleTeleport}
                  style={{
                    padding: '5px 10px',
                    background: '#ff4500',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Go
                </button>
              </div>
            </div>
            
            {/* Planet Labels Toggle */}
            <div style={{ marginTop: '10px' }}>
              <button 
                onClick={togglePlanetLabels}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: planetLabelsOn ? '#6cff6c' : '#444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  transition: 'background-color 0.3s'
                }}
              >
                {planetLabelsOn ? 'Hide Planet Labels' : 'Show Planet Labels'}
              </button>
            </div>
            
            {/* Speed display */}
            <div style={{ 
              marginTop: '10px',
              padding: '8px 10px',
              background: 'rgba(0,0,0,0.3)',
              color: 'white',
              fontFamily: 'monospace',
              textAlign: 'center',
              borderRadius: '4px',
              border: '1px solid rgba(255,255,255,0.3)',
            }}>
              SPEED: {airplaneSpeed.toFixed(3)} Earth diameters/sec
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Renderer; 