// --- CONFIG ---
const OUTFIT_SCALE = 1.5; // 1.0 = normal size, >1 = bigger, <1 = smaller
const SMOOTHING_ALPHA = 0.3; // smoothing factor for position tracking

// HTML elements
const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');

// Define outfit sets (similar to ARLifejackets)
const outfitSets = [
  { torso: 'images/lifejacket.png', head: null, name: 'Lifejacket' },
  { torso: 'images/ranger_vest.png', head: 'images/ranger_hat.png', name: 'Ranger' },
  { torso: 'images/volunteer_vest.png', head: 'images/volunteer_hat.png', name: 'Volunteer' }
];

let currentSetIndex = 1; // Start with ranger set (index 1)
let outfitImages = {};
let imagesLoaded = 0;
const totalImages = outfitSets.reduce((count, set) => count + (set.torso ? 1 : 0) + (set.head ? 1 : 0), 0);

// Tracking for smoothing
let prevCoords = null;

// Load all outfit images
function loadOutfitImages() {
  outfitSets.forEach((set, setIndex) => {
    if (set.torso) {
      const torsoImg = new Image();
      torsoImg.onload = () => {
        imagesLoaded++;
        console.log(`Loaded torso image for ${set.name}`);
        checkAllImagesLoaded();
      };
      torsoImg.onerror = () => {
        console.error(`Failed to load torso image: ${set.torso}`);
        imagesLoaded++;
        checkAllImagesLoaded();
      };
      torsoImg.src = set.torso;
      outfitImages[`${setIndex}_torso`] = torsoImg;
    }
    
    if (set.head) {
      const headImg = new Image();
      headImg.onload = () => {
        imagesLoaded++;
        console.log(`Loaded head image for ${set.name}`);
        checkAllImagesLoaded();
      };
      headImg.onerror = () => {
        console.error(`Failed to load head image: ${set.head}`);
        imagesLoaded++;
        checkAllImagesLoaded();
      };
      headImg.src = set.head;
      outfitImages[`${setIndex}_head`] = headImg;
    }
  });
}

function checkAllImagesLoaded() {
  if (imagesLoaded >= totalImages) {
    console.log('All outfit images loaded!');
    createOutfitButtons();
  }
}

// Create outfit selection buttons
function createOutfitButtons() {
  const buttonContainer = document.createElement('div');
  buttonContainer.id = 'outfit-buttons';
  buttonContainer.style.cssText = `
    position: absolute;
    top: 20px;
    right: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    z-index: 1000;
  `;
  
  outfitSets.forEach((set, index) => {
    const button = document.createElement('button');
    button.textContent = set.name;
    button.style.cssText = `
      padding: 10px 15px;
      background: ${index === currentSetIndex ? '#007bff' : '#6c757d'};
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
      min-width: 100px;
    `;
    
    button.addEventListener('click', () => switchOutfitSet(index));
    button.addEventListener('mouseover', () => {
      if (index !== currentSetIndex) {
        button.style.background = '#5a6268';
      }
    });
    button.addEventListener('mouseout', () => {
      if (index !== currentSetIndex) {
        button.style.background = '#6c757d';
      }
    });
    
    buttonContainer.appendChild(button);
  });
  
  document.body.appendChild(buttonContainer);
}

// Switch outfit set
function switchOutfitSet(newIndex) {
  currentSetIndex = newIndex;
  console.log(`Switched to outfit set: ${outfitSets[currentSetIndex].name}`);
  
  // Update button styles
  const buttons = document.querySelectorAll('#outfit-buttons button');
  buttons.forEach((btn, idx) => {
    btn.style.background = idx === currentSetIndex ? '#007bff' : '#6c757d';
  });
}

// Enhanced overlay function with better positioning
function overlayImageOnCanvas(img, landmarks, isHead = false) {
  if (!img) return;
  
  const w = canvasElement.width;
  const h = canvasElement.height;
  
  let overlayX, overlayY, overlayWidth, overlayHeight;
  
  if (isHead) {
    // Head/hat positioning (similar to ARLifejackets logic)
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    
    const shoulderWidth = Math.abs((rightShoulder.x - leftShoulder.x) * w);
    const shoulderCenterX = ((leftShoulder.x + rightShoulder.x) / 2) * w;
    const shoulderCenterY = ((leftShoulder.y + rightShoulder.y) / 2) * h;
    
    overlayWidth = shoulderWidth * 1.2 * OUTFIT_SCALE;
    overlayHeight = overlayWidth; // Keep square for hats
    overlayX = shoulderCenterX - overlayWidth / 2;
    overlayY = shoulderCenterY - overlayHeight * 1.2; // Position above shoulders
    
  } else {
    // Torso positioning (enhanced from ARLifejackets)
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    if (!leftHip || !rightHip) return; // Need hip landmarks for torso
    
    const shoulderWidth = Math.abs((rightShoulder.x - leftShoulder.x) * w);
    const torsoTop = Math.min(leftShoulder.y, rightShoulder.y) * h;
    const torsoBottom = Math.max(leftHip.y, rightHip.y) * h;
    const torsoCenterX = ((leftShoulder.x + rightShoulder.x) / 2) * w;
    
    overlayWidth = shoulderWidth * 1.6 * OUTFIT_SCALE;
    overlayHeight = (torsoBottom - torsoTop) * OUTFIT_SCALE;
    overlayX = torsoCenterX - overlayWidth / 2;
    overlayY = torsoTop - overlayHeight * 0.1; // Slight offset upward
  }
  
  // Apply smoothing if we have previous coordinates
  if (prevCoords) {
    const key = isHead ? 'head' : 'torso';
    if (prevCoords[key]) {
      overlayX = SMOOTHING_ALPHA * overlayX + (1 - SMOOTHING_ALPHA) * prevCoords[key].x;
      overlayY = SMOOTHING_ALPHA * overlayY + (1 - SMOOTHING_ALPHA) * prevCoords[key].y;
      overlayWidth = SMOOTHING_ALPHA * overlayWidth + (1 - SMOOTHING_ALPHA) * prevCoords[key].width;
      overlayHeight = SMOOTHING_ALPHA * overlayHeight + (1 - SMOOTHING_ALPHA) * prevCoords[key].height;
    }
  }
  
  // Save current coordinates for next frame smoothing
  if (!prevCoords) prevCoords = {};
  const key = isHead ? 'head' : 'torso';
  prevCoords[key] = { x: overlayX, y: overlayY, width: overlayWidth, height: overlayHeight };
  
  // Draw the image
  canvasCtx.drawImage(img, overlayX, overlayY, overlayWidth, overlayHeight);
}

// Video setup
videoElement.onloadedmetadata = () => {
  const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;

  // Match canvas size with camera
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;

  // Make canvas and video fit the screen
  if (window.innerWidth / window.innerHeight > aspectRatio) {
    // Wide screen
    videoElement.style.width = 'auto';
    videoElement.style.height = '100vh';
    canvasElement.style.width = 'auto';
    canvasElement.style.height = '100vh';
  } else {
    // Tall screen
    videoElement.style.width = '100vw';
    videoElement.style.height = 'auto';
    canvasElement.style.width = '100vw';
    canvasElement.style.height = 'auto';
  }
};

// Initialize camera
navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
  videoElement.srcObject = stream;
}).catch(err => {
  console.error('Error accessing camera:', err);
});

// MediaPipe pose detection setup
const pose = new Pose({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
});

pose.setOptions({
  modelComplexity: 1, // Increased for better accuracy
  smoothLandmarks: true,
  enableSegmentation: false,
  minDetectionConfidence: 0.7, // Increased for better detection
  minTrackingConfidence: 0.5
});

// Enhanced pose results processing
pose.onResults((results) => {
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (!results.poseLandmarks) {
    prevCoords = null; // Reset smoothing when no pose detected
    return;
  }

  const landmarks = results.poseLandmarks;
  const currentSet = outfitSets[currentSetIndex];
  
  // Draw torso outfit if available
  if (currentSet.torso && outfitImages[`${currentSetIndex}_torso`]) {
    overlayImageOnCanvas(outfitImages[`${currentSetIndex}_torso`], landmarks, false);
  }
  
  // Draw head outfit if available
  if (currentSet.head && outfitImages[`${currentSetIndex}_head`]) {
    overlayImageOnCanvas(outfitImages[`${currentSetIndex}_head`], landmarks, true);
  }
});

// Start camera and pose detection
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await pose.send({ image: videoElement });
  },
  width: 1280, // Higher resolution for better detection
  height: 720
});

// Initialize everything
loadOutfitImages();
camera.start();

console.log('AR Volunteer Outfit system initialized with multiple outfit sets!');
