// --- SETUP ---
const { Engine, Render, Runner, Bodies, Body, Bounds, Composite, Constraint, Mouse, MouseConstraint, Events, Query, Vector, Vertices } = Matter;
const engine = Engine.create();
const world = engine.world;
const render = Render.create({ element: document.body, engine: engine, options: { width: window.innerWidth, height: window.innerHeight, wireframes: false, background: '#1a1a1a' } });
Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

// --- SCENE OBJECTS ---
const initialBodies = [
    Bodies.circle(window.innerWidth / 2 - 200, 200, 30, { render: { fillStyle: '#4285F4' } }),
    Bodies.rectangle(window.innerWidth / 2, 150, 50, 50, { render: { fillStyle: '#DB4437' } }),
    Bodies.polygon(window.innerWidth / 2 + 200, 200, 3, 30, { render: { fillStyle: '#0F9D58' } })
];
Composite.add(world, initialBodies); 
const wallOptions = { isStatic: true, render: { fillStyle: '#444' } };
const wallThickness = 60;
Composite.add(world, [
    Bodies.rectangle(window.innerWidth / 2, window.innerHeight - (wallThickness / 2), window.innerWidth, wallThickness, wallOptions),
    Bodies.rectangle(window.innerWidth / 2, (wallThickness / 2), window.innerWidth, wallThickness, wallOptions),
    Bodies.rectangle((wallThickness / 2), window.innerHeight / 2, wallThickness, window.innerHeight, wallOptions),
    Bodies.rectangle(window.innerWidth - (wallThickness / 2), window.innerHeight / 2, wallThickness, window.innerHeight, wallOptions)
]);

// --- STATE & INTERACTIVITY ---
let selectedBodies = [], selectedConstraint = null, selectedObject = null, selectedComposite = null; selectionGroup = [];
let isBuildMode = false;
let draggingBody = null;
let mouseDownPosition = null;
let clickedBody = null;
// State for cycling selection
let lastClickPosition = { x: null, y: null };
let candidateIndex = 0;
let constraintPoints = [];
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, { mouse: mouse, constraint: { stiffness: 0.2, render: { visible: false } } });
Composite.add(world, mouseConstraint);

// All composites will be stored in this master composite. This prevents them from being part of the main world.
const masterComposite = Composite.create({ label: 'Master Composite' });
world.label = 'World';

// --- SERIALIZER SETUP ---
const serializer = MatterTools.Serializer.create();

// --- UI ELEMENT REFERENCES ---
const uiTitle = document.getElementById('ui-title'), 
      constraintEditor = document.getElementById('constraint-editor'), 
      objectEditor = document.getElementById('object-editor'),
      compositeEditor = document.getElementById('composite-editor'),
      assignToCompositeSection = document.getElementById('assign-to-composite-section');

const deleteConstraintBtn = document.getElementById('delete-constraint-btn'), 
      deleteObjectBtn = document.getElementById('delete-object-btn'),
      deleteCompositeBtn = document.getElementById('delete-composite-btn');

      const deleteModal = document.getElementById('delete-modal'), 
      loadModal = document.getElementById('load-modal'),
      modalText = document.getElementById('modal-text'),
      loadTextarea = document.getElementById('load-textarea'),
      copyMessage = document.getElementById('copy-message');

const createCompoundBtn = document.getElementById('create-compound-btn');
const breakCompoundBtn = document.getElementById('break-compound-btn');

const compositeNameInput = document.getElementById('composite-name-input');

function updateCompoundUI() {
    // Enable "Create" button only if 2 or more bodies are selected
    const bodySelections = selectionGroup.filter(item => item.type === 'body');
    createCompoundBtn.disabled = bodySelections.length < 2;

    // Show "Break Apart" button only if a single compound object is selected
    const isCompound = selectedObject && selectedObject.parts.length > 1;
    breakCompoundBtn.style.display = isCompound ? 'block' : 'none';
}

const compositeList = document.getElementById('composite-list');
const assignCompositeList = document.getElementById('assign-composite-list');

// Save/Load Buttons
const saveCompositeBtn = document.getElementById('save-composite-btn');
const loadCompositeBtn = document.getElementById('load-composite-btn');

// --- WORLD CONTROLS REFERENCES ---
const gravitySlider = document.getElementById('gravity-slider');
const gravityValueSpan = document.getElementById('gravity-value');
gravityValueSpan.textContent = parseFloat(gravitySlider.value).toFixed(2);

// --- UI LOGIC ---
function showEditor(mode) {
constraintEditor.style.display = 'none';
objectEditor.style.display = 'none';
compositeEditor.style.display = 'none';
deleteConstraintBtn.style.display = 'none';
deleteObjectBtn.style.display = 'none';
deleteCompositeBtn.style.display = 'none';
breakCompoundBtn.style.display = 'none'; // Add this line
assignToCompositeSection.style.display = 'none'; // Hide by default

// Toggle save button based on selection
saveCompositeBtn.disabled = !selectedComposite;
saveCompositeBtn.style.opacity = selectedComposite ? 1 : 0.5;

switch(mode) {
case 'new':
    uiTitle.textContent = "New Constraint";
    constraintEditor.style.display = 'block';
    break;
case 'constraint':
    uiTitle.textContent = "Edit Constraint";
    constraintEditor.style.display = 'block';
    deleteConstraintBtn.style.display = 'block';
    assignToCompositeSection.style.display = 'block'; // Now this will work
    break;
case 'object':
    uiTitle.textContent = "Edit Object";
    objectEditor.style.display = 'block';
    deleteObjectBtn.style.display = 'block';
    assignToCompositeSection.style.display = 'block'; // This still works
    break;
case 'composite':
    uiTitle.textContent = "Edit Composite";
    compositeEditor.style.display = 'block';
    deleteCompositeBtn.style.display = 'block';
    break;
case 'composite-child':
    uiTitle.textContent = "Edit Composite";
    compositeEditor.style.display = 'block';
    document.getElementById('remove-from-composite-btn').style.display = 'block';
    document.getElementById('composite-editor-message').style.display = 'block';
    deleteCompositeBtn.style.display = 'none';
    break;
}
}

// --- ADD OBJECT LOGIC ---
document.getElementById('add-object-btn').addEventListener('click', () => {
    const objectType = document.getElementById('object-type').value;
    const x = window.innerWidth * (0.4 + Math.random() * 0.2);
    let newBody;
    const randomColor = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
    const options = { render: { fillStyle: randomColor } };
    if (objectType === 'circle') {
        newBody = Bodies.circle(x, 100, 30, options);
    } else if (objectType === 'rectangle') {
        newBody = Bodies.rectangle(x, 100, 50, 80, options);
    } else if (objectType === 'triangle') {
        newBody = Bodies.polygon(x, 100, 3, 40, options);
    }
    Composite.add(world, newBody);
});
// --- CONSTRAINTS LOGIC --- ADDED BY THEGINKO
function updateConstraintList() {
const constraintsList = document.getElementById('existing-constraint-list');
constraintsList.innerHTML = '<option value="new">Create New...</option>';
const allConstraints = Composite.allConstraints(world).concat(Composite.allConstraints(masterComposite));

allConstraints.forEach(c => {
const option = document.createElement('option');
option.value = c.id;
option.textContent = `Constraint ${c.id}`;
constraintsList.appendChild(option);
});

// Set the dropdown to the currently selected constraint, if one exists
if (selectedConstraint) {
constraintsList.value = selectedConstraint.id;
} else {
constraintsList.value = 'new';
}
}
// --- COMPOSITES LOGIC ---
function updateCompositeLists() {
    // Clear existing lists
    compositeList.innerHTML = '<option value="none">World</option>';
    assignCompositeList.innerHTML = '';
    
    const composites = masterComposite.composites;
    composites.forEach(comp => {
        const option = document.createElement('option');
        option.value = comp.id;
        option.textContent = comp.label;
        compositeList.appendChild(option);

        const assignOption = option.cloneNode(true);
        assignCompositeList.appendChild(assignOption);
    });

    // Update selection in list
    if (selectedComposite) {
        compositeList.value = selectedComposite.id;
    } else {
        compositeList.value = 'none';
    }
}

function addComposite() {
    const newComposite = Composite.create({ label: `Composite ${masterComposite.composites.length + 1}` });
    Composite.add(masterComposite, newComposite);
    updateCompositeLists();
}

function deleteComposite() {
    if (selectedComposite) {
        Composite.remove(masterComposite, selectedComposite);
        deselectAll();
    }
}

// Replace this entire function
function removeFromComposite() {
const itemToRemove = selectedObject || selectedConstraint;

if (itemToRemove) {
// Manually find the direct parent composite
let parentComposite = null;
const allComposites = [masterComposite, ...Composite.allComposites(masterComposite)]; // Don't check world
for (const comp of allComposites) {
    const collection = itemToRemove.type === 'body' ? comp.bodies : comp.constraints;
    if (collection && collection.includes(itemToRemove)) {
        parentComposite = comp;
        break;
    }
}

if (parentComposite && parentComposite !== world) {
    // Use the generic move function to return the item to the main world
    Composite.move(parentComposite, [itemToRemove], world);
    
    deselectAll();
    showMessage(`${itemToRemove.type.charAt(0).toUpperCase() + itemToRemove.type.slice(1)} removed from composite.`, 'success');
} else {
    showMessage('Item is not in a user-created composite.', 'error');
}
} else {
 showMessage("No object or constraint selected to remove.", 'error');
}
}

document.getElementById('remove-from-composite-btn').addEventListener('click', removeFromComposite);
document.getElementById('add-composite-btn').addEventListener('click', addComposite);

compositeList.addEventListener('change', (e) => {
const compositeId = e.target.value;
if (compositeId === 'none') {
selectedComposite = null;
// When deselecting, you might want to revert to a default view
showEditor('new'); 
} else {
selectedComposite = Composite.get(masterComposite, compositeId, 'composite');
}

// This 'if' block now correctly handles showing the editor and populating the fields
if (selectedComposite) {
showEditor('composite');
compositeNameInput.value = selectedComposite.label;
// This is the line that was added to populate the ID
document.getElementById('composite-id-display').textContent = selectedComposite.id; 
}

updateSelectionVisuals();
});

compositeNameInput.addEventListener('input', (e) => {
    if (selectedComposite) {
        selectedComposite.label = e.target.value;
        updateCompositeLists();
    }
});



// Replace this entire event listener
document.getElementById('add-to-composite-btn').addEventListener('click', () => {
const targetCompositeId = assignCompositeList.value;
const itemToMove = selectedObject || selectedConstraint;

if (!itemToMove) {
showMessage('No object or constraint selected.', 'error');
return;
}

if (targetCompositeId && targetCompositeId !== 'none') {
const targetComposite = Composite.get(masterComposite, targetCompositeId, 'composite');

// Manually find the direct parent composite
let parentComposite = null;
const allComposites = [world, masterComposite, ...Composite.allComposites(masterComposite)];
for (const comp of allComposites) {
    const collection = itemToMove.type === 'body' ? comp.bodies : comp.constraints;
    if (collection && collection.includes(itemToMove)) {
        parentComposite = comp;
        break;
    }
}

if (parentComposite && targetComposite) {
    if (parentComposite !== targetComposite) {
        // Use the generic move function now that we're sure of the parent
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
});


// --- SAVE/LOAD LOGIC ---
function saveComposite() {
    if (!selectedComposite) {
        showMessage("No composite selected to save.", 'error');
        return;
    }
    try {
        const jsonString = MatterTools.Serializer.serialise(serializer, selectedComposite, 2);
        navigator.clipboard.writeText(jsonString).then(() => {
            showMessage("Composite JSON copied to clipboard!");
        }, (err) => {
            showMessage("Failed to copy JSON to clipboard.", 'error');
            console.error("Could not copy text: ", err);
        });
    } catch (err) {
        showMessage("Failed to serialize composite.", 'error');
        console.error("Serialization error: ", err);
    }
}

function loadComposite() {
const jsonString = loadTextarea.value;
try {
    // Pause the physics engine before loading to prevent instability
    Runner.stop(runner);

    const newComposite = serializer.parse(jsonString);

    // Rebase all IDs to avoid conflicts with existing objects
    Composite.rebase(newComposite);

    // Re-apply the original collision group setting to all bodies
    Composite.allBodies(newComposite).forEach(body => {
        Body.set(body, 'collisionFilter', { 
            group: body.collisionFilter.group,
            category: body.collisionFilter.category,
            mask: body.collisionFilter.mask
        });
    });

    Composite.add(masterComposite, newComposite);
    updateCompositeLists();
    loadModal.style.display = 'none';
    showMessage("Composite loaded successfully!");

    // Resume the physics engine after loading
    Runner.run(runner, engine);

} catch (err) {
    showMessage("Invalid JSON string. Please check the format.", 'error');
    console.error("Deserialization error: ", err);

    // Ensure the runner is restarted even on error, so the simulation doesn't stop
    Runner.run(runner, engine);
}
}

function showMessage(text, type = 'success') {
    copyMessage.textContent = text;
    copyMessage.style.backgroundColor = type === 'error' ? '#DB4437' : '#0F9D58';
    copyMessage.style.opacity = 1;
    setTimeout(() => { copyMessage.style.opacity = 0; }, 2000);
}
function createCompoundBody() {
    const bodiesToCompound = selectionGroup.filter(item => item.type === 'body');
    if (bodiesToCompound.length < 2) {
        showMessage('Select at least two bodies to create a compound body.', 'error');
        return;
    }

    // Find the parent of the first body to ensure all parts are in the same container
    const parentContainer = findParentComposite(bodiesToCompound[0]);
    if (!parentContainer) {
         showMessage('Could not determine a common container for the selected bodies.', 'error');
         return;
    }

    // Verify all bodies share the same parent
    for (let i = 1; i < bodiesToCompound.length; i++) {
        if (findParentComposite(bodiesToCompound[i]) !== parentContainer) {
            showMessage('All selected bodies must be in the same container (World or a Composite) to be combined.', 'error');
            return;
        }
    }
    
    // 1. Find all constraints attached to the bodies we are about to compound
    const constraintsToUpdate = [];
    const allConstraints = Composite.allConstraints(parentContainer);
    for (const constraint of allConstraints) {
        if (bodiesToCompound.includes(constraint.bodyA) || bodiesToCompound.includes(constraint.bodyB)) {
            constraintsToUpdate.push(constraint);
        }
    }

    // 2. Create the new compound body from the parts
    // This implicitly removes the original bodies from the parentContainer
    const compoundBody = Body.create({
        parts: bodiesToCompound,
        isStatic: false
    });

    // 3. Update the constraints to reference the new compound body
    for (const constraint of constraintsToUpdate) {
        if (bodiesToCompound.includes(constraint.bodyA)) {
            constraint.bodyA = compoundBody;
        }
        if (bodiesToCompound.includes(constraint.bodyB)) {
            constraint.bodyB = compoundBody;
        }
    }

    // 4. Add the new compound body to the same parent container
    Composite.add(parentContainer, compoundBody);

    showMessage(`Compound body created with ID ${compoundBody.id}.`);
    deselectAll();
}

function breakCompoundBody() {
    if (!selectedObject || selectedObject.parts.length <= 1) {
        showMessage('No compound body selected to break apart.', 'error');
        return;
    }

    const compound = selectedObject;
    const parentContainer = findParentComposite(compound);
    
    // This is important: `parts` includes the main body itself at index 0.
    // We only want to re-add the original components.
    const parts = compound.parts.slice(1);

    // Remove the compound body
    Composite.remove(parentContainer, compound);

    // Re-add the original parts to the same container
    parts.forEach(part => {
        // Reset collision filter so they can collide again
        part.collisionFilter.group = 0;
        Composite.add(parentContainer, part);
    });

    showMessage(`Compound body ${compound.id} broken apart.`);
    deselectAll();
}

saveCompositeBtn.addEventListener('click', saveComposite);
loadCompositeBtn.addEventListener('click', () => { loadModal.style.display = 'flex'; });
document.getElementById('confirm-load').addEventListener('click', loadComposite);
document.getElementById('deny-load').addEventListener('click', () => { loadModal.style.display = 'none'; });

// --- BUILD MODE LOGIC ---
document.getElementById('build-mode-checkbox').addEventListener('change', (e) => {
     isBuildMode = e.target.checked;
     if (isBuildMode) {
        engine.gravity.y = 0;
        Composite.remove(world, mouseConstraint); 
    } else {
         engine.gravity.y = 1;
         Composite.add(world, mouseConstraint); 
    }
});

// --- DELETE LOGIC ---
function showConfirmationModal(type) {
    modalText.textContent = `You are about to delete this ${type}.`;
    deleteModal.style.display = 'flex';
}
deleteConstraintBtn.addEventListener('click', () => showConfirmationModal('constraint'));
deleteObjectBtn.addEventListener('click', () => showConfirmationModal('object'));
deleteCompositeBtn.addEventListener('click', () => showConfirmationModal('composite'));

document.getElementById('deny-delete').addEventListener('click', () => deleteModal.style.display = 'none');
document.getElementById('confirm-delete').addEventListener('click', () => {
    if (selectedComposite) {
        deleteComposite();
    } else if (selectedConstraint) {
        // Find parent and remove from it
        const parent = findParentComposite(selectedConstraint);
        Composite.remove(parent, selectedConstraint);
        deselectAll();
    } else if (selectedObject) {
        // Find parent and remove from it
        const parent = findParentComposite(selectedObject);
        Composite.remove(parent, selectedObject);
        deselectAll();
    }
    deleteModal.style.display = 'none';
});
// RANGE SCALING FOR SLIDERS LOGIC AND UPDATE
function scaleSliderRange(slider, scaleFactor) {
const currentMin = parseFloat(slider.min);
const currentMax = parseFloat(slider.max);
const currentStep = parseFloat(slider.step);

let newMin = currentMin * scaleFactor;
let newMax = currentMax * scaleFactor;
let newStep = currentStep * scaleFactor;

// Prevent range from collapsing to zero or becoming too small
if (newMax < newMin + newStep) {
newMax = newMin + newStep;
}

slider.min = newMin;
slider.max = newMax;
slider.step = newStep;

// Update the display for the new range
const rangeDisplay = slider.closest('.slider-with-controls').querySelector('.range-display');
rangeDisplay.textContent = `Range: ${newMin} - ${newMax}`;
}
// --- START: New Helper Function ---
function findParentComposite(item) {
// Check main world first, as it's the most common container
if (item.type === 'body') {
if (world.bodies.includes(item)) {
    return world;
}
} else if (item.type === 'constraint') {
if (world.constraints.includes(item)) {
    return world;
}
}

// If not in the world, search through user-created composites
for (const comp of masterComposite.composites) {
if (item.type === 'body' && Composite.allBodies(comp).includes(item)) {
    return comp;
}
if (item.type === 'constraint' && Composite.allConstraints(comp).includes(item)) {
    return comp;
}
}

// Fallback if no parent is found (should theoretically not be reached if item is in the simulation)
return null;
}
// --- END: New Helper Function ---
// --- PROPERTY HANDLERS ---
function setupPropertyHandlers() {
const inputs = {
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

// Composite inputs
compTranslateX: document.getElementById('composite-translate-x'),
compTranslateY: document.getElementById('composite-translate-y'),
compRotation: document.getElementById('composite-rotation'),
compScale: document.getElementById('composite-scale')
};

inputs.isStatic.addEventListener('change', () => {
if (selectedObject) Body.setStatic(selectedObject, inputs.isStatic.checked);
});

inputs.angle.addEventListener('input', () => {
if (selectedObject) Body.setAngle(selectedObject, parseFloat(inputs.angle.value) * (Math.PI / 180));
updateEditorLabels();
});

inputs.restitution.addEventListener('input', () => {
if (selectedObject) selectedObject.restitution = parseFloat(inputs.restitution.value);
updateEditorLabels();
});

inputs.friction.addEventListener('input', () => {
if (selectedObject) selectedObject.friction = parseFloat(inputs.friction.value);
updateEditorLabels();
});

inputs.frictionStatic.addEventListener('input', () => {
if (selectedObject) selectedObject.frictionStatic = parseFloat(inputs.frictionStatic.value);
updateEditorLabels();
});

inputs.frictionAir.addEventListener('input', () => {
if (selectedObject) selectedObject.frictionAir = parseFloat(inputs.frictionAir.value);
updateEditorLabels();
});

inputs.density.addEventListener('input', () => {
if (selectedObject) Body.setDensity(selectedObject, parseFloat(inputs.density.value));
updateEditorLabels();
});

inputs.posX.addEventListener('input', () => {
if (selectedObject) Body.setPosition(selectedObject, { x: parseFloat(inputs.posX.value), y: selectedObject.position.y });
updateEditorLabels();
});

inputs.posY.addEventListener('input', () => {
if (selectedObject) Body.setPosition(selectedObject, { x: selectedObject.position.x, y: parseFloat(inputs.posY.value) });
updateEditorLabels();
});

inputs.comX.addEventListener('input', () => {
if (selectedObject) {
    const newOffsetX = parseFloat(inputs.comX.value) || 0;
    const currentOffsetY = parseFloat(inputs.comY.value) || 0;
    Body.setCentre(selectedObject, { x: newOffsetX, y: currentOffsetY }, true);
}
});

inputs.comY.addEventListener('input', () => {
if (selectedObject) {
    const newOffsetY = parseFloat(inputs.comY.value) || 0;
    const currentOffsetX = parseFloat(inputs.comX.value) || 0;
    Body.setCentre(selectedObject, { x: currentOffsetX, y: newOffsetY }, true);
}
});

inputs.radius.addEventListener('input', () => {
if (selectedObject && selectedObject.circleRadius) {
    const newRadius = parseFloat(inputs.radius.value);
    const oldRadius = selectedObject.circleRadius;
    if (oldRadius > 0) Body.scale(selectedObject, newRadius / oldRadius, newRadius / oldRadius);
}
updateEditorLabels();
});

inputs.width.addEventListener('input', () => {
if (selectedObject && !selectedObject.circleRadius) {
    const newWidth = parseFloat(inputs.width.value);
    const oldWidth = selectedObject.bounds.max.x - selectedObject.bounds.min.x;
    if (oldWidth > 0) Body.scale(selectedObject, newWidth / oldWidth, 1);
}
updateEditorLabels();
});

inputs.height.addEventListener('input', () => {
if (selectedObject && !selectedObject.circleRadius) {
    const newHeight = parseFloat(inputs.height.value);
    const oldHeight = selectedObject.bounds.max.y - selectedObject.bounds.min.y;
    if (oldHeight > 0) Body.scale(selectedObject, 1, newHeight / oldHeight);
}
updateEditorLabels();
});

inputs.polygonSize.addEventListener('input', () => {
if (selectedObject && !selectedObject.circleRadius && selectedObject.vertices.length !== 4) {
    const newSize = parseFloat(inputs.polygonSize.value);
    const currentSize = Math.sqrt(selectedObject.area / (selectedObject.vertices.length === 3 ? 0.433 : 1));
    const scaleFactor = newSize / currentSize;
    if (currentSize > 0 && isFinite(scaleFactor)) {
        Body.scale(selectedObject, scaleFactor, scaleFactor);
    }
}
updateEditorLabels();
});

inputs.group.addEventListener('input', () => {
if (selectedObject && !isNaN(parseInt(inputs.group.value))) selectedObject.collisionFilter.group = parseInt(inputs.group.value);
});

inputs.category.addEventListener('input', () => {
if (selectedObject && !isNaN(parseInt(inputs.category.value))) selectedObject.collisionFilter.category = parseInt(inputs.category.value);
});

inputs.mask.addEventListener('input', () => {
if (selectedObject && !isNaN(parseInt(inputs.mask.value))) selectedObject.collisionFilter.mask = parseInt(inputs.mask.value);
});

// Constraint Listeners
inputs.stiffness.addEventListener('input', () => {
if(selectedConstraint) selectedConstraint.stiffness = parseFloat(inputs.stiffness.value);
updateEditorLabels();
});
inputs.damping.addEventListener('input', () => {
if(selectedConstraint) selectedConstraint.damping = parseFloat(inputs.damping.value);
updateEditorLabels();
});
inputs.length.addEventListener('input', () => {
if(selectedConstraint) selectedConstraint.length = parseFloat(inputs.length.value);
updateEditorLabels();
});
inputs.constraintPointAX.addEventListener('input', () => {
if(selectedConstraint) selectedConstraint.pointA.x = parseFloat(inputs.constraintPointAX.value);
});
inputs.constraintPointAY.addEventListener('input', () => {
if(selectedConstraint) selectedConstraint.pointA.y = parseFloat(inputs.constraintPointAY.value);
});
inputs.constraintPointBX.addEventListener('input', () => {
if(selectedConstraint) selectedConstraint.pointB.x = parseFloat(inputs.constraintPointBX.value);
});
inputs.constraintPointBY.addEventListener('input', () => {
if(selectedConstraint) selectedConstraint.pointB.y = parseFloat(inputs.constraintPointBY.value);
});

// Constraint Listeners
inputs.stiffness.addEventListener('input', () => {
if(selectedConstraint) selectedConstraint.stiffness = parseFloat(inputs.stiffness.value);
updateEditorLabels();
});
inputs.damping.addEventListener('input', () => {
if(selectedConstraint) selectedConstraint.damping = parseFloat(inputs.damping.value);
updateEditorLabels();
});
inputs.length.addEventListener('input', () => {
if(selectedConstraint) selectedConstraint.length = parseFloat(inputs.length.value);
updateEditorLabels();
});
inputs.constraintPointAX.addEventListener('input', () => {
if(selectedConstraint) selectedConstraint.pointA.x = parseFloat(inputs.constraintPointAX.value);
});
inputs.constraintPointAY.addEventListener('input', () => {
if(selectedConstraint) selectedConstraint.pointA.y = parseFloat(inputs.constraintPointAY.value);
});
inputs.constraintPointBX.addEventListener('input', () => {
if(selectedConstraint) selectedConstraint.pointB.x = parseFloat(inputs.constraintPointBX.value);
});
// Composite Listeners
const handleCompositeTranslate = () => {
if (selectedComposite) {
    const dx = parseFloat(inputs.compTranslateX.value) || 0;
    const dy = parseFloat(inputs.compTranslateY.value) || 0;
    if (dx !== 0 || dy !== 0) {
        Composite.translate(selectedComposite, { x: dx, y: dy });
        // Reset inputs after applying translation
        inputs.compTranslateX.value = 0;
        inputs.compTranslateY.value = 0;
    }
}
};
inputs.compTranslateX.addEventListener('change', handleCompositeTranslate);
inputs.compTranslateY.addEventListener('change', handleCompositeTranslate);

inputs.compRotation.addEventListener('input', () => {
if (selectedComposite) {
    const bounds = getCompositeBounds(selectedComposite);
    if (!bounds) return;
    const center = { x: (bounds.min.x + bounds.max.x) / 2, y: (bounds.min.y + bounds.max.y) / 2 };
    const newAngle = parseFloat(inputs.compRotation.value) * (Math.PI / 180);
    const currentAngle = selectedComposite.angle || 0;
    Composite.rotate(selectedComposite, newAngle - currentAngle, center);
    selectedComposite.angle = newAngle; // Store current angle
    updateEditorLabels();
}
});

inputs.compScale.addEventListener('input', () => {
if (selectedComposite) {
    const bounds = getCompositeBounds(selectedComposite);
    if (!bounds) return;

    const center = { x: (bounds.min.x + bounds.max.x) / 2, y: (bounds.min.y + bounds.max.y) / 2 };
    const newScale = parseFloat(inputs.compScale.value);

    // Use a temporary property to store the current scale on the composite itself
    const currentScale = selectedComposite.scale || 1;
    const scaleFactor = newScale / currentScale;

    // 1. Scale all the bodies in the composite
    Composite.scale(selectedComposite, scaleFactor, scaleFactor, center);

    // 2. Manually scale all the constraints and their attachment points
    const constraints = Composite.allConstraints(selectedComposite);
    for (const constraint of constraints) {
        // Scale the constraint's length
        constraint.length *= scaleFactor;
        
        // Scale the local attachment points (pointA and pointB)
        // This is the crucial part that was missing
        constraint.pointA = Vector.mult(constraint.pointA, scaleFactor);
        constraint.pointB = Vector.mult(constraint.pointB, scaleFactor);
    }

    // 3. Store the new scale for the next operation
    selectedComposite.scale = newScale;

    updateEditorLabels();
}
});


document.querySelectorAll('.range-and-controls button').forEach(button => {
button.addEventListener('click', () => {
    const sliderId = button.dataset.target;
    const slider = document.getElementById(sliderId);
    const scale = parseFloat(button.dataset.scale);
    scaleSliderRange(slider, scale);
});
});
}

setupPropertyHandlers();

function updateEditorLabels() {
    if (selectedObject) {
        document.getElementById('angle-value').textContent = Math.round(selectedObject.angle * (180 / Math.PI)) % 360;
        document.getElementById('restitution-value').textContent = selectedObject.restitution.toFixed(2);
        document.getElementById('friction-value').textContent = selectedObject.friction.toFixed(2);
        document.getElementById('friction-static-value').textContent = selectedObject.frictionStatic.toFixed(2);
        document.getElementById('friction-air-value').textContent = selectedObject.frictionAir.toFixed(3);
        document.getElementById('density-value').textContent = selectedObject.density.toFixed(3);
        if (selectedObject.circleRadius > 0) {
            document.getElementById('radius-value').textContent = Math.round(selectedObject.circleRadius);
        } else if (selectedObject.vertices.length === 4) {
            document.getElementById('width-value').textContent = Math.round(selectedObject.bounds.max.x - selectedObject.bounds.min.x);
            document.getElementById('height-value').textContent = Math.round(selectedObject.bounds.max.y - selectedObject.bounds.min.y);
        } else {
            const size = Math.sqrt(selectedObject.area / (selectedObject.vertices.length === 3 ? 0.433 : 1));
            document.getElementById('polygon-size-value').textContent = Math.round(size);
        }
    }
    if (selectedConstraint) {
        document.getElementById('stiffness-value').textContent = selectedConstraint.stiffness.toFixed(2);
        document.getElementById('damping-value').textContent = selectedConstraint.damping.toFixed(3);
        document.getElementById('length-value').textContent = Math.round(selectedConstraint.length);
    }
    if (selectedComposite) {
        document.getElementById('composite-rotation-value').textContent = Math.round(parseFloat(document.getElementById('composite-rotation').value));
        document.getElementById('composite-scale-value').textContent = parseFloat(document.getElementById('composite-scale').value).toFixed(2);
}
}

// Replace the existing populateEditor function with this one
function populateEditor(item) {
if (item.type === 'body') {
const body = item;
const isCompound = body.parts.length > 1;

// Disable size/COM controls for compound bodies
const sizeControlsDisabled = isCompound;
document.getElementById('radius').disabled = sizeControlsDisabled;
document.getElementById('width').disabled = sizeControlsDisabled;
document.getElementById('height').disabled = sizeControlsDisabled;
document.getElementById('polygon-size').disabled = sizeControlsDisabled;
document.getElementById('com-offset-x').disabled = sizeControlsDisabled;
document.getElementById('com-offset-y').disabled = sizeControlsDisabled;

const isCircle = body.circleRadius > 0;
const isRectangle = !isCircle && body.vertices.length === 4;

document.getElementById('size-editor-circle').style.display = 'none';
document.getElementById('size-editor-rect').style.display = 'none';
document.getElementById('size-editor-polygon').style.display = 'none';

if (isCircle) {
    document.getElementById('size-editor-circle').style.display = 'block';
    document.getElementById('radius').value = body.circleRadius;
} else if (isRectangle && !isCompound) {
    document.getElementById('size-editor-rect').style.display = 'block';
    document.getElementById('width').value = body.bounds.max.x - body.bounds.min.x;
    document.getElementById('height').value = body.bounds.max.y - body.bounds.min.y;
    document.querySelector('#size-editor-rect .range-display').textContent = `Range: 10 - 200`;
    document.querySelector('#size-editor-rect .range-display').textContent = `Range: 10 - 200`;
} else if (!isCompound) { 
    document.getElementById('size-editor-polygon').style.display = 'block';
    const size = Math.sqrt(body.area / (body.vertices.length === 3 ? 0.433 : 1));
    document.getElementById('polygon-size').value = size;
}

document.getElementById('is-static').checked = body.isStatic;
document.getElementById('angle').value = Math.round(body.angle * (180 / Math.PI)) % 360;
document.getElementById('restitution').value = body.restitution;
document.getElementById('friction').value = body.friction;
document.getElementById('friction-static').value = body.frictionStatic;
document.getElementById('friction-air').value = body.frictionAir;
document.getElementById('density').value = body.density;
document.getElementById('position-x').value = Math.round(body.position.x);
document.getElementById('position-y').value = Math.round(body.position.y);

const geometricCenter = Vertices.centre(body.vertices);
const offsetX = body.position.x - geometricCenter.x;
const offsetY = body.position.y - geometricCenter.y;
document.getElementById('com-offset-x').value = Math.round(offsetX);
document.getElementById('com-offset-y').value = Math.round(offsetY);

document.getElementById('collision-group').value = body.collisionFilter.group;
document.getElementById('collision-category').value = body.collisionFilter.category;
document.getElementById('collision-mask').value = body.collisionFilter.mask;

assignToCompositeSection.style.display = 'block';
} else if (item.type === 'constraint') {
const constraint = item;
document.getElementById('stiffness').value = constraint.stiffness;
document.getElementById('damping').value = constraint.damping;
document.getElementById('length').value = constraint.length;
document.getElementById('constraint-point-ax').value = constraint.pointA.x;
document.getElementById('constraint-point-ay').value = constraint.pointA.y;
document.getElementById('constraint-point-bx').value = constraint.pointB.x;
document.getElementById('constraint-point-by').value = constraint.pointB.y;

assignToCompositeSection.style.display = 'block';
} else if (item.type === 'composite') {
const composite = item;
document.getElementById('composite-id-display').textContent = composite.id;
document.getElementById('composite-translate-x').value = 0;
document.getElementById('composite-translate-y').value = 0;
document.getElementById('composite-rotation').value = 0;
document.getElementById('composite-scale').value = 1;
}
updateEditorLabels();
}

gravitySlider.addEventListener('input', function() {
    const gravityValue = parseFloat(this.value);
    engine.gravity.y = gravityValue;
    gravityValueSpan.textContent = gravityValue.toFixed(2);
});

const distToSegment = (p, v, w) => {
    const l2 = Vector.magnitudeSquared(Vector.sub(w, v)); if (l2 === 0) return Vector.magnitude(Vector.sub(p, v));
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projection = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
    return Vector.magnitude(Vector.sub(p, projection));
};

// Add this new helper function
const getCompositeBounds = (composite) => {
const bodies = Composite.allBodies(composite);
if (bodies.length === 0) {
return null;
}
const vertices = [];
bodies.forEach(body => vertices.push(...body.vertices));
return Bounds.create(vertices);
};

const updateSelectionVisuals = () => {
    const allRenderable = Composite.allBodies(world).concat(Composite.allBodies(masterComposite)).concat(Composite.allConstraints(world)).concat(Composite.allConstraints(masterComposite));
    
    // Reset all styles
    allRenderable.forEach(item => {
        if (item.render) {
            item.render.lineWidth = item.type === 'constraint' ? 2 : 1; // constraints have a thin line, bodies have none
            item.render.strokeStyle = '#999';
        }
    });

    // Highlight bodies selected for constraint creation
    selectedBodies.forEach(body => { 
        if (body.render) {
            body.render.strokeStyle = '#F4B400'; 
            body.render.lineWidth = 3; 
        }
    });

    // Highlight multi-selection group (for creating compounds)
    if (selectionGroup.length > 1) {
        selectionGroup.forEach(item => {
            if (item.render) {
                item.render.strokeStyle = '#4285F4'; // Blue for multi-select
                item.render.lineWidth = 4;
            }
        });
    } 
    // Highlight a single selected object (could be simple or compound)
    else if (selectedObject) {
        const isCompound = selectedObject.parts.length > 1;
        // For compound bodies, highlight all parts
        const itemsToHighlight = isCompound ? selectedObject.parts : [selectedObject];
        itemsToHighlight.forEach(part => {
            if (part.render) {
                part.render.strokeStyle = isCompound ? '#DB4437' : '#F4B400'; // Red for compound, Yellow for single
                part.render.lineWidth = 4;
            }
        });
    } 
    // Highlight a single selected constraint
    else if (selectedConstraint) {
        if (selectedConstraint.render) {
            selectedConstraint.render.strokeStyle = '#F4B400';
            selectedConstraint.render.lineWidth = 4;
        }
    }

    // Highlight a selected composite
    if (selectedComposite) {
        const allBodies = Composite.allBodies(selectedComposite);
        const allConstraints = Composite.allConstraints(selectedComposite);
        allBodies.forEach(body => { 
            if (body.render && body !== selectedObject) { // Don't override the single selected object highlight
                body.render.strokeStyle = '#0F9D58'; 
                body.render.lineWidth = 4; 
            }
        });
        allConstraints.forEach(c => { 
            if (c.render && c !== selectedConstraint) {
                c.render.strokeStyle = '#0F9D58'; 
                c.render.lineWidth = 4; 
            }
        });
    }
};

const deselectAll = (keepSelectionGroup = false) => {
    selectedBodies = []; 
    selectedConstraint = null; 
    selectedObject = null;
    selectedComposite = null;
    if (!keepSelectionGroup) {
        selectionGroup = [];
    }
    showEditor('new'); 
    updateSelectionVisuals();
    updateCompositeLists();
    updateConstraintList();
    updateCompoundUI(); // Add this line
};

let isDragging = false;
const dragThreshold = 5;

render.canvas.addEventListener('mousemove', function(event) {
    if (isBuildMode && draggingBody) {
        const currentMousePosition = { x: event.offsetX, y: event.offsetY };
        Body.setPosition(draggingBody, currentMousePosition);
    }
});

 render.canvas.addEventListener('mousedown', function(event) {
    if (isBuildMode) {
        mouseDownPosition = { x: event.offsetX, y: event.offsetY };
        const mousePosition = { x: event.offsetX, y: event.offsetY };
        const clickedBodies = Query.point(world.bodies, mousePosition);
        
        if (clickedBodies.length > 0) {
            clickedBody = clickedBodies[0];
            isDragging = false;
        } else {
            clickedBody = null;
            deselectAll();
        }
        event.preventDefault();
    }
});


render.canvas.addEventListener('mouseup', function(event) {
    if (isBuildMode) {
        if (isDragging) {
            isDragging = false;
            draggingBody = null;
        } else if (clickedBody) {
            deselectAll();

            const compositeParent = Composite.get(masterComposite, clickedBody.id, 'body');
            if (compositeParent) {
                selectedComposite = compositeParent;
                showEditor('composite');
                compositeNameInput.value = selectedComposite.label;
            } else {
                selectedObject = clickedBody;
                showEditor('object');
                populateEditor(selectedObject);
            }
            updateSelectionVisuals();
        }
        clickedBody = null;
        mouseDownPosition = null;
    }
});

// --- UNIFIED SELECTION LOGIC ---
render.canvas.addEventListener('mousedown', function(event) {
if (isBuildMode) return;

const mousePosition = { x: event.offsetX, y: event.offsetY };
const clickTolerance = 5;

const isSameClick = lastClickPosition.x !== null && 
                    Vector.magnitude(Vector.sub(mousePosition, lastClickPosition)) < clickTolerance;

let candidates = [];

const allBodies = Composite.allBodies(world).concat(Composite.allBodies(masterComposite));
const bodiesUnderMouse = Query.point(allBodies, mousePosition);
candidates.push(...bodiesUnderMouse);

const allConstraints = Composite.allConstraints(world).concat(Composite.allConstraints(masterComposite));
for (const constraint of allConstraints) {
    if (!constraint.bodyA || !constraint.bodyB) continue;
    if (distToSegment(mousePosition, constraint.bodyA.position, constraint.bodyB.position) < 10) {
        candidates.push(constraint);
    }
}

if (event.button === 0) { // Left-click for selection
    if (candidates.length > 0) {
        if (isSameClick) {
            candidateIndex = (candidateIndex + 1) % candidates.length;
        } else {
            candidateIndex = 0;
        }

        const selectedItem = candidates[candidateIndex];

        if (event.shiftKey) {
            // Multi-select logic
            const index = selectionGroup.indexOf(selectedItem);
            if (index === -1) {
                selectionGroup.push(selectedItem);
            } else {
                selectionGroup.splice(index, 1);
            }
            // When multi-selecting, clear the single-item editor
            selectedObject = null;
            selectedConstraint = null;
            selectedComposite = null;
            showEditor('new');
        } else {
            // Single-select logic
            deselectAll();
            selectionGroup.push(selectedItem);

            if (selectedItem.type === 'body') {
                let parentComposite = null;
                for (const comp of masterComposite.composites) {
                    if (Composite.allBodies(comp).some(body => body.id === selectedItem.id)) {
                        parentComposite = comp;
                        break;
                    }
                }

                if (parentComposite) {
                    selectedComposite = parentComposite;
                    selectedObject = selectedItem; 
                    showEditor('composite-child');
                    compositeNameInput.value = selectedComposite.label;
                    document.getElementById('composite-id-display').textContent = selectedComposite.id;
                } else {
                    selectedObject = selectedItem;
                    showEditor('object');
                    populateEditor(selectedObject);
                }
            } else if (selectedItem.type === 'constraint') {
                let parentComposite = null;
                for (const comp of masterComposite.composites) {
                    if (Composite.allConstraints(comp).some(constraint => constraint.id === selectedItem.id)) {
                        parentComposite = comp;
                        break;
                    }
                }

                if (parentComposite) {
                    selectedComposite = parentComposite;
                    selectedConstraint = selectedItem;
                    showEditor('composite-child');
                    compositeNameInput.value = selectedComposite.label;
                    document.getElementById('composite-id-display').textContent = selectedComposite.id;
                } else {
                    selectedConstraint = selectedItem;
                    showEditor('constraint');
                    populateEditor(selectedConstraint);
                }
            }
        }
    } else {
        if (!event.shiftKey) {
            deselectAll();
        }
    }

    lastClickPosition = { x: mousePosition.x, y: mousePosition.y };
    updateSelectionVisuals();
    updateCompoundUI(); // Add this line
} 
else if (event.button === 2) { // Right-click for constraints
    const clickedBodies = Query.point(world.bodies, mousePosition);
    if (clickedBodies.length > 0) {
        const body = clickedBodies[0];
        const index = selectedBodies.indexOf(body);
        if (index === -1) {
            if (selectedBodies.length < 2) {
                selectedBodies.push(body);
                
                // If Ctrl is pressed, calculate and store the exact mouse click position
                if (event.ctrlKey) {
                    // pointA is a vector relative to the body's center
                    const point = Vector.sub(mousePosition, body.position);
                    constraintPoints.push(point);
                } else {
                    // Otherwise, use the default center point
                    constraintPoints.push({ x: 0, y: 0 });
                }
            }
        } else {
            selectedBodies.splice(index, 1);
            constraintPoints.splice(index, 1);
        }

        if (selectedBodies.length === 2) {
            // Calculate the distance between the two bodies
            const distance = Vector.magnitude(Vector.sub(selectedBodies[0].position, selectedBodies[1].position));
            
            // Use the stored custom points if they exist, otherwise default to {x: 0, y: 0}
            const newConstraint = Constraint.create({
                bodyA: selectedBodies[0],
                bodyB: selectedBodies[1],
                pointA: constraintPoints[0],
                pointB: constraintPoints[1],
                stiffness: 0.01, damping: 0.05, length: distance,
                render: { strokeStyle: '#999', lineWidth: 2 }
            });
            Composite.add(world, newConstraint);
            selectedBodies = [];
            constraintPoints = []; // Reset for the next constraint
        }
        updateSelectionVisuals();
    }
}
});

// --- CUSTOM RENDERING ---
Events.on(render, 'afterRender', function() {
    if (!selectedObject) return;
    const context = render.context;
    const geomCenterX = (selectedObject.bounds.min.x + selectedObject.bounds.max.x) / 2;
    const geomCenterY = (selectedObject.bounds.min.y + selectedObject.bounds.max.y) / 2;

    context.beginPath();
    context.arc(geomCenterX, geomCenterY, 5, 0, 2 * Math.PI);
    context.fillStyle = 'rgba(0, 255, 255, 0.7)';
    context.fill();

    context.beginPath();
    context.arc(selectedObject.position.x, selectedObject.position.y, 5, 0, 2 * Math.PI);
    context.fillStyle = 'rgba(255, 255, 0, 0.7)';
    context.fill();
});

render.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('resize', () => {
    render.canvas.width = window.innerWidth; render.canvas.height = window.innerHeight;
    render.options.width = window.innerWidth; render.options.height = window.innerHeight;
});
//EVENT LISTENER FOR CONSTRAINTS
document.getElementById('existing-constraint-list').addEventListener('change', (e) => {
const constraintId = e.target.value;

if (constraintId === 'new') {
deselectAll();
} else {
const allConstraints = Composite.allConstraints(world).concat(Composite.allConstraints(masterComposite));
const selectedItem = allConstraints.find(c => c.id == constraintId);
if (selectedItem) {
    deselectAll();
    selectedConstraint = selectedItem;
    showEditor('constraint');
    populateEditor(selectedConstraint);
    updateSelectionVisuals();
}
}
});
// --- INITIALIZATION ---
window.onload = function() {
    createCompoundBtn.addEventListener('click', createCompoundBody);
    breakCompoundBtn.addEventListener('click', breakCompoundBody);

    Composite.add(world, masterComposite); // Add master composite to the world
    updateCompositeLists();
    updateConstraintList();
    
};

