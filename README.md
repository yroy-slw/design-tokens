# GE-Design-tokens Plugin

The **GE-Design-tokens Plugin** is a specialized tool for the GE-DESIGN system that automates the extraction of Figma Variables into a structured JSON format. It is designed to bridge the gap between design tokens defined in Figma and their technical implementation in codebases.

## Purpose

The primary goal of this plugin is to provide a clean, reliable, and resolved export of design tokens. It handles the complexities of the Figma Variables API, ensuring that aliases and multiple modes (such as Light and Dark themes) are correctly translated into a developer-friendly JSON structure.

## Key Features

* **Advanced Alias Resolution**: Recursively resolves variable references (aliases) to their primitive values.
* **Multi-Mode Support**: Traverses all modes within a variable collection and organizes them into separate logical branches.
* **Dynamic Color Formatting**: Converts Figma's internal RGBA format into standard CSS Hex codes or RGBA strings.
* **Automated Unit Management**: Intelligent handling of float values—dimensions automatically receive "px" units, while opacities and font weights remain unitless.
* **Deep Path Nesting**: Supports both forward slash (/) and dot (.) notation in variable names to create deeply nested JSON objects.
* **Input Sanitization**: Automatically slugifies variable and collection names for predictable and valid JSON keys.

## Technical Logic

### Variable Resolution
The plugin implements a safe recursion algorithm to resolve variable aliases. To prevent infinite loops caused by circular references in Figma, the resolution depth is capped at five levels.

### Object Construction
The export process follows the internal naming hierarchy. For example, a variable named `color/brand/primary` in a collection named `Primitives` under the `Light` mode will be exported to:
`primitives.light.color.brand.primary.value`

### Safety and Error Handling
The plugin includes a fallback mechanism: if a value is missing for a specific mode, it attempts to retrieve the value from the first available mode in the collection to prevent null pointers in the generated tokens.

## Installation

1. In Figma, navigate to **Plugins > Development > New Plugin**.
2. Point the manifest to the directory containing your compiled `code.js` and `ui.html`.
3. Install dependencies:
   ```bash
   npm install
   ```

## Usage

1. Open the plugin within a Figma file containing Local Variables.
2. The extraction process starts automatically upon UI initialization.
3. The plugin will notify the user of the total number of processed variables and the duration of the task.
4. The resulting JSON payload is sent to the UI for copying or further processing.

## Technical Stack

* **Environment**: Figma Plugin API
* **Language**: TypeScript
* **Target**: ECMAScript 2017+
* **Data Format**: W3C Design Token Community Group (DTCG) inspired JSON