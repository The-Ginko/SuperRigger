// js/interaction.js
import { Matter } from './matter-alias.js';
import state from './state.js';
import { showEditor, populateEditor, updateConstraintList, updateCompositeLists, updateCompoundUI, updateSelectionVisuals } from './ui.js';
import { masterComposite, world, render } from './physics.js';

const { Vector, Query, Bounds, Constraint, Composite, Events } = Matter;

/**
 * Finds the direct parent composite of a given body or constraint.
 * @param {Matter.Body|Matter.Constraint} item
 * @returns {Matter.Composite|null}
 */
export function findParentComposite(item) {
    if (item.type === 'body') {
        if (world.bodies.includes(item)) return world;
    } else if (item.type === 'constraint') {
        if (world.constraints.includes(item)) return world;
    }
    for (const comp of masterComposite.composites) {
        if (item.type === 'body' && Composite.allBodies(comp).includes(item)) return comp;
        if (item.type === 'constraint' && Composite.allConstraints(comp).includes(item)) return comp;
    }
    return null;
}

/**
 * Calculates the bounding box of a composite.
 * @param {Matter.Composite} composite
 * @returns {Matter.Bounds|null}
 */
export function getCompositeBounds(composite) {
    const bodies = Composite.allBodies(composite);
    if (bodies.length === 0) return null;
    const vertices = [];
    bodies.forEach(body => vertices.push(...body.vertices));
    return Bounds.create(vertices);
}

/**
 * Clears all selections.
 * @param {boolean} [keepSelectionGroup=false] - Whether to keep the multi-selection group.
 */
export function deselectAll(keepSelectionGroup = false) {
    state.selectedBodies = [];
    state.selectedConstraint = null;
    state.selectedObject = null;
    state.selectedComposite = null;
    if (!keepSelectionGroup) {
        state.selectionGroup = [];
    }
    showEditor('new');
    updateSelectionVisuals();
    updateCompositeLists();
    updateConstraintList();
    updateCompoundUI();
}

/**
 * Initializes all user interaction event listeners for the canvas.
 */
export function initInteractions() {
    render.canvas.addEventListener('mousedown', handleMouseDown);
    render.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Custom rendering for selection visuals
    Events.on(render, 'afterRender', () => {
        if (!state.selectedObject) return;
        const context = render.context;
        const geomCenterX = (state.selectedObject.bounds.min.x + state.selectedObject.bounds.max.x) / 2;
        const geomCenterY = (state.selectedObject.bounds.min.y + state.selectedObject.bounds.max.y) / 2;

        context.beginPath();
        context.arc(geomCenterX, geomCenterY, 5, 0, 2 * Math.PI);
        context.fillStyle = 'rgba(0, 255, 255, 0.7)';
        context.fill();

        context.beginPath();
        context.arc(state.selectedObject.position.x, state.selectedObject.position.y, 5, 0, 2 * Math.PI);
        context.fillStyle = 'rgba(255, 255, 0, 0.7)';
        context.fill();
    });
}

function distToSegment(p, v, w) {
    const l2 = Vector.magnitudeSquared(Vector.sub(w, v));
    if (l2 === 0) return Vector.magnitude(Vector.sub(p, v));
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projection = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
    return Vector.magnitude(Vector.sub(p, projection));
};

function handleMouseDown(event) {
    if (state.isBuildMode) return; // Build mode handled elsewhere

    const mousePosition = { x: event.offsetX, y: event.offsetY };
    const clickTolerance = 5;
    const isSameClick = state.lastClickPosition.x !== null &&
                        Vector.magnitude(Vector.sub(mousePosition, state.lastClickPosition)) < clickTolerance;

    let candidates = [];
    const allBodies = Composite.allBodies(world).concat(Composite.allBodies(masterComposite));
    candidates.push(...Query.point(allBodies, mousePosition));

    const allConstraints = Composite.allConstraints(world).concat(Composite.allConstraints(masterComposite));
    for (const constraint of allConstraints) {
        if (!constraint.bodyA || !constraint.bodyB) continue;
        if (distToSegment(mousePosition, constraint.bodyA.position, constraint.bodyB.position) < 10) {
            candidates.push(constraint);
        }
    }

    if (event.button === 0) { // Left-click
        if (candidates.length > 0) {
            state.candidateIndex = isSameClick ? (state.candidateIndex + 1) % candidates.length : 0;
            const selectedItem = candidates[state.candidateIndex];

            if (event.shiftKey) { // Multi-select
                const index = state.selectionGroup.indexOf(selectedItem);
                if (index === -1) state.selectionGroup.push(selectedItem);
                else state.selectionGroup.splice(index, 1);
                state.selectedObject = null;
                state.selectedConstraint = null;
                state.selectedComposite = null;
                showEditor('new');
            } else { // Single-select
                deselectAll();
                state.selectionGroup.push(selectedItem);
                
                if (selectedItem.type === 'body') {
                    const parentComposite = findParentComposite(selectedItem);
                    if (parentComposite && parentComposite !== world) {
                        state.selectedComposite = parentComposite;
                        state.selectedObject = selectedItem; 
                        showEditor('composite-child');
                        document.getElementById('composite-name-input').value = state.selectedComposite.label;
                        document.getElementById('composite-id-display').textContent = state.selectedComposite.id;
                    } else {
                        state.selectedObject = selectedItem;
                        showEditor('object');
                        populateEditor(selectedItem);
                    }
                } else if (selectedItem.type === 'constraint') {
                    const parentComposite = findParentComposite(selectedItem);
                     if (parentComposite && parentComposite !== world) {
                        state.selectedComposite = parentComposite;
                        state.selectedConstraint = selectedItem;
                        showEditor('composite-child');
                        document.getElementById('composite-name-input').value = state.selectedComposite.label;
                        document.getElementById('composite-id-display').textContent = state.selectedComposite.id;
                    } else {
                        state.selectedConstraint = selectedItem;
                        showEditor('constraint');
                        populateEditor(selectedItem);
                    }
                }
            }
        } else if (!event.shiftKey) {
            deselectAll();
        }

        state.lastClickPosition = { ...mousePosition };
        updateSelectionVisuals();
        updateCompoundUI();
    } else if (event.button === 2) { // Right-click for constraints
        const clickedBodies = Query.point(world.bodies, mousePosition);
        if (clickedBodies.length > 0) {
            const body = clickedBodies[0];
            const index = state.selectedBodies.indexOf(body);
            if (index === -1) {
                if (state.selectedBodies.length < 2) {
                    state.selectedBodies.push(body);
                    const point = event.ctrlKey ? Vector.sub(mousePosition, body.position) : { x: 0, y: 0 };
                    state.constraintPoints.push(point);
                }
            } else {
                state.selectedBodies.splice(index, 1);
                state.constraintPoints.splice(index, 1);
            }

            if (state.selectedBodies.length === 2) {
                const distance = Vector.magnitude(Vector.sub(state.selectedBodies[0].position, state.selectedBodies[1].position));
                const newConstraint = Constraint.create({
                    bodyA: state.selectedBodies[0],
                    bodyB: state.selectedBodies[1],
                    pointA: state.constraintPoints[0],
                    pointB: state.constraintPoints[1],
                    stiffness: 0.01, damping: 0.05, length: distance,
                    render: { strokeStyle: '#999', lineWidth: 2 }
                });
                Composite.add(world, newConstraint);
                state.selectedBodies = [];
                state.constraintPoints = [];
            }
            updateSelectionVisuals();
        }
    }
}

