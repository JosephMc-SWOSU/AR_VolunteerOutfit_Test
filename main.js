import {
  FilesetResolver,
  PoseLandmarker
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";
// --- CONFIG ---
let OUTFIT_SCALE = 1.5;
let USER_SCALE_OVERRIDE = 1.5;
let AUTO_SCALE_ENABLED = false; // Changed to false so manual works immediately
const SMOOTHING_ALPHA = 0.1;

// HTML elements
const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');

// Define outfit sets
const outfitSets = [
  { torso: 'images/lifejacket3.png', head: null, name: 'Lifejacket' },
  { torso: 'images/ranger_vest.png', head: 'images/ranger_hat.png', name: 'Ranger' },
  { torso: 'images/volunteer_vest.png', head: 'images/volunteer_hat.png', name: 'Volunteer' }
];

let currentSetIndex = 1;
let outfitImages = {};
let imagesLoaded = 0;
const totalImages = outfitSets.reduce((count, set) => count + (set.torso ? 1 : 0) + (set.head ? 1 : 0), 0);
let prevCoords = null;

// (Declarations only at the top of the file)

// Load all outfit images
function loadOutfitImages() {
  outfitSets.forEach((set, setIndex) => {
    if (set.torso) {
      const torsoImg = new Image();
      torsoImg.onload = () => {
        imagesLoaded++;
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

function createOutfitButtons() {
  const existingButtons = document.getElementById('outfit-buttons');
  if (existingButtons) {
    existingButtons.remove();
  }
  
  const buttonContainer = document.createElement('div');
  buttonContainer.id = 'outfit-buttons';
  buttonContainer.style.cssText = `
    position: fixed;
    top: 50%;
    right: 20px;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 12px;
    z-index: 10000;
  `;
  
  outfitSets.forEach((set, index) => {
    const button = document.createElement('button');
    button.style.cssText = `
      width: 80px;
      height: 80px;
      padding: 0;
      border: 3px solid ${index === currentSetIndex ? '#007bff' : '#ffffff'};
      border-radius: 12px;
      cursor: pointer;
      background: #f8f9fa;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
      overflow: hidden;
      position: relative;
    `;
    
    const img = document.createElement('img');
    const imagePath = set.torso || set.head;
    img.src = imagePath;
    img.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: white;
    `;
    img.alt = set.name;
    
    const label = document.createElement('div');
    label.textContent = set.name;
    label.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(0,0,0,0.7);
      color: white;
      font-size: 8px;
      text-align: center;
      padding: 2px;
      font-weight: bold;
    `;
    
    button.appendChild(img);
    button.appendChild(label);
    
    button.addEventListener('click', () => {
      switchOutfitSet(index);
    });
    
    buttonContainer.appendChild(button);
  });
  
  document.body.appendChild(buttonContainer);
}

function switchOutfitSet(newIndex) {
  currentSetIndex = newIndex;
  const buttons = document.querySelectorAll('#outfit-buttons button');
  buttons.forEach((btn, idx) => {
    btn.style.border = `3px solid ${idx === currentSetIndex ? '#007bff' : '#ffffff'}`;
  });
}

function overlayImageOnCanvas(img, landmarks, isHead = false) {
  if (!img) return;
  
  const w = canvasElement.width;
  const h = canvasElement.height;
  
  let overlayX, overlayY, overlayWidth, overlayHeight;
  
  if (isHead) {
    const nose = landmarks[0];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    
    if (!nose || !leftShoulder || !rightShoulder) return;
    
    const shoulderWidth = Math.abs((rightShoulder.x - leftShoulder.x) * w);
    const shoulderCenterY = ((leftShoulder.y + rightShoulder.y) / 2) * h;
    const noseX = nose.x * w;
    const noseY = nose.y * h;
    
    overlayWidth = shoulderWidth * 1.2 * OUTFIT_SCALE;
    overlayHeight = overlayWidth;
    overlayX = noseX - overlayWidth / 2;
    
    const headToShoulderDistance = Math.abs(noseY - shoulderCenterY);
    const hatOffset = overlayHeight * 0.8 + headToShoulderDistance * 0.2;
    overlayY = noseY - hatOffset;
    
  } else {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    if (!leftHip || !rightHip) return;
    
    const shoulderWidth = Math.abs((rightShoulder.x - leftShoulder.x) * w);
    const torsoTop = Math.min(leftShoulder.y, rightShoulder.y) * h;
    const torsoBottom = Math.max(leftHip.y, rightHip.y) * h;
    const torsoCenterX = ((leftShoulder.x + rightShoulder.x) / 2) * w;
    
    overlayWidth = shoulderWidth * 1.6 * OUTFIT_SCALE;
    overlayHeight = (torsoBottom - torsoTop) * OUTFIT_SCALE;
    overlayX = torsoCenterX - overlayWidth / 2;
    overlayY = torsoTop - overlayHeight * 0.2;
  }
  
  if (prevCoords) {
    const key = isHead ? 'head' : 'torso';
    if (prevCoords[key]) {
      overlayX = SMOOTHING_ALPHA * overlayX + (1 - SMOOTHING_ALPHA) * prevCoords[key].x;
      overlayY = SMOOTHING_ALPHA * overlayY + (1 - SMOOTHING_ALPHA) * prevCoords[key].y;
      overlayWidth = SMOOTHING_ALPHA * overlayWidth + (1 - SMOOTHING_ALPHA) * prevCoords[key].width;
      overlayHeight = SMOOTHING_ALPHA * overlayHeight + (1 - SMOOTHING_ALPHA) * prevCoords[key].height;
    }
  }
  
  if (!prevCoords) prevCoords = {};
  const key = isHead ? 'head' : 'torso';
  prevCoords[key] = { x: overlayX, y: overlayY, width: overlayWidth, height: overlayHeight };
  
  canvasCtx.drawImage(img, overlayX, overlayY, overlayWidth, overlayHeight);
}

// Multi-person overlay function for smoothing per person
function overlayImageOnCanvasMulti(img, landmarks, isHead = false, personPrevCoords) {
  if (!img) return;
  const w = canvasElement.width;
  const h = canvasElement.height;
  let overlayX, overlayY, overlayWidth, overlayHeight;
  if (isHead) {
    const nose = landmarks[0];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    if (!nose || !leftShoulder || !rightShoulder) return;
    const shoulderWidth = Math.abs((rightShoulder.x - leftShoulder.x) * w);
    const shoulderCenterY = ((leftShoulder.y + rightShoulder.y) / 2) * h;
    const noseX = nose.x * w;
    const noseY = nose.y * h;
    overlayWidth = shoulderWidth * 1.2 * OUTFIT_SCALE;
    overlayHeight = overlayWidth;
    overlayX = noseX - overlayWidth / 2;
    const headToShoulderDistance = Math.abs(noseY - shoulderCenterY);
    const hatOffset = overlayHeight * 0.8 + headToShoulderDistance * 0.2;
    overlayY = noseY - hatOffset;
  } else {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    if (!leftHip || !rightHip) return;
    const shoulderWidth = Math.abs((rightShoulder.x - leftShoulder.x) * w);
    const torsoTop = Math.min(leftShoulder.y, rightShoulder.y) * h;
    const torsoBottom = Math.max(leftHip.y, rightHip.y) * h;
    const torsoCenterX = ((leftShoulder.x + rightShoulder.x) / 2) * w;
    overlayWidth = shoulderWidth * 1.6 * OUTFIT_SCALE;
    overlayHeight = (torsoBottom - torsoTop) * OUTFIT_SCALE;
    overlayX = torsoCenterX - overlayWidth / 2;
    overlayY = torsoTop - overlayHeight * 0.2;
  }
  if (personPrevCoords) {
    const key = isHead ? 'head' : 'torso';
    if (personPrevCoords[key]) {
      overlayX = SMOOTHING_ALPHA * overlayX + (1 - SMOOTHING_ALPHA) * personPrevCoords[key].x;
      overlayY = SMOOTHING_ALPHA * overlayY + (1 - SMOOTHING_ALPHA) * personPrevCoords[key].y;
      overlayWidth = SMOOTHING_ALPHA * overlayWidth + (1 - SMOOTHING_ALPHA) * personPrevCoords[key].width;
      overlayHeight = SMOOTHING_ALPHA * overlayHeight + (1 - SMOOTHING_ALPHA) * personPrevCoords[key].height;
    }
    personPrevCoords[key] = { x: overlayX, y: overlayY, width: overlayWidth, height: overlayHeight };
  }
  canvasCtx.drawImage(img, overlayX, overlayY, overlayWidth, overlayHeight);
}

// Setup scale controls
function setupScaleControls() {
  const slider = document.getElementById('jacket-scale-slider');
  const scaleValue = document.getElementById('scale-value');
  const resetButton = document.getElementById('reset-scale');
  
  if (!slider) {
    console.error('Slider not found');
    return;
  }
  
  function updateScale(value) {
    const newScale = parseFloat(value);
    OUTFIT_SCALE = newScale;
    scaleValue.textContent = newScale.toFixed(2) + 'x';
    prevCoords = null;
    console.log('Scale changed to:', OUTFIT_SCALE);
  }
  
  slider.addEventListener('input', (e) => {
    updateScale(e.target.value);
  });
  
  resetButton.addEventListener('click', () => {
    OUTFIT_SCALE = 1.5;
    slider.value = '1.5';
    scaleValue.textContent = '1.50x';
    prevCoords = null;
    console.log('Reset to 1.5');
  });
}

// Camera initialization (single block, only call setupPoseLandmarker once)
navigator.mediaDevices.getUserMedia({
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 }
  }
}).then(stream => {
  videoElement.srcObject = stream;
  videoElement.onloadedmetadata = () => {
    setupPoseLandmarker();
  };
}).catch(err => {
  return navigator.mediaDevices.getUserMedia({ video: true });
}).then(stream => {
  if (stream) {
    videoElement.srcObject = stream;
    videoElement.onloadedmetadata = () => {
      setupPoseLandmarker();
    };
  }
}).catch(err => {
  console.error('Camera failed:', err);
});

async function setupPoseLandmarker() {
  vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm/'
  );
  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-tasks/pose_landmarker/pose_landmarker_full.task',
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numPoses: 4, // Detect up to 4 people
    minPosePresenceConfidence: 0.3,
    minTrackingConfidence: 0.3,
    minPoseDetectionConfidence: 0.3,
    outputSegmentationMasks: false,
  });
  running = true;
  requestAnimationFrame(processFrame);
}


async function processFrame() {
  if (!running) return;
  const now = performance.now();
  if (now - lastFrameTime < 1000 / TARGET_FPS) {
    requestAnimationFrame(processFrame);
    return;
  }
  lastFrameTime = now;
  if (videoElement.readyState < 2) {
    requestAnimationFrame(processFrame);
    return;
  }
  // Draw video frame to canvas
  setupCanvasForImage(videoElement);
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

  // Run pose detection
  const results = await poseLandmarker.detectForVideo(videoElement, now);
  if (!results || !results.landmarks || results.landmarks.length === 0) {
    prevCoords = null;
    requestAnimationFrame(processFrame);
    return;
  }

    const currentSet = outfitSets[currentSetIndex];
    // For each detected person
    results.landmarks.forEach((landmarks, personIdx) => {
      // Use a separate prevCoords for each person
      if (!prevCoords) prevCoords = {};
      if (!prevCoords[personIdx]) prevCoords[personIdx] = {};
      // Torso
      if (currentSet.torso && outfitImages[`${currentSetIndex}_torso`]) {
        overlayImageOnCanvasMulti(outfitImages[`${currentSetIndex}_torso`], landmarks, false, prevCoords[personIdx]);
      }
      // Head
      if (currentSet.head && outfitImages[`${currentSetIndex}_head`]) {
        overlayImageOnCanvasMulti(outfitImages[`${currentSetIndex}_head`], landmarks, true, prevCoords[personIdx]);
      }
    });
    requestAnimationFrame(processFrame);
  }

setTimeout(() => {
  const buttonsExist = document.getElementById('outfit-buttons');
  if (!buttonsExist) {
    createOutfitButtons();
  }
}, 3000);
