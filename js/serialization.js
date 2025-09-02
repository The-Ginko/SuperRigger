// js/serialization.js
import { Matter, MatterTools } from './matter-alias.js';

import state from './state.js';
import { showMessage, updateCompositeLists } from './ui.js';
import { runner, masterComposite } from './physics.js';

const { Composite, Body, Runner } = Matter;
const { Serializer } = MatterTools;
const serializer = Serializer.create();

export function saveComposite() {
    if (!state.selectedComposite) {
        showMessage("No composite selected to save.", 'error');
        return;
    }
    try {
        const jsonString = Serializer.serialise(serializer, state.selectedComposite, 2);
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

export function showLoadModal() {
    document.getElementById('load-modal').style.display = 'flex';
}

export function loadComposite() {
    const jsonString = document.getElementById('load-textarea').value;
    try {
        Runner.stop(runner);

        const newComposite = serializer.parse(jsonString);
        Composite.rebase(newComposite);

        Composite.allBodies(newComposite).forEach(body => {
            Body.set(body, 'collisionFilter', { 
                group: body.collisionFilter.group,
                category: body.collisionFilter.category,
                mask: body.collisionFilter.mask
            });
        });

        Composite.add(masterComposite, newComposite);
        updateCompositeLists();
        document.getElementById('load-modal').style.display = 'none';
        showMessage("Composite loaded successfully!");

        Runner.run(runner, engine);
    } catch (err) {
        showMessage("Invalid JSON string.", 'error');
        console.error("Deserialization error: ", err);
        Runner.run(runner, engine);
    }
}
