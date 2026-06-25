# HonkerWorks Landing Page v0.2

This is the static, high-performance landing page for **honkerworks.com** hosted on GitHub Pages. It presents HonkerWorks as an independent research and engineering laboratory focused on exploring software systems, programming language tooling, decentralized protocols, and epistemic engines.

## Folder Structure

All assets are built using pure vanilla technologies to ensure maximum speed and compatibility:

*   [`index.html`](file:///wsl.localhost/Ubuntu-24.04/root/programming/honkerworks/index.html) - Structural framework, including the dynamic 4-phase questionnaire, comic grids, project logbooks, and contact information.
*   [`styles.css`](file:///wsl.localhost/Ubuntu-24.04/root/programming/honkerworks/styles.css) - Premium dark-mode lab aesthetics, glassmorphic layout structures, neon yellow/gold accent highlights, and responsive media query breakpoints.
*   [`script.js`](file:///wsl.localhost/Ubuntu-24.04/root/programming/honkerworks/script.js) - Coordinates the visitor state machine (localStorage integration) and ports the mathematical vector field background animation engine.

---

## Banana Mode Adaptation Notes

### Source Location in Zenchor App
The "Banana Mode" effect was extracted from the **Zenchor** repository (`zenchor2`):
1.  **UI Controller Toggle**: Located in [`layout.cljs`](file:///wsl.localhost/Ubuntu-24.04/root/programming/repo/zenchor2/src/main/app/ui/layout.cljs#L491-L498), where a button labeled `🍌 ON` / `🍌 OFF` and titled `"Toggle 'Go Bananas'"` was discovered. It mounts a `#bg-canvas` fixed in the background of the main site frame.
2.  **Animation Engine**: Located in [`computational-design.js`](file:///wsl.localhost/Ubuntu-24.04/root/programming/repo/zenchor2/resources/public/js/computational-design.js), running 15 mathematical vector field modes: `tessellation`, `marbling`, `cellular`, `spiral`, `fractal`, `orbit`, `magnetic`, `quantum`, `mandala`, `chaos`, `boids`, `springs`, `nebula`, `interference`, and `kaleidoscope`.

### Modifications and Optimizations for HonkerWorks
To adapt this system to a high-speed landing page, we made the following improvements:
*   **Palette Branding**: Confined the default random hues (`0-360`) to the yellow-gold range (`45-65`) to fit the "Banana Mode" aesthetic and project theme.
*   **Performance Scaling**: Reduced particle counts from 800 (Zenchor default) to **300 on desktop** and **120 on mobile** to prevent mobile devices from pegging CPU cycles while ensuring the background remains visually dense.
*   **Reduced Motion Support**: Hooked a CSS media listener to `prefers-reduced-motion: reduce` in `script.js` to immediately stop the canvas calculation loops when visitors have animation preferences disabled.
*   **Literal Banana Easter-Egg**: Added a hidden feature! Double-clicking the floating `🍌 ON` button (or pressing the keyboard key **`b`** inside the page) switches particles into actual `🍌` emojis flowing along the active vector fields.
*   **Unified Delivery**: Consolidated the script files into one single lightweight `script.js` file to eliminate duplicate HTTP requests.

---

## Comic Placeholders

The Cucumbergeddon comic and HonkerWorks explanations contain placeholder panels. To replace these with final image assets:

1.  **Cucumbergeddon Comic (Intro Stage)**:
    Open [`index.html`](file:///wsl.localhost/Ubuntu-24.04/root/programming/honkerworks/index.html#L52-L99) and replace the text content in the `<div class="comic-panel">` tags with `<img>` elements pointing to your cropped assets:
    ```html
    <!-- Example Replacement -->
    <div class="comic-panel">
        <span class="panel-num">Panel 1</span>
        <img src="assets/cucumbergeddon_panel_1.png" alt="Cucumbergeddon panel 1" class="comic-img">
        <div class="panel-script">
            <strong>Caption</strong>: "It arrived without warning: The Cucumbergeddon."
        </div>
    </div>
    ```

2.  **HonkerWorks Comic (Main Page Tab & Intro Option)**:
    Open [`index.html`](file:///wsl.localhost/Ubuntu-24.04/root/programming/honkerworks/index.html#L118-L165) (Intro Phase 3A) and [`index.html`](file:///wsl.localhost/Ubuntu-24.04/root/programming/honkerworks/index.html#L380-L427) (Main page tab) and replace panels with corresponding images.

---

## Local Preview Instructions

You can view the landing page locally by running any standard static server:

### Option A: Node.js (Recommended)
From the project directory `honkerworks/`, run:
```bash
npx serve
```
Then open `http://localhost:3000` in your web browser.

### Option B: Python
From the project directory `honkerworks/`, run:
```bash
python -m http.server 8000
```
Then open `http://localhost:8000` in your web browser.

---

## GitHub Pages Deployment Instructions

To host the site on GitHub Pages:

1.  **Create a Git Repository**:
    Initialize Git in the `honkerworks/` directory:
    ```bash
    git init
    git checkout -b main
    git add .
    git commit -m "feat: initial commit of HonkerWorks lab landing page"
    ```

2.  **Push to GitHub**:
    Create a new blank repository on GitHub named `honkerworks` (or matching your organization details) and run:
    ```bash
    git remote add origin https://github.com/<your-username-or-org>/<repo-name>.git
    git push -u origin main
    ```

3.  **Enable GitHub Pages**:
    *   Go to your repository settings page on GitHub.
    *   Navigate to **Pages** in the left side-bar menu.
    *   Under **Build and deployment**, select **Deploy from a branch**.
    *   Select `main` (or the branch you pushed) and `/root` as the folder source, then click **Save**.
    *   Within 1-2 minutes, your website will be live at `https://<your-username-or-org>.github.io/<repo-name>/`.
