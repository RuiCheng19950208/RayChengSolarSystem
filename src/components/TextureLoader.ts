import * as THREE from 'three';

// For debugging - tracks loaded textures
const loadedTextures: Record<string, THREE.Texture> = {};

export const textureLoader = (texturePath: string | THREE.Texture): THREE.Texture => {
  // If already a THREE.Texture, just return it
  if (texturePath instanceof THREE.Texture) {
    return texturePath;
  }
  
  // Check if we've already loaded this texture
  if (loadedTextures[texturePath]) {
    console.log('Using cached texture:', texturePath);
    return loadedTextures[texturePath];
  }
  
  const loader = new THREE.TextureLoader();
  
  // Determine correct path based on environment
  let resolvedPath = texturePath;
  
  console.log('Original texture path:', texturePath);
  
  // For Electron builds, we need to adjust the path
  if (window.location.protocol === 'file:') {
    console.log('Running in Electron, adjusting texture path for:', texturePath);
    
    // Try various path resolutions
    const pathOptions = [
      // Try 1: Direct path to src/imgs
      texturePath,
      // Try 2: Direct from imgs folder at app root
      `./imgs/${texturePath.split('/').pop() || 'missing.jpg'}`,
      // Try 3: From extracted filename only
      `${texturePath.split('/').pop() || 'missing.jpg'}`,
      // Try 4: From build/imgs
      `./build/imgs/${texturePath.split('/').pop() || 'missing.jpg'}`,
      // Try 5: From resources/imgs
      `./resources/imgs/${texturePath.split('/').pop() || 'missing.jpg'}`
    ];
    
    // First just set to option 1, we'll try others on error
    resolvedPath = pathOptions[0];
    
    console.log('Resolved texture path (first attempt):', resolvedPath);
    console.log('Will try these paths if needed:', pathOptions);
  }
  
  try {
    const texture = loader.load(
      resolvedPath,
      (loadedTexture) => {
        console.log('Successfully loaded texture:', resolvedPath);
        loadedTextures[texturePath] = loadedTexture;
      },
      undefined,
      (error) => {
        console.error('Error loading texture from path:', resolvedPath, error);
        
        // If in Electron, try alternative paths
        if (window.location.protocol === 'file:') {
          const pathOptions = [
            texturePath,
            `./imgs/${texturePath.split('/').pop() || 'missing.jpg'}`,
            `${texturePath.split('/').pop() || 'missing.jpg'}`,
            `./build/imgs/${texturePath.split('/').pop() || 'missing.jpg'}`,
            `./resources/imgs/${texturePath.split('/').pop() || 'missing.jpg'}`
          ];
          
          // Try each path option until one works
          for (let i = 0; i < pathOptions.length; i++) {
            try {
              console.log(`Trying alternative path ${i}:`, pathOptions[i]);
              const altTexture = loader.load(pathOptions[i]);
              loadedTextures[texturePath] = altTexture;
              console.log('Successfully loaded texture from alternative path:', pathOptions[i]);
              return altTexture;
            } catch (e) {
              console.error(`Failed alternative path ${i}:`, e);
            }
          }
        }
        
        // Create a placeholder texture with an error message
        console.error('All texture loading attempts failed, creating placeholder');
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'magenta';
          ctx.fillRect(0, 0, 128, 128);
          ctx.fillStyle = 'black';
          ctx.font = '14px Arial';
          ctx.fillText('Error loading', 32, 60);
          ctx.fillText(texturePath.split('/').pop() || '', 32, 80);
        }
        const errorTexture = new THREE.CanvasTexture(canvas);
        loadedTextures[texturePath] = errorTexture;
        return errorTexture;
      }
    );
    
    return texture;
  } catch (error) {
    console.error('Exception in texture loader:', error);
    // Create a fallback texture
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'red';
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = 'white';
      ctx.font = '16px Arial';
      ctx.fillText('Texture Error', 20, 64);
    }
    const fallbackTexture = new THREE.CanvasTexture(canvas);
    loadedTextures[texturePath] = fallbackTexture;
    return fallbackTexture;
  }
}; 