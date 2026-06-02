/**
 * GE-Design-tokens Plugin
 * Extracts local variables and collections into a structured JSON format 
 * compatible with Design Token standards. Handles Aliases and Multi-mode resolution.
 */

figma.showUI(__html__, { width: 500, height: 700 });

/**
 * Sanitizes strings for JSON keys by converting to lowercase, 
 * trimming, and removing non-standard characters.
 * @param {string} text - The raw string to transform.
 * @returns {string} - A URL-friendly slug.
 */
function slugify(text: string): string {
  if (!text) return "unnamed";
  return text.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9\-\.]/g, ''); 
}

/**
 * Converts a Figma RGBA color object to a standard CSS string (Hex or RGBA).
 * @param {RGBA} color - The RGBA object from Figma (values 0-1).
 * @returns {string} - The formatted color string.
 */
function formatColor(color: RGBA): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  
  if (color.a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${color.a.toFixed(4)})`;
  }
  
  const toHex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toLowerCase();
}

/**
 * Recursively resolves a variable's value for a specific mode.
 * Handles Variable Aliases with a depth safety check.
 * @param {Variable} variable - The Figma variable to resolve.
 * @param {string} modeId - The specific mode ID to use.
 * @param {number} [depth=0] - Current recursion depth.
 * @returns {Promise<any>} - The resolved primitive value (string, number, or hex).
 */
async function resolveValue(variable: Variable, modeId: string, depth = 0): Promise<any> {
  // Safety check to prevent infinite loops from circular references
  if (depth > 5) return "[Error: Too Deep]";

  let rawValue = variable.valuesByMode[modeId];

  // Fallback: If no value for current mode, use the first available mode
  if (rawValue === undefined || rawValue === null) {
    const altModes = Object.keys(variable.valuesByMode);
    if (altModes.length > 0) rawValue = variable.valuesByMode[altModes[0]];
  }

  if (rawValue === undefined || rawValue === null) return null;

  // Handle Variable Aliases (references to other variables)
  if (typeof rawValue === 'object' && 'type' in rawValue && rawValue.type === "VARIABLE_ALIAS") {
    try {
      const targetVar = await figma.variables.getVariableByIdAsync(rawValue.id);
      if (targetVar) return await resolveValue(targetVar, modeId, depth + 1);
      return "[Error: Alias Target Missing]";
    } catch (e) {
      return "[Error: Alias Resolution]";
    }
  }

  // Formatting based on resolved type
  if (variable.resolvedType === 'COLOR') return formatColor(rawValue as RGBA);
  
  if (variable.resolvedType === 'FLOAT') {
    const name = variable.name.toLowerCase();
    const noUnit = name.includes('weight') || name.includes('opacity');
    return noUnit ? String(rawValue) : `${rawValue}px`;
  }
  
  return String(rawValue);
}

/**
 * Creates or updates nested objects based on a path string.
 * Supports both forward slash and dot notation.
 * @param {any} obj - The target object.
 * @param {string} path - The token path (e.g., "color/brand/primary").
 * @param {any} value - The value to store at the end of the path.
 */
function setNestedProperty(obj: any, path: string, value: any) {
  const parts = path.split(/[\/\.]/).map(p => slugify(p));
  let current = obj;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    
    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {};
    }
    
    if (i === parts.length - 1) {
      current[part].value = value;
    } else {
      current = current[part];
    }
  }
}

/**
 * Main export function. 
 * Iterates through all local variables and collections to build 
 * the final token structure.
 */
async function runExport() {
  console.log("🚀 Starting token extraction...");
  try {
    const localVariables = await figma.variables.getLocalVariablesAsync();
    const localCollections = await figma.variables.getLocalVariableCollectionsAsync();

    const exportData: any = {};
    const colMap = new Map();
    localCollections.forEach(c => colMap.set(c.id, c));

    let processed = 0;

    for (const variable of localVariables) {
      const collection = colMap.get(variable.variableCollectionId);
      if (!collection) continue;

      const colKey = slugify(collection.name);
      if (!exportData[colKey]) exportData[colKey] = {};

      for (const mode of collection.modes) {
        const modeKey = slugify(mode.name);
        if (!exportData[colKey][modeKey]) exportData[colKey][modeKey] = {};

        try {
          const val = await resolveValue(variable, mode.modeId);
          if (val !== null) {
            setNestedProperty(exportData[colKey][modeKey], variable.name, val);
          }
        } catch (vErr) {
          console.warn(`Skipping variable ${variable.name} due to resolution error`);
        }
      }
      processed++;
    }

    figma.ui.postMessage({ 
      type: 'TOKENS_EXTRACTED', 
      payload: exportData,
      stats: {
        count: processed,
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }
    });

  } catch (err) {
    console.error("❌ Critical error during extraction:", err);
    figma.ui.postMessage({ type: 'ERROR', payload: "Fatal error during extraction." });
  }
}

/**
 * Global message listener.
 */
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'UI_READY') {
    await runExport();
  }
};