// js/ui.js
import { Matter } from './matter-alias.js';
import state from './state.js';
import { deselectAll, findParentComposite, getCompositeBounds } from './interaction.js';
import { world, masterComposite } from './physics.js'; 

const { Body, Vertices, Vector, Composite, Bodies } = Matter;

let uiElements = {};
let actionFuncs;
let serializationFuncs;
let interactionFuncs;

/**
 * Shows the appropriate editor panel based on the current selection.
 */
export function showEditor(mode) {
    // Hide all editors first
    uiElements.constraintEditor.style.display = 'none';
    uiElements.objectEditor.style.display = 'none';
    uiElements.compositeEditor.style.display = 'none';
    uiElements.deleteConstraintBtn.style.display = 'none';
    uiElements.deleteObjectBtn.style.display = 'none';
    uiElements.deleteCompositeBtn.style.display = 'none';
    uiElements.breakCompoundBtn.style.display = 'none';
    uiElements.assignToCompositeSection.style.display = 'none';
    uiElements.removeFromCompositeBtn.style.display = 'none';
    document.getElementById('composite-editor-message').style.display = 'none';

    // Toggle save button based on selection
    uiElements.saveCompositeBtn.disabled = !state.selectedComposite;
    uiElements.saveCompositeBtn.style.opacity = state.selectedComposite ? 1 : 0.5;

    switch(mode) {
        case 'new':
            uiElements.uiTitle.textContent = "Editor";
            // No specific editor shown, but title is reset
            break;
        case 'constraint':
            uiElements.uiTitle.textContent = "Edit Constraint";
            uiElements.constraintEditor.style.display = 'block';
            uiElements.deleteConstraintBtn.style.display = 'block';
            uiElements.assignToCompositeSection.style.display = 'block';
            break;
        case 'object':
            uiElements.uiTitle.textContent = "Edit Object";
            uiElements.objectEditor.style.display = 'block';
            uiElements.deleteObjectBtn.style.display = 'block';
            uiElements.assignToCompositeSection.style.display = 'block';
            break;
        case 'composite':
            uiElements.uiTitle.textContent = "Edit Composite";
            uiElements.compositeEditor.style.display = 'block';
            uiElements.deleteCompositeBtn.style.display = 'block';
            break;
        case 'composite-child':
            uiElements.uiTitle.textContent = "Edit Composite";
            uiElements.compositeEditor.style.display = 'block';
            uiElements.removeFromCompositeBtn.style.display = 'block';
            document.getElementById('composite-editor-message').style.display = 'block';
            break;
    }
}

/**
 * Populates the editor panel with the properties of the selected item.
 */
export function populateEditor(item) {
    if (item.type === 'body') {
        const body = item;
        const isCompound = body.parts.length > 1;

        const sizeControlsDisabled = isCompound;
        uiElements.radius.disabled = sizeControlsDisabled;
        uiElements.width.disabled = sizeControlsDisabled;
        uiElements.height.disabled = sizeControlsDisabled;
        uiElements.polygonSize.disabled = sizeControlsDisabled;
        uiElements.comX.disabled = sizeControlsDisabled;
        uiElements.comY.disabled = sizeControlsDisabled;

        const isCircle = body.circleRadius > 0;
        const isRectangle = !isCircle && body.vertices.length === 4;
        
        document.getElementById('size-editor-circle').style.display = 'none';
        document.getElementById('size-editor-rect').style.display = 'none';
        document.getElementById('size-editor-polygon').style.display = 'none';

        if (isCircle) {
            document.getElementById('size-editor-circle').style.display = 'block';
            uiElements.radius.value = body.circleRadius;
        } else if (isRectangle && !isCompound) {
            document.getElementById('size-editor-rect').style.display = 'block';
            uiElements.width.value = body.bounds.max.x - body.bounds.min.x;
            uiElements.height.value = body.bounds.max.y - body.bounds.min.y;
        } else if (!isCompound) { 
            document.getElementById('size-editor-polygon').style.display = 'block';
            const size = Math.sqrt(body.area / (body.vertices.length === 3 ? 0.433 : 1));
            uiElements.polygonSize.value = size;
        }

        uiElements.isStatic.checked = body.isStatic;
        uiElements.angle.value = Math.round(body.angle * (180 / Math.PI)) % 360;
        uiElements.restitution.value = body.restitution;
        uiElements.friction.value = body.friction;
        uiElements.frictionStatic.value = body.frictionStatic;
        uiElements.frictionAir.value = body.frictionAir;
        uiElements.density.value = body.density;
        uiElements.posX.value = Math.round(body.position.x);
        uiElements.posY.value = Math.round(body.position.y);

        const geometricCenter = Vertices.centre(body.vertices);
        const offsetX = body.position.x - geometricCenter.x;
        const offsetY = body.position.y - geometricCenter.y;
        uiElements.comX.value = Math.round(offsetX);
        uiElements.comY.value = Math.round(offsetY);
        
        uiElements.group.value = body.collisionFilter.group;
        uiElements.category.value = body.collisionFilter.category;
        uiElements.mask.value = body.collisionFilter.mask;
        
        uiElements.assignToCompositeSection.style.display = 'block';
    } else if (item.type === 'constraint') {
        const constraint = item;
        uiElements.stiffness.value = constraint.stiffness;
        uiElements.damping.value = constraint.damping;
        uiElements.length.value = constraint.length;
        uiElements.constraintPointAX.value = constraint.pointA.x;
        uiElements.constraintPointAY.value = constraint.pointA.y;
        uiElements.constraintPointBX.value = constraint.pointB.x;
        uiElements.constraintPointBY.value = constraint.pointB.y;
        uiElements.assignToCompositeSection.style.display = 'block';
    } else if (item.type === 'composite') {
        const composite = item;
        document.getElementById('composite-id-display').textContent = composite.id;
        uiElements.compTranslateX.value = 0;
        uiElements.compTranslateY.value = 0;
        uiElements.compRotation.value = 0;
        uiElements.compScale.value = 1;
    }
    updateEditorLabels();
}

/**
 * Updates the text labels next to sliders and inputs.
 */
export function updateEditorLabels() {
    if (state.selectedObject) {
        document.getElementById('angle-value').textContent = Math.round(state.selectedObject.angle * (180 / Math.PI)) % 360;
        document.getElementById('restitution-value').textContent = state.selectedObject.restitution.toFixed(2);
        document.getElementById('friction-value').textContent = state.selectedObject.friction.toFixed(2);
        document.getElementById('friction-static-value').textContent = state.selectedObject.frictionStatic.toFixed(2);
        document.getElementById('friction-air-value').textContent = state.selectedObject.frictionAir.toFixed(3);
        document.getElementById('density-value').textContent = state.selectedObject.density.toFixed(3);
        if (state.selectedObject.circleRadius > 0) {
            document.getElementById('radius-value').textContent = Math.round(state.selectedObject.circleRadius);
        } else if (state.selectedObject.vertices.length === 4) {
            document.getElementById('width-value').textContent = Math.round(state.selectedObject.bounds.max.x - state.selectedObject.bounds.min.x);
            document.getElementById('height-value').textContent = Math.round(state.selectedObject.bounds.max.y - state.selectedObject.bounds.min.y);
        } else {
            const size = Math.sqrt(state.selectedObject.area / (state.selectedObject.vertices.length === 3 ? 0.433 : 1));
            document.getElementById('polygon-size-value').textContent = Math.round(size);
        }
    }
    if (state.selectedConstraint) {
        document.getElementById('stiffness-value').textContent = state.selectedConstraint.stiffness.toFixed(2);
        document.getElementById('damping-value').textContent = state.selectedConstraint.damping.toFixed(3);
        document.getElementById('length-value').textContent = Math.round(state.selectedConstraint.length);
    }
    if (state.selectedComposite) {
        document.getElementById('composite-rotation-value').textContent = Math.round(parseFloat(document.getElementById('composite-rotation').value));
        document.getElementById('composite-scale-value').textContent = parseFloat(document.getElementById('composite-scale').value).toFixed(2);
    }
}

/**
 * Updates the rendering of selected items.
 */
export function updateSelectionVisuals() {
    const allRenderable = Composite.allBodies(world).concat(Composite.allConstraints(world));
    
    // Reset all styles
    allRenderable.forEach(item => {
        if (item.render) {
            item.render.lineWidth = item.type === 'constraint' ? 2 : 1;
            item.render.strokeStyle = '#999';
        }
    });

    // Highlight bodies selected for constraint creation
    state.selectedBodies.forEach(body => { 
        if (body.render) {
            body.render.strokeStyle = '#F4B400'; 
            body.render.lineWidth = 3; 
        }
    });

    // Highlight multi-selection group
    if (state.selectionGroup.length > 1) {
        state.selectionGroup.forEach(item => {
            if (item.render) {
                item.render.strokeStyle = '#4285F4';
                item.render.lineWidth = 4;
            }
        });
    } else if (state.selectedObject) {
        const isCompound = state.selectedObject.parts.length > 1;
        const itemsToHighlight = isCompound ? state.selectedObject.parts : [state.selectedObject];
        itemsToHighlight.forEach(part => {
            if (part.render) {
                part.render.strokeStyle = isCompound ? '#DB4437' : '#F4B400';
                part.render.lineWidth = 4;
            }
        });
    } else if (state.selectedConstraint) {
        if (state.selectedConstraint.render) {
            state.selectedConstraint.render.strokeStyle = '#F4B400';
            state.selectedConstraint.render.lineWidth = 4;
        }
    }

    // Highlight a selected composite
    if (state.selectedComposite) {
        Composite.allBodies(state.selectedComposite).forEach(body => { 
            if (body.render && body !== state.selectedObject) {
                body.render.strokeStyle = '#0F9D58'; 
                body.render.lineWidth = 4; 
            }
        });
        Composite.allConstraints(state.selectedComposite).forEach(c => { 
            if (c.render && c !== state.selectedConstraint) {
                c.render.strokeStyle = '#0F9D58'; 
                c.render.lineWidth = 4; 
            }
        });
    }
}


/**
 * Populates the constraint dropdown list.
 */
export function updateConstraintList() {
    const allConstraints = Composite.allConstraints(world);
    uiElements.existingConstraintList.innerHTML = '<option value="new">Create New...</option>';
    allConstraints.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = `Constraint ${c.id}`;
        uiElements.existingConstraintList.appendChild(option);
    });
    uiElements.existingConstraintList.value = state.selectedConstraint ? state.selectedConstraint.id : 'new';
}


/**
 * Populates the composite dropdown lists.
 */
export function updateCompositeLists() {
    uiElements.compositeList.innerHTML = '<option value="none">World</option>';
    uiElements.assignCompositeList.innerHTML = '';
    
    masterComposite.composites.forEach(comp => {
        const option = document.createElement('option');
        option.value = comp.id;
        option.textContent = comp.label;
        uiElements.compositeList.appendChild(option);
        uiElements.assignCompositeList.appendChild(option.cloneNode(true));
    });

    uiElements.compositeList.value = state.selectedComposite ? state.selectedComposite.id : 'none';
}


/**
 * Updates the UI for creating/breaking compound bodies.
 */
export function updateCompoundUI() {
    const bodySelections = state.selectionGroup.filter(item => item.type === 'body');
    uiElements.createCompoundBtn.disabled = bodySelections.length < 2;

    const isCompound = state.selectedObject && state.selectedObject.parts.length > 1;
    uiElements.breakCompoundBtn.style.display = isCompound ? 'block' : 'none';
}

/**
 * Displays a temporary message to the user.
 * @param {string} text - The message to display.
 * @param {string} [type='success'] - 'success' or 'error'.
 */
export function showMessage(text, type = 'success') {
    uiElements.copyMessage.textContent = text;
    uiElements.copyMessage.style.backgroundColor = type === 'error' ? '#DB4437' : '#0F9D58';
    uiElements.copyMessage.style.opacity = 1;
    setTimeout(() => { uiElements.copyMessage.style.opacity = 0; }, 2000);
}

/**
 * Initializes all UI event listeners.
 */
export function initUI(engine, injectedActionFuncs, injectedSerializationFuncs, injectedInteractionFuncs) {
    actionFuncs = injectedActionFuncs;
    serializationFuncs = injectedSerializationFuncs;
    interactionFuncs = injectedInteractionFuncs;

    uiElements = {
        uiTitle: document.getElementById('ui-title'),
        constraintEditor: document.getElementById('constraint-editor'),
        objectEditor: document.getElementById('object-editor'),
        compositeEditor: document.getElementById('composite-editor'),
        assignToCompositeSection: document.getElementById('assign-to-composite-section'),
        deleteConstraintBtn: document.getElementById('delete-constraint-btn'),
        deleteObjectBtn: document.getElementById('delete-object-btn'),
        deleteCompositeBtn: document.getElementById('delete-composite-btn'),
        removeFromCompositeBtn: document.getElementById('remove-from-composite-btn'),
        createCompoundBtn: document.getElementById('create-compound-btn'),
        breakCompoundBtn: document.getElementById('break-compound-btn'),
        compositeNameInput: document.getElementById('composite-name-input'),
        compositeList: document.getElementById('composite-list'),
        assignCompositeList: document.getElementById('assign-composite-list'),
        addToCompositeBtn: document.getElementById('add-to-composite-btn'),
        addCompositeBtn: document.getElementById('add-composite-btn'),
        saveCompositeBtn: document.getElementById('save-composite-btn'),
        loadCompositeBtn: document.getElementById('load-composite-btn'),
        gravitySlider: document.getElementById('gravity-slider'),
        gravityValueSpan: document.getElementById('gravity-value'),
        copyMessage: document.getElementById('copy-message'),
        existingConstraintList: document.getElementById('existing-constraint-list'),
        isStatic: document.getElementById('is-static'),
        angle: document.getElementById('angle'),
        restitution: document.getElementById('restitution'),
        friction: document.getElementById('friction'),
        frictionStatic: document.getElementById('friction-static'),
        frictionAir: document.getElementById('friction-air'),
        density: document.getElementById('density'),
        posX: document.getElementById('position-x'),
        posY: document.getElementById('position-y'),
        comX: document.getElementById('com-offset-x'),
        comY: document.getElementById('com-offset-y'),
        radius: document.getElementById('radius'),
        width: document.getElementById('width'),
        height: document.getElementById('height'),
        polygonSize: document.getElementById('polygon-size'),
        group: document.getElementById('collision-group'),
        category: document.getElementById('collision-category'),
        mask: document.getElementById('collision-mask'),
        stiffness: document.getElementById('stiffness'),
        damping: document.getElementById('damping'),
        length: document.getElementById('length'),
        constraintPointAX: document.getElementById('constraint-point-ax'),
        constraintPointAY: document.getElementById('constraint-point-ay'),
        constraintPointBX: document.getElementById('constraint-point-bx'),
        constraintPointBY: document.getElementById('constraint-point-by'),
        compTranslateX: document.getElementById('composite-translate-x'),
        compTranslateY: document.getElementById('composite-translate-y'),
        compRotation: document.getElementById('composite-rotation'),
        compScale: document.getElementById('composite-scale')
    };

    // --- Physical Property Event Listeners ---
    uiElements.isStatic.addEventListener('change', () => { if (state.selectedObject) Body.setStatic(state.selectedObject, uiElements.isStatic.checked); });
    uiElements.angle.addEventListener('input', () => { if (state.selectedObject) Body.setAngle(state.selectedObject, parseFloat(uiElements.angle.value) * (Math.PI / 180)); updateEditorLabels(); });
    uiElements.restitution.addEventListener('input', () => { if (state.selectedObject) state.selectedObject.restitution = parseFloat(uiElements.restitution.value); updateEditorLabels(); });
    uiElements.friction.addEventListener('input', () => { if (state.selectedObject) state.selectedObject.friction = parseFloat(uiElements.friction.value); updateEditorLabels(); });
    uiElements.frictionStatic.addEventListener('input', () => { if (state.selectedObject) state.selectedObject.frictionStatic = parseFloat(uiElements.frictionStatic.value); updateEditorLabels(); });
    uiElements.frictionAir.addEventListener('input', () => { if (state.selectedObject) state.selectedObject.frictionAir = parseFloat(uiElements.frictionAir.value); updateEditorLabels(); });
    uiElements.density.addEventListener('input', () => { if (state.selectedObject) Body.setDensity(state.selectedObject, parseFloat(uiElements.density.value)); updateEditorLabels(); });
    uiElements.posX.addEventListener('input', () => { if (state.selectedObject) Body.setPosition(state.selectedObject, { x: parseFloat(uiElements.posX.value), y: state.selectedObject.position.y }); updateEditorLabels(); });
    uiElements.posY.addEventListener('input', () => { if (state.selectedObject) Body.setPosition(state.selectedObject, { x: state.selectedObject.position.x, y: parseFloat(uiElements.posY.value) }); updateEditorLabels(); });
    uiElements.comX.addEventListener('input', () => { if (state.selectedObject) { const newOffsetX = parseFloat(uiElements.comX.value) || 0; const currentOffsetY = parseFloat(uiElements.comY.value) || 0; Body.setCentre(state.selectedObject, { x: newOffsetX, y: currentOffsetY }, true); } });
    uiElements.comY.addEventListener('input', () => { if (state.selectedObject) { const newOffsetY = parseFloat(uiElements.comY.value) || 0; const currentOffsetX = parseFloat(uiElements.comX.value) || 0; Body.setCentre(state.selectedObject, { x: currentOffsetX, y: newOffsetY }, true); } });
    uiElements.radius.addEventListener('input', () => { if (state.selectedObject && state.selectedObject.circleRadius) { const newRadius = parseFloat(uiElements.radius.value); const oldRadius = state.selectedObject.circleRadius; if (oldRadius > 0) Body.scale(state.selectedObject, newRadius / oldRadius, newRadius / oldRadius); } updateEditorLabels(); });
    uiElements.width.addEventListener('input', () => { if (state.selectedObject && !state.selectedObject.circleRadius) { const newWidth = parseFloat(uiElements.width.value); const oldWidth = state.selectedObject.bounds.max.x - state.selectedObject.bounds.min.x; if (oldWidth > 0) Body.scale(state.selectedObject, newWidth / oldWidth, 1); } updateEditorLabels(); });
    uiElements.height.addEventListener('input', () => { if (state.selectedObject && !state.selectedObject.circleRadius) { const newHeight = parseFloat(uiElements.height.value); const oldHeight = state.selectedObject.bounds.max.y - state.selectedObject.bounds.min.y; if (oldHeight > 0) Body.scale(state.selectedObject, 1, newHeight / oldHeight); } updateEditorLabels(); });
    uiElements.polygonSize.addEventListener('input', () => { if (state.selectedObject && !state.selectedObject.circleRadius && state.selectedObject.vertices.length !== 4) { const newSize = parseFloat(uiElements.polygonSize.value); const currentSize = Math.sqrt(state.selectedObject.area / (state.selectedObject.vertices.length === 3 ? 0.433 : 1)); const scaleFactor = newSize / currentSize; if (currentSize > 0 && isFinite(scaleFactor)) { Body.scale(state.selectedObject, scaleFactor, scaleFactor); } } updateEditorLabels(); });
    uiElements.group.addEventListener('input', () => { if (state.selectedObject && !isNaN(parseInt(uiElements.group.value))) state.selectedObject.collisionFilter.group = parseInt(uiElements.group.value); });
    uiElements.category.addEventListener('input', () => { if (state.selectedObject && !isNaN(parseInt(uiElements.category.value))) state.selectedObject.collisionFilter.category = parseInt(uiElements.category.value); });
    uiElements.mask.addEventListener('input', () => { if (state.selectedObject && !isNaN(parseInt(uiElements.mask.value))) state.selectedObject.collisionFilter.mask = parseInt(uiElements.mask.value); });
    uiElements.stiffness.addEventListener('input', () => { if(state.selectedConstraint) state.selectedConstraint.stiffness = parseFloat(uiElements.stiffness.value); updateEditorLabels(); });
    uiElements.damping.addEventListener('input', () => { if(state.selectedConstraint) state.selectedConstraint.damping = parseFloat(uiElements.damping.value); updateEditorLabels(); });
    uiElements.length.addEventListener('input', () => { if(state.selectedConstraint) state.selectedConstraint.length = parseFloat(uiElements.length.value); updateEditorLabels(); });
    uiElements.constraintPointAX.addEventListener('input', () => { if(state.selectedConstraint) state.selectedConstraint.pointA.x = parseFloat(uiElements.constraintPointAX.value); });
    uiElements.constraintPointAY.addEventListener('input', () => { if(state.selectedConstraint) state.selectedConstraint.pointA.y = parseFloat(uiElements.constraintPointAY.value); });
    uiElements.constraintPointBX.addEventListener('input', () => { if(state.selectedConstraint) state.selectedConstraint.pointB.x = parseFloat(uiElements.constraintPointBX.value); });
    uiElements.constraintPointBY.addEventListener('input', () => { if(state.selectedConstraint) state.selectedConstraint.pointB.y = parseFloat(uiElements.constraintPointBY.value); });
    uiElements.compTranslateX.addEventListener('change', () => { if (state.selectedComposite) { const dx = parseFloat(uiElements.compTranslateX.value) || 0; if (dx !== 0) { Composite.translate(state.selectedComposite, { x: dx, y: 0 }); uiElements.compTranslateX.value = 0; } } });
    uiElements.compTranslateY.addEventListener('change', () => { if (state.selectedComposite) { const dy = parseFloat(uiElements.compTranslateY.value) || 0; if (dy !== 0) { Composite.translate(state.selectedComposite, { x: 0, y: dy }); uiElements.compTranslateY.value = 0; } } });
    uiElements.compRotation.addEventListener('input', () => { if (state.selectedComposite) { const bounds = getCompositeBounds(state.selectedComposite); if (!bounds) return; const center = { x: (bounds.min.x + bounds.max.x) / 2, y: (bounds.min.y + bounds.max.y) / 2 }; const newAngle = parseFloat(uiElements.compRotation.value) * (Math.PI / 180); const currentAngle = state.selectedComposite.angle || 0; Composite.rotate(state.selectedComposite, newAngle - currentAngle, center); state.selectedComposite.angle = newAngle; updateEditorLabels(); } });
    uiElements.compScale.addEventListener('input', () => { if (state.selectedComposite) { const bounds = getCompositeBounds(state.selectedComposite); if (!bounds) return; const center = { x: (bounds.min.x + bounds.max.x) / 2, y: (bounds.min.y + bounds.max.y) / 2 }; const newScale = parseFloat(uiElements.compScale.value); const currentScale = state.selectedComposite.scale || 1; const scaleFactor = newScale / currentScale; Composite.scale(state.selectedComposite, scaleFactor, scaleFactor, center); state.selectedComposite.scale = newScale; updateEditorLabels(); } });
    document.querySelectorAll('.range-and-controls button').forEach(button => { button.addEventListener('click', () => { const slider = document.getElementById(button.dataset.target); const scale = parseFloat(button.dataset.scale); const currentMin = parseFloat(slider.min); const currentMax = parseFloat(slider.max); let newMax = currentMax * scale; if (newMax < currentMin + parseFloat(slider.step)) { newMax = currentMin + parseFloat(slider.step); } slider.max = newMax; slider.closest('.slider-with-controls').querySelector('.range-display').textContent = `Range: ${slider.min} - ${newMax}`; }); });

    // --- GENERAL UI LISTENERS ---
    uiElements.saveCompositeBtn.addEventListener('click', serializationFuncs.saveComposite);
    uiElements.loadCompositeBtn.addEventListener('click', serializationFuncs.showLoadModal);
    uiElements.createCompoundBtn.addEventListener('click', actionFuncs.createCompoundBody);
    uiElements.breakCompoundBtn.addEventListener('click', actionFuncs.breakCompoundBody);
    uiElements.addCompositeBtn.addEventListener('click', actionFuncs.addComposite);
    uiElements.removeFromCompositeBtn.addEventListener('click', actionFuncs.removeFromComposite);
    uiElements.addToCompositeBtn.addEventListener('click', () => actionFuncs.assignToComposite(uiElements.assignCompositeList.value));
    uiElements.deleteCompositeBtn.addEventListener('click', actionFuncs.deleteComposite);
    uiElements.deleteObjectBtn.addEventListener('click', actionFuncs.deleteObject);
    uiElements.deleteConstraintBtn.addEventListener('click', actionFuncs.deleteConstraint);


    document.getElementById('add-object-btn').addEventListener('click', () => {
        const objectType = document.getElementById('object-type').value;
        const x = window.innerWidth * (0.4 + Math.random() * 0.2);
        let newBody;
        const randomColor = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
        const options = { render: { fillStyle: randomColor } };
        if (objectType === 'circle') newBody = Bodies.circle(x, 100, 30, options);
        else if (objectType === 'rectangle') newBody = Bodies.rectangle(x, 100, 50, 80, options);
        else if (objectType === 'triangle') newBody = Bodies.polygon(x, 100, 3, 40, options);
        Composite.add(world, newBody);
    });

    uiElements.gravitySlider.addEventListener('input', function() {
        engine.gravity.y = parseFloat(this.value);
        uiElements.gravityValueSpan.textContent = parseFloat(this.value).toFixed(2);
    });
    
    // --- THIS IS THE CORRECTED SELECTION LOGIC ---
    uiElements.compositeList.addEventListener('change', (e) => {
        const selectedValue = e.target.value;
        
        if (selectedValue === 'none') {
            state.selectedComposite = null;
            // When deselecting a composite, we don't want to deselect a currently selected object
            if (state.selectedObject || state.selectedConstraint) {
                // Do nothing, let the object stay selected
            } else {
                showEditor('new');
            }
        } else {
            // The value from the option is a string, but Matter.js IDs are numbers.
            const compositeId = parseInt(selectedValue, 10);
            const foundComposite = Composite.get(masterComposite, compositeId, 'composite');
            
            if (foundComposite) {
                deselectAll(); // Clear any selected object before selecting the composite
                state.selectedComposite = foundComposite;
                showEditor('composite');
                uiElements.compositeNameInput.value = state.selectedComposite.label;
                document.getElementById('composite-id-display').textContent = state.selectedComposite.id;
            }
        }
        updateSelectionVisuals();
    });
    
    uiElements.compositeNameInput.addEventListener('input', (e) => {
        if (state.selectedComposite) {
            state.selectedComposite.label = e.target.value;
            // We need to update the list to show the new name
            updateCompositeLists();
        }
    });

    uiElements.existingConstraintList.addEventListener('change', (e) => {
        const constraintId = parseInt(e.target.value, 10);
        if (isNaN(constraintId)) {
            deselectAll();
        } else {
            const allConstraints = Composite.allConstraints(world);
            const selectedItem = allConstraints.find(c => c.id === constraintId);
            if (selectedItem) {
                deselectAll();
                state.selectedConstraint = selectedItem;
                showEditor('constraint');
                populateEditor(selectedItem);
                updateSelectionVisuals();
            }
        }
    });
}