// js/actions.js
import { Matter } from './matter-alias.js';
import state from './state.js';
import { findParentComposite } from './interaction.js';
import { masterComposite, world } from './physics.js';

const { Composite, Body } = Matter;

let uiFuncs;
let newCompositeCounter = 1; // A simple, robust counter for NEW composites

/**
 * Initializes the actions module with necessary UI functions.
 */
export function initActions(funcs) {
    uiFuncs = funcs;
}

/**
 * Creates a new, empty composite with a guaranteed unique name.
 */
export function addComposite() {
    const newLabel = `New Composite ${newCompositeCounter++}`;
    const newComposite = Composite.create({ label: newLabel });
    Composite.add(masterComposite, newComposite);
    uiFuncs.updateCompositeLists();
}

/**
 * Deletes the currently selected composite and all of its contents.
 */
export function deleteComposite() {
    if (state.selectedComposite) {
        // The 'true' recursively removes all children (bodies, constraints) from the world.
        Composite.remove(masterComposite, state.selectedComposite, true);
        uiFuncs.deselectAll();
    }
}

/**
 * Deletes the currently selected object.
 */
export function deleteObject() {
    if (state.selectedObject) {
        const parent = findParentComposite(state.selectedObject) || world;
        Composite.remove(parent, state.selectedObject);
        uiFuncs.deselectAll();
    }
}

/**
 * Deletes the currently selected constraint.
 */
export function deleteConstraint() {
    if (state.selectedConstraint) {
        const parent = findParentComposite(state.selectedConstraint) || world;
        Composite.remove(parent, state.selectedConstraint);
        uiFuncs.deselectAll();
    }
}

/**
 * Removes the selected object or constraint from its parent composite.
 */
export function removeFromComposite() {
    const itemToRemove = state.selectedObject || state.selectedConstraint;
    if (!itemToRemove) {
        uiFuncs.showMessage("No object or constraint selected to remove.", 'error');
        return;
    }

    const parentComposite = findParentComposite(itemToRemove);
    if (parentComposite && parentComposite !== world) {
        // Move the item from its current parent composite back to the main world
        Composite.move(parentComposite, [itemToRemove], world);
        uiFuncs.deselectAll();
        uiFuncs.showMessage(`${itemToRemove.type.charAt(0).toUpperCase() + itemToRemove.type.slice(1)} removed from composite.`, 'success');
    } else {
        uiFuncs.showMessage('Item is not in a user-created composite.', 'error');
    }
}

/**
 * Assigns the currently selected object or constraint to a target composite.
 */
export function assignToComposite(targetCompositeId) {
    const itemToMove = state.selectedObject || state.selectedConstraint;
    if (!itemToMove) {
        uiFuncs.showMessage('No object or constraint selected.', 'error');
        return;
    }
    const targetId = parseInt(targetCompositeId, 10);
    if (!isNaN(targetId)) {
        const targetComposite = Composite.get(masterComposite, targetId, 'composite');
        const parentComposite = findParentComposite(itemToMove);

        if (parentComposite && targetComposite) {
            if (parentComposite !== targetComposite) {
                Composite.move(parentComposite, [itemToMove], targetComposite);
                uiFuncs.showMessage(`${itemToMove.type.charAt(0).toUpperCase() + itemToMove.type.slice(1)} assigned to composite.`, 'success');
                uiFuncs.deselectAll();
            } else {
                uiFuncs.showMessage('Item is already in the selected composite.', 'info');
            }
        } else {
            uiFuncs.showMessage('Error: Could not determine parent or target composite.', 'error');
        }
    } else {
        uiFuncs.showMessage('Please select a composite to assign to.', 'info');
    }
}

/**
 * Creates a compound body from the currently selected bodies.
 */
export function createCompoundBody() {
    const bodiesToCompound = state.selectionGroup.filter(item => item.type === 'body');
    if (bodiesToCompound.length < 2) {
        uiFuncs.showMessage('Select at least two bodies to create a compound body.', 'error');
        return;
    }

    const parentContainer = findParentComposite(bodiesToCompound[0]);
    if (!parentContainer) {
         uiFuncs.showMessage('Could not determine a common container for the selected bodies.', 'error');
         return;
    }

    for (let i = 1; i < bodiesToCompound.length; i++) {
        if (findParentComposite(bodiesToCompound[i]) !== parentContainer) {
            uiFuncs.showMessage('All selected bodies must be in the same container to be combined.', 'error');
            return;
        }
    }
    
    const constraintsToUpdate = [];
    const allConstraints = Composite.allConstraints(parentContainer);
    for (const constraint of allConstraints) {
        if (bodiesToCompound.includes(constraint.bodyA) || bodiesToCompound.includes(constraint.bodyB)) {
            constraintsToUpdate.push(constraint);
        }
    }

    const compoundBody = Body.create({
        parts: bodiesToCompound,
        isStatic: false
    });

    for (const constraint of constraintsToUpdate) {
        if (bodiesToCompound.includes(constraint.bodyA)) constraint.bodyA = compoundBody;
        if (bodiesToCompound.includes(constraint.bodyB)) constraint.bodyB = compoundBody;
    }

    Composite.add(parentContainer, compoundBody);
    uiFuncs.showMessage(`Compound body created with ID ${compoundBody.id}.`);
    uiFuncs.deselectAll();
}

/**
 * Breaks apart a selected compound body into its original parts.
 */
export function breakCompoundBody() {
    if (!state.selectedObject || state.selectedObject.parts.length <= 1) {
        uiFuncs.showMessage('No compound body selected to break apart.', 'error');
        return;
    }

    const compound = state.selectedObject;
    const parentContainer = findParentComposite(compound);
    const parts = compound.parts.slice(1);

    Composite.remove(parentContainer, compound);

    parts.forEach(part => {
        part.collisionFilter.group = 0;
        Composite.add(parentContainer, part);
    });

    uiFuncs.showMessage(`Compound body ${compound.id} broken apart.`);
    uiFuncs.deselectAll();
}