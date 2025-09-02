// js/physics.js

import { Matter } from './matter-alias.js';
// Aliases for Matter.js modules
const { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint } = Matter;

// Create engine and renderer
const engine = Engine.create();
const world = engine.world;
const render = Render.create({
    element: document.body,
    engine: engine,
    options: {
        width: window.innerWidth,
        height: window.innerHeight,
        wireframes: false,
        background: '#1a1a1a'
    }
});

const runner = Runner.create();

// Create a master composite to hold user-created composites, separate from the main world
const masterComposite = Composite.create({ label: 'Master Composite' });

/**
 * Sets up the initial scene with walls and some basic objects.
 */
function setupScene() {
    // Add initial bodies for demonstration
    const initialBodies = [
        Bodies.circle(window.innerWidth / 2 - 200, 200, 30, { render: { fillStyle: '#4285F4' } }),
        Bodies.rectangle(window.innerWidth / 2, 150, 50, 50, { render: { fillStyle: '#DB4437' } }),
        Bodies.polygon(window.innerWidth / 2 + 200, 200, 3, 30, { render: { fillStyle: '#0F9D58' } })
    ];
    Composite.add(world, initialBodies);

    // Add boundary walls
    const wallOptions = { isStatic: true, render: { fillStyle: '#444' } };
    const wallThickness = 60;
    Composite.add(world, [
        Bodies.rectangle(window.innerWidth / 2, window.innerHeight - (wallThickness / 2), window.innerWidth, wallThickness, wallOptions),
        Bodies.rectangle(window.innerWidth / 2, (wallThickness / 2), window.innerWidth, wallThickness, wallOptions),
        Bodies.rectangle((wallThickness / 2), window.innerHeight / 2, wallThickness, window.innerHeight, wallOptions),
        Bodies.rectangle(window.innerWidth - (wallThickness / 2), window.innerHeight / 2, wallThickness, window.innerHeight, wallOptions)
    ]);

    // Add the master composite to the world
    Composite.add(world, masterComposite);
    world.label = 'World';
}

/**
 * Initializes and returns the mouse constraint for the canvas.
 * @returns {Matter.MouseConstraint}
 */
function setupMouseConstraint() {
    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: {
            stiffness: 0.2,
            render: { visible: false }
        }
    });
    Composite.add(world, mouseConstraint);
    return mouseConstraint;
}

export { engine, world, render, runner, masterComposite, setupScene, setupMouseConstraint };
