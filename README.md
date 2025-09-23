# AR Volunteer Outfit Selector for USACE

An advanced real-time AR project that overlays different volunteer outfits onto people using their webcam. Choose between lifejacket, ranger, and volunteer outfits with the click of a button!

## Features
- **Multiple Outfit Sets**: Switch between 3 different outfit combinations
  - **Lifejacket**: Orange lifejacket for water safety
  - **Ranger**: Park ranger vest and hat
  - **Volunteer**: General volunteer vest and hat
- **Real-time Pose Detection**: Uses MediaPipe Pose for accurate body tracking
- **Smooth Position Tracking**: Advanced coordinate smoothing for stable overlays
- **Enhanced Positioning**: Improved torso and head overlay positioning using shoulder and hip landmarks
- **Interactive UI**: Click buttons to switch between outfit sets
- **Web-based**: Runs entirely in the browser, no installation required

## Built With
- **MediaPipe Pose** - Real-time body landmark detection
- **JavaScript ES6+** - Modern web development
- **HTML5 Canvas** - High-performance graphics rendering
- **CSS3** - Responsive UI design
- **GitHub Pages** - Free web hosting

## How It Works
1. **Camera Access**: Captures live webcam feed
2. **Pose Detection**: Uses MediaPipe to detect body landmarks (shoulders, hips, etc.)
3. **Outfit Overlay**: Dynamically positions and scales outfit images based on body proportions
4. **Smooth Tracking**: Applies coordinate smoothing for stable, jitter-free overlays
5. **Multi-outfit Support**: Allows real-time switching between different outfit sets

## How to Use
1. **Visit**: Open https://usaceswosu.github.io/AR_VolunteerOutfit/
2. **Allow Permissions**: Grant camera access when prompted
3. **Position Yourself**: Step into view of the camera
4. **Switch Outfits**: Click the buttons on the right to change outfit sets
5. **Enjoy**: Watch as different volunteer outfits are overlaid in real-time!

## Technical Improvements
This version integrates advanced features from the ARLifejackets project:
- Enhanced pose detection with configurable scaling
- Multi-person support framework (ready for future expansion)
- Improved overlay positioning using multiple body landmarks
- Coordinate smoothing for stable tracking
- Modular outfit system for easy additions
