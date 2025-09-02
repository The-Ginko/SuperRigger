// js/state.js

// This object holds the shared state of the application.
const state = {
    selectedBodies: [],
    selectedConstraint: null,
    selectedObject: null,
    selectedComposite: null,
    selectionGroup: [],
    isBuildMode: false,
    constraintPoints: [],
    lastClickPosition: { x: null, y: null },
    candidateIndex: 0,
    draggingBody: null,
    mouseDownPosition: null,
    clickedBody: null,
    isDragging: false
};

export default state;
