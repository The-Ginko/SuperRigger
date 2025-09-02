import { Matter } from './matter-alias.js';
import state from './state.js';
import { showMessage, updateCompositeLists } from './ui.js';
import { deselectAll, findParentComposite } from './interaction.js';
import { masterComposite, world } from './physics.js';

const { Composite, Body } = Matter;

/**
 * Creates a new, empty composite in the master composite.
 */
export function addComposite() {
    const newComposite = Composite.create({ label: `Composite ${masterComposite.composites.length + 1}` });
    Composite.add(masterComposite, newComposite);
    updateCompositeLists(masterComposite);
}

/**
 * Deletes the currently selected composite.
 */
export function deleteComposite() {
    if (state.selectedComposite) {
        Composite.remove(masterComposite, state.selectedComposite);
        deselectAll();
    }
}

/**
 * Removes the selected object or constraint from its parent composite.
 */
export function removeFromComposite() {
    const itemToRemove = state.selectedObject || state.selectedConstraint;
    if (!itemToRemove) {
        showMessage("No object or constraint selected to remove.", 'error');
        return;
    }

    const parentComposite = findParentComposite(itemToRemove);
    if (parentComposite && parentComposite !== world) {
        Composite.move(parentComposite, [itemToRemove], world);
        deselectAll();
        showMessage(`${itemToRemove.type.charAt(0).toUpperCase() + itemToRemove.type.slice(1)} removed from composite.`, 'success');
    } else {
        showMessage('Item is not in a user-created composite.', 'error');
    }
}

/**
 * Assigns the currently selected object or constraint to a target composite.
 * @param {string} targetCompositeId The ID of the composite to assign the item to.
 */
export function assignToComposite(targetCompositeId) {
    const itemToMove = state.selectedObject || state.selectedConstraint;
    if (!itemToMove) {
        showMessage('No object or constraint selected.', 'error');
        return;
    }

    if (targetCompositeId && targetCompositeId !== 'none') {
        const targetComposite = Composite.get(masterComposite, targetCompositeId, 'composite');
        const parentComposite = findParentComposite(itemToMove);

        if (parentComposite && targetComposite) {
            if (parentComposite !== targetComposite) {
                Composite.move(parentComposite, [itemToMove], targetComposite);
                showMessage(`${itemToMove.type.charAt(0).toUpperCase() + itemToMove.type.slice(1)} assigned to composite.`, 'success');
                deselectAll();
            } else {
                showMessage('Item is already in the selected composite.', 'info');
            }
        } else {
            showMessage('Error: Could not determine parent or target composite.', 'error');
        }
    } else {
        showMessage('Please select a composite to assign to.', 'info');
    }
}

/**
 * Creates a compound body from the currently selected bodies.
 */
export function createCompoundBody() {
    const bodiesToCompound = state.selectionGroup.filter(item => item.type === 'body');
    if (bodiesToCompound.length < 2) {
        showMessage('Select at least two bodies to create a compound body.', 'error');
        return;
    }

    const parentContainer = findParentComposite(bodiesToCompound[0]);
    if (!parentContainer) {
         showMessage('Could not determine a common container for the selected bodies.', 'error');
         return;
    }

    for (let i = 1; i < bodiesToCompound.length; i++) {
        if (findParentComposite(bodiesToCompound[i]) !== parentContainer) {
            showMessage('All selected bodies must be in the same container to be combined.', 'error');
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
    showMessage(`Compound body created with ID ${compoundBody.id}.`);
    deselectAll();
}

/**
 * Breaks apart a selected compound body into its original parts.
 */
export function breakCompoundBody() {
    if (!state.selectedObject || state.selectedObject.parts.length <= 1) {
        showMessage('No compound body selected to break apart.', 'error');
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

    showMessage(`Compound body ${compound.id} broken apart.`);
    deselectAll();
}

