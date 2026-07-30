# Changes I eventually want

## Smaller / more crucial changes

- Icons for all players slightly smaller. When they are all really big it makes the field feel small and condensed.
- link should switch to fieldview instead of field-view. Just change the link, you dont need to change the branding.
- Interface should work on mobile. It would probably work best if we tell the user to go into landscape mode. Im not sure how customizable it is but we could make it so that the model takes up most of the screen, and the settings are accessible via a dropdown or hamburger menu. Mobile use will be a large part of the use case, ie people pulling it up at practice etc.
  - Actually (new idea later in the day) we should just have the field go verticle on mobile with the offense attacking upwards. This is actually probably more intuitive for mobile.
  - New update (even later), now that I have decided to overhaul the ui (see that section), i want to come up with a mobile alternative to the multi-column desktop layout. You choose.

## Longer term/ larger changes
- I think that the overall ui and interface could be overhauled to look and function better
- Complete overhaul of the play design system (see section Field-View Layout & Functionality Architecture)

## New features
- Throws:
  - Currently, one player on offense is a designated thrower and a defender is the designated mark. This needs to be remodeled.
  - There should be an option to select an offensive player and have the disk be "thrown" to them. Initially this can just be that the disk appears at the reciever, who becomes the new thrower. Closest defender/assigned defender becomes new mark.
    - Growth feature: Animate the disk traveling to receiver (this should be pretty simple in theory)
- Automatic player movement
  - My vision for this is to have a setting that allows the defense to automatically track offensive players. 
    - Would be a convenience feature
    - User clicks an offensive player and then clicks a spot on the field for said player to move to. Offensive player moves to spot using proper calculated motion physics (ie acceleration, top speed, etc)
      - Growth feature for this: two part cuts: user can click multiple places, offensive player cuts to point a then point b etc. Proper acceleration/slowdown physics involved. This alows offensive player to "set up" cuts and get defender out of position.
    - Assigned defender automatically follows offensive player
      - Potential growth feature down the road would be to have the defender be more variable, ie if there are two defenders nearby, instead of just the closest one, the one that is in the best position to guard the cut. For example, if the offense sprints underneath towards the thrower, and there were two defenders, one (the closer one) deeper on the cutter, and the other (slightly further) was underneath and much closer to the cutting lane, the underneath defender would follow the cut. 
      - Physics and calculations would be involved. Defender would probably have some amount of reaction time, and would also have to have acceleration and deceleration delays etc. Defender also has to react to changes in direction from offense (ie the two-part cut system).
      - For realism, we would probably not want to have the defender purely move towards the offensive player in terms of pathfinding.
        - For example, if defense is like 10 yards deeper then cutter, and cutter cuts deep, the defense wouldnt want to start moving towards cutter as cutter approaches, defense would want to A) allow offense to close down the gap, B) Begin acceleration deep in order to carry cut deep, and C) match any horizontal movement.
    - I imagine that other games or existing things have pathfinding/ai algorithms that are already well developed and could be used here.
- Much improved play designer (probably in conjunction with the above feature)
  - Dedicated page that is probably laid out differently from main fieldview page
  - User manually creates frames. Each frame creates a new field model. Eeach new model is a copy of the previous state. User can move around players in the new frame. When satisfied with new field state, creates next frame.
    - Each frame when played back has all its actions happen together. It is not based on the timing of the user's actions, each frame's actions happen simultaneously. 
    - For example: 
      - Frame 1: Starting from standard vert stack: #5 in stack cuts under towards open side
      - Frame 2: #5 clears to middle of stack, #4 cuts under into open side that #5 just left
      - Frame 3: Disk thrown from thrower to #4, #3 cuts deep as a continue option
      - Frame 4: Stack pushes downfield to reset spacing, reset handler clears to stack, #3 clears under to the breakside...
  - When user is satisfied with play, they save the play. Play can either be viewed in stills via the individual frames, or as an animation that animates between frames. 
    - Animation probably would have the actions on each frame play out, then a brief pause to demonstrate the end of that frame. It probably should not all be one continuous movement.




# Field-View Layout & Functionality Architecture

## 1. Global Layout & Aesthetic Overview
*   **Base Architecture:** A dense, data-rich three-pane layout consisting of a persistent left sidebar for global settings, a main central canvas, and a collapsible right sidebar.
*   **Field Orientation:** The main central canvas displays the playing field vertically (rather than horizontally) to provide a cleaner, more intuitive user perspective.
*   **Design System ("Light Film Room"):** The UI should utilize a minimal, grid-based aesthetic emphasizing clarity and precision.
    *   **Shapes:** Strict hard corners everywhere (zero border-radius).
    *   **Colors:** High contrast utilizing white (`#ffffff`) and light zinc/gray (`#f4f4f5`) for backgrounds, separated by crisp 1-pixel borders (`#d4d4d8`). The primary interactive and accent color is a dark pink (`#be185d`).
    *   **Typography:** Monospace fonts (like JetBrains Mono) for UI elements, buttons, and data labels; a bold geometric sans-serif for headers.

## 2. Left Sidebar (Contextual Command Center)
The left sidebar acts as the primary control panel. It uses a dynamic interface where the middle section's content changes based on what the user selects on the central field canvas.

### A. Always-Visible Top Ribbon
A fixed top section containing a 2x2 grid of buttons (each with an icon and caption) for global tools:
1.  **Marquee Selection:** Allows the user to click and drag to select multiple players at once.
2.  **Throw to Player:** When clicked, sets the state to "throwing". The user then clicks an offensive player on the field, and the disc is "thrown" from the current thrower to that selected offensive player.
3.  **Toggle Advanced Stats View:** A toggle button. When active, it completely overrides the variable middle section of the sidebar, populating it instead with advanced statistical metrics (distance, flight time, space rating, etc.).
4.  **Toggle Space View:** Toggles the space viewer feature overlay on the main field canvas.

### B. Variable Content (Middle Section)
This section listens to the canvas selection state and populates settings accordingly:
*   **Default (No Players or Multiple Players Selected):** Displays global toggles to show/hide the Offense and show/hide the Defense.
*   **Offensive Player Selected:** Displays options and route assignments specific to the selected offensive player.
*   **Defensive Player Selected:**
    *   **Matchup Assignment:** A dropdown/selector to assign the defender to a specific offensive player (defaults to an automatically assigned default player).
    *   *Swap Logic:* If the user changes this assignment, the defensive player previously assigned to that specific offensive player is automatically reassigned to the original defender's player (a 1-to-1 swap).
    *   **Toggle Assignment Off (Free Roam):** An option to assign the defender to "no players." This gives the user total freedom to set up the field manually without automated tracking or intervention.
*   **The Mark Selected:**
    *   **Force Sides:** Toggles for Flat, Flick, and Backhand.
    *   **Force Angles:** Toggles for Inside, Around, and Default (applicable to each force side).

### C. Bottom System Menus
*   **Advanced Settings:** A menu button at the bottom of the sidebar. Clicking it slides an advanced settings panel *up* to populate the left sidebar. This contains global sliders and configurations for player movement, calculations, physics, etc.
*   **Play Designer Button:** A prominent button that opens the Play Designer module, which slides out as a dedicated right-hand sidebar.

## 3. Right Sidebar (Play Designer Module)
The Play Designer is a dedicated timeline and animation module that slides out from the right side of the screen. It is built on a frame-based state system, heavily inspired by the layers panel in Adobe Photoshop.

### A. Frame Creation & State Architecture
*   The play is built sequentially. Users manually create "frames."
*   Each new frame generates a new field model that is an exact copy of the previous state.
*   The user moves players and the disc around in the new frame to define the next step of the play. When satisfied, they create the next frame.
*   **Simultaneous Resolution:** The animation is *not* based on the real-time timing of the user's manual drag-and-drop actions. Instead, when played back, all actions recorded within a single frame happen simultaneously on the field.

### B. Frame Management UI (Layer Metaphor)
*   The sidebar displays a vertical list of frames (acting like layers).
*   Users can switch between frames by clicking them (which populates the center canvas with that frame's state), create new frames, lock frames (preventing edits), and delete frames.
*   **Action Lists:** Clicking a dropdown arrow on a specific frame expands it to show a detailed list of all actions occurring within that frame (e.g., "cutter #4 from location a -> b", "disc thrown to player #5"). Users can delete these individual actions directly from the list.

### C. Playback & Visualization
*   The sidebar contains playback controls (Play, Next Frame, Previous Frame).
*   **Animation Style:** When playing the full animation, the simultaneous actions of a frame play out, followed by a brief pause to clearly demonstrate the end state of that frame, before moving to the next. It is not one continuous, unbroken movement.
*   **Growth Idea (Future Scope):** Render UI markers (like SVG arrows or paths) directly on the field canvas to visualize player movements and cuts between the current frame and the next.

### D. Play Creation Example
*   **Frame 1:** Starting from standard vert stack: #5 in stack cuts under towards open side.
*   **Frame 2:** #5 clears to middle of stack, #4 cuts under into open side that #5 just left.
*   **Frame 3:** Disc thrown from thrower to #4, #3 cuts deep as a continue option.
*   **Frame 4:** Stack pushes downfield to reset spacing, reset handler clears to stack, #3 clears under to the breakside.

### E. Saving & Export Options
*   Users can save the completed play. Saved plays can be viewed as an animation or as a series of stills corresponding to the individual frames.
*   **Export Data:** Export the full play as a compatible data file (e.g., JSON) that can be used to re-import and repopulate the site with the exact same play state.
*   **Export Visuals:** Download the frames as a multi-page PDF document to view each frame sequentially as stills.