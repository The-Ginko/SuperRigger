// js/matter-alias.js
// This module grabs the globally available Matter and MatterTools objects
// that are loaded from the CDN scripts in index.html.
// It then exports them so that other ES modules can import them cleanly.

const Matter = window.Matter;
const MatterTools = window.MatterTools;

export { Matter, MatterTools };

