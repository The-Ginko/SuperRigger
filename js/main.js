// js/main.js
import { Matter } from './matter-alias.js';
import { engine, render, runner, setupScene, setupMouseConstraint, handleResize } from './physics.js';
import * as UIActions from './ui.js';
import * as Interactivity from './interaction.js';
import * as Actions from './actions.js';
import * as Serialization from './serialization.js';

/**
 * Main initialization function for the application.
 */
function init() {
    // Setup the basic physics world and objects
    setupScene();
    setupMouseConstraint();

    // Group functions from modules to pass as dependencies
    const uiFuncs = {
        showMessage: UIActions.showMessage,
        updateCompositeLists: UIActions.updateCompositeLists,
        updateConstraintList: UIActions.updateConstraintList,
        updateSelectionVisuals: UIActions.updateSelectionVisuals,
        updateCompoundUI: UIActions.updateCompoundUI,
        showEditor: UIActions.showEditor,
        populateEditor: UIActions.populateEditor
    };

    const actionFuncs = {
        addComposite: Actions.addComposite,
        deleteComposite: Actions.deleteComposite,
        removeFromComposite: Actions.removeFromComposite,
        createCompoundBody: Actions.createCompoundBody,
        breakCompoundBody: Actions.breakCompoundBody,
        assignToComposite: Actions.assignToComposite,
        deleteObject: Actions.deleteObject,
        deleteConstraint: Actions.deleteConstraint
    };
    
    const serializationFuncs = {
        saveComposite: Serialization.saveComposite,
        showLoadModal: Serialization.showLoadModal,
        loadComposite: Serialization.loadComposite
    };

    const interactionFuncs = {
        deselectAll: Interactivity.deselectAll
    };

    // Create a combined object for modules that need both UI and interaction functions
    const allUiFuncs = { ...uiFuncs, ...interactionFuncs };

    // Initialize modules, injecting dependencies
    UIActions.initUI(engine, actionFuncs, serializationFuncs, interactionFuncs);
    Actions.initActions(allUiFuncs);
    Interactivity.initInteractions(allUiFuncs);

    // Initial population of UI lists
    UIActions.updateCompositeLists();
    UIActions.updateConstraintList();

    window.addEventListener('resize', handleResize);
}

// Start the application once the window is loaded
document.addEventListener('DOMContentLoaded', () => {
    init();
    // Start the renderer and runner
    Matter.Render.run(render);
    Matter.Runner.run(runner, engine);
});