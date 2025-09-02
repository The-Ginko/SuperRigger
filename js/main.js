// js/main.js
import { Matter } from './matter-alias.js';
import { engine, world, render, runner, setupScene, setupMouseConstraint, masterComposite } from './physics.js';
import { initUI, updateConstraintList, updateCompositeLists, updateSelectionVisuals } from './ui.js';
import { initInteractions } from './interaction.js';
import { loadComposite } from './serialization.js';

const { Composite, Events } = Matter;

/**
 * Main initialization function for the application.
 */
function init() {
    // Setup the basic physics world and objects
    setupScene();
    const mouseConstraint = setupMouseConstraint();

    // Initialize UI elements and their event listeners
    initUI(engine);
    
    // Initialize canvas mouse interactions
    initInteractions();

    // Custom rendering for selections
    Events.on(render, 'afterRender', () => {
        // This is a good place for custom drawing on the canvas after Matter.js has rendered
        // For now, selection visuals are handled by changing body/constraint render properties.
    });

    // Handle window resizing
    window.addEventListener('resize', () => {
        render.canvas.width = window.innerWidth;
        render.canvas.height = window.innerHeight;
        render.options.width = window.innerWidth;
        render.options.height = window.innerHeight;
    });
    
    // Initial population of UI lists
    updateCompositeLists();
    updateConstraintList();
}

// Start the application once the window is loaded
document.addEventListener('DOMContentLoaded', () => {
    init();
});
