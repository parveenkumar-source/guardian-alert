

## Plan: Animated Step-by-Step Visual Demos for Self-Defense Techniques

Since we cannot generate actual video/GIF content within the app, the best approach is to create **animated visual demonstrations** using framer-motion that walk users through each technique step-by-step — like an animated slideshow/flipbook with illustrated frames per step.

### Approach: CSS/SVG Animated Step Demos

Replace the static image with an interactive **animated demo player** that:
1. Shows the existing illustration as the base
2. Adds a **step-by-step animation player** overlay with play/pause, auto-advance
3. Each step highlights with a numbered overlay animation on the image
4. Progress bar shows current step position
5. Users can tap through steps or let it auto-play

### Changes

**1. Create `src/components/self-defense/AnimatedDemo.tsx`**
- A new component that takes the technique's image and steps
- Displays the image with an animated overlay that cycles through steps
- Includes play/pause button, step indicator dots, and a progress bar
- Auto-plays through steps with ~3s per step, pauses on tap
- Each step shows a numbered badge + short text overlay on the image
- Smooth transitions between steps using framer-motion

**2. Update `src/components/self-defense/TechniqueCard.tsx`**
- Replace the static `<img>` block with the new `<AnimatedDemo>` component
- Add a toggle between "View Image" and "Watch Demo" modes using tabs
- Keep the static image as a fallback/default view

**3. Update `src/pages/SelfDefense.tsx`**
- No structural changes needed — the Technique interface stays the same
- The demo player works with existing data (image + steps)

### UI Details
- **Demo player**: Dark overlay on image with step text, auto-advancing with a circular progress indicator
- **Controls**: Play/Pause button, Previous/Next step arrows, step dots
- **Responsive**: Full-width on mobile, constrained on desktop
- **Accessibility**: Step text always visible, controls are keyboard-accessible

