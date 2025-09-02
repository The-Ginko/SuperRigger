// js/main.js
import { Matter } from './matter-alias.js';
import { engine, world, render, runner, setupScene, setupMouseConstraint, masterComposite } from './physics.js';
import * as UIActions from './ui.js';
import * as Interactivity from './interaction.js';
import * as Actions from './actions.js';
import * as Serialization from './serialization.js';

const { Events } = Matter;

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
        assignToComposite: Actions.assignToComposite
    };
    
    const serializationFuncs = {
        saveComposite: Serialization.saveComposite,
        showLoadModal: Serialization.showLoadModal,
        loadComposite: Serialization.loadComposite
    };

    // Initialize modules, injecting dependencies
    UIActions.initUI(engine, world, masterComposite, actionFuncs, serializationFuncs);
    Actions.initActions(uiFuncs);
    Interactivity.initInteractions(render, world, masterComposite, uiFuncs);

    // Initial population of UI lists
    UIActions.updateCompositeLists();
    UIActions.updateConstraintList();
}

// Start the application once the window is loaded
document.addEventListener('DOMContentLoaded', () => {
    init();
});

