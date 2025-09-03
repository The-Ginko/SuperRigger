// js/serialization.js
import { Matter, MatterTools } from './matter-alias.js';
import state from './state.js';
import { showMessage, updateCompositeLists } from './ui.js';
import { runner, engine, masterComposite } from './physics.js';

const { Composite, Body, Runner } = Matter;
const { Serializer } = MatterTools;
const serializer = Serializer.create();

// --- Event Listeners for Load Modal ---
// We add these here to keep all serialization logic in one file.
document.addEventListener('DOMContentLoaded', () => {
    const loadModal = document.getElementById('load-modal');
    
    document.getElementById('confirm-load').addEventListener('click', () => {
        loadComposite();
    });

    document.getElementById('deny-load').addEventListener('click', () => {
        loadModal.style.display = 'none';
    });
});
// -----------------------------------------

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
    if (!jsonString) {
        showMessage("Text area is empty. Nothing to load.", 'info');
        return;
    }
    try {
        Runner.stop(runner);

        const newComposite = serializer.parse(jsonString);
        
        // --- FIX: Ensure the loaded composite has a unique label ---
        if (!newComposite.label || newComposite.label === "Composite") {
            newComposite.label = `Loaded Composite ${masterComposite.composites.length + 1}`;
        }
        // -----------------------------------------------------------

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