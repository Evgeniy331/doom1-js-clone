# Doom1 JS Clone

This project aims to recreate the **first level** of the classic 1993 FPS game *Doom* using plain JavaScript and HTML5 canvas.  The goal is to build a simple 2.5‑D ray‑casting engine from the ground up without relying on any existing Doom engines or libraries, gradually adding features and functionality in small, incremental steps.

## Development Approach

The implementation will be developed over multiple commits, each focusing on a specific aspect of the engine or game logic.  This commit history is intended to be educational and transparent so that interested developers can follow along with the progression from a blank slate to a playable first level.

## Technologies Used

- **JavaScript** – The primary language used to implement the ray‑casting engine, input handling, and game logic.
- **HTML5 Canvas** – Used to render the 2.5‑D world and HUD.
- **CSS** – Minimal styling for the page and canvas.

## Getting Started

To run the game locally:

1. Clone the repository:

   ```bash
   git clone https://github.com/<your-username>/doom1-js-clone.git
   cd doom1-js-clone
   ```

2. Open `index.html` in your favourite browser.  No build step is required.

As the project progresses, additional instructions may be added here to account for asset generation, texture loading, and other requirements.

## Controls

- **W / Arrow Up** – Move forward
- **S / Arrow Down** – Move backward
- **A / Arrow Left** – Rotate left
- **D / Arrow Right** – Rotate right
- **Q / E** – Strafe left/right
- **Space** – Open a door directly in front of you (doors are marked in the map and start closed)

Collision detection and simple door interaction have been implemented to make exploration possible.  More features will be added in subsequent commits.

## License

This project is provided under the MIT License.  See `LICENSE` for details.
