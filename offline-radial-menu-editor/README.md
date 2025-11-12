# Plasticity Radial Menu Editor (Offline bundle)

This directory contains a self-contained, browser-based editor for building Plasticity radial menu presets. Every dependency is bundled locally so the tool can run without an internet connection.

## Usage

1. Copy the entire `offline-radial-menu-editor` directory to a machine inside your internal network.
2. Open the `index.html` file in any modern browser (Chrome, Edge, Firefox, Safari).
3. Add slices, edit their labels, colours, key bindings, and commands.
4. Export the preset as JSON and import it into Plasticity.

The editor automatically saves your work to `localStorage`, so your latest session will be restored the next time you open the page from the same browser.

## Importing existing presets

The tool accepts JSON files with the following structure:

```json
{
  "meta": {
    "innerRadius": 0.35,
    "gapAngle": 2,
    "backgroundColor": "#1b1d26"
  },
  "items": [
    {
      "label": "Modeling",
      "command": "Loft",
      "keybind": "Shift+1",
      "icon": "M",
      "color": "#6dcff6",
      "weight": 1
    }
  ]
}
```

The editor ignores unknown properties, so you can import data exported from older versions as long as they include an `items` array.

## Development notes

The application is written in plain HTML, CSS, and JavaScript to avoid network-bound package managers. The canvas preview updates live as you modify slices, and all helpers (such as JSON export and clipboard copy) are implemented without third-party libraries to keep the bundle lightweight and portable.
