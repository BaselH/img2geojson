# img2geojson

`img2geojson` is a browser-based tracing tool for lining up an image over a map and exporting the traced result as GeoJSON.

This fork extends the original project with a split-panel tracing UI, MapLibre support, image locking, image warping controls, per-feature management, clipboard import/export, and updated drawing interactions.

## What The App Can Do

- load an image from the upload button or by dragging it onto the page
- load GeoJSON from upload, drag and drop, or normal clipboard paste
- align an image using width, height, rotation, opacity, aspect-ratio lock, reset proportions, and perspective X/Y/Z
- lock the image to the map so it follows pan, zoom, rotate, and pitch
- trace polygons, lines, and single markers
- use click-by-click drawing or right-drag freehand drawing for polygons and lines
- keep a feature list with select, edit, rename, copy, download, and delete actions
- export one feature or the full collection as GeoJSON
- copy GeoJSON with buttons or normal `Ctrl/Cmd+C`
- paste GeoJSON with normal `Ctrl/Cmd+V`
- switch between `MapLibre` and `Mapbox`
- switch basemap style between `Blank`, `Base`, and `Satellite`
- jump between Australia and Jordan presets
- centre the map from typed coordinates

## Layout

- Left panel: drawing tools, import/export actions, and feature list
- Right panel: image controls, zoom, opacity, region, style, provider, and map settings
- Map canvas: basemap, traced features, and image alignment area
- Help overlay: full in-app usage guide from the `i` button

## Quick Start

1. Upload an image or drag one onto the page.
2. Adjust width, height, rotation, opacity, and perspective until it lines up with the map.
3. Lock the image when you want it attached to the map.
4. Draw polygons, lines, or markers.
5. Rename features if needed.
6. Download or copy the GeoJSON.

## Controls

### Mouse

- Left drag pans the map, even while a draw tool is active.
- Left click adds precise points while drawing.
- Right drag freehands the active polygon or line tool.
- Middle drag rotates and pitches the map.
- Double middle click resets bearing and pitch.
- Mouse wheel zooms the map normally.

### Keyboard

- Arrow keys pan the map.
- Hold `Ctrl` with arrow keys for very small pan nudges.
- `Ctrl/Cmd+C` copies GeoJSON when focus is not inside a text field.
- `Ctrl/Cmd+V` pastes GeoJSON when focus is not inside a text field.

## Drawing Workflow

### Polygon

- click to place points
- right-drag to sketch freehand
- click the starting point to close the polygon
- click the polygon tool again to leave draw mode

### Line

- click to place points
- right-drag to sketch freehand
- line drawing stays a line; it does not auto-close into a polygon
- click the line tool again to leave draw mode

### Marker

- click once to place a single point feature

### Editing

- select a feature from the list to focus it
- use edit mode to expose vertices and midpoint handles
- click a feature name to rename it inline
- delete removes the selected feature or active sketch

## Image Controls

- `Width`: stretch horizontally
- `Height`: stretch vertically
- `Aspect lock`: keep natural image proportions while resizing
- `Reset proportions`: restore natural proportions and clear perspective warping
- `Rotation`: rotate the image
- `Perspective X`: skew left/right corners
- `Perspective Y`: skew top/bottom corners
- `Perspective Z`: make the top thinner and bottom wider, or the reverse
- `Image opacity`: fade the image while tracing

### Locking

- `Lock image to map` converts the current on-screen image shape into a map-native image layer below the draw layers
- `Unlock from map` returns the image to the editable screen overlay
- locking preserves the current transformed image quad as closely as possible
- partially off-screen images are supported, but extreme off-screen lock attempts may be rejected for safety instead of guessed

## GeoJSON Import And Export

### Import

- image upload asks before replacing the current image
- GeoJSON upload appends features to the existing collection
- pasted GeoJSON also appends features
- re-importing the same GeoJSON creates a new copy instead of overwriting the old one

### Export

- `Download`: save the full collection as `data.geojson`
- `Copy`: copy the selected feature if one is selected, otherwise copy the full collection
- per-feature action buttons can also copy or download one feature

### Naming

Feature names are written to these properties for better compatibility with external tools such as `geojson.io/next` and Datawrapper:

- `label`
- `name`
- `title`

## Map Options

### Regions

- Australia preset
- Jordan preset
- typed coordinates in `latitude, longitude` format, for example:

```text
32.0844629063387, 35.913167314100065
```

### Styles

- `Blank`
- `Base`
- `Satellite`

### Providers

#### MapLibre

- default provider
- no token required
- uses OpenStreetMap raster tiles
- search/geocoder stays disabled in this mode

#### Mapbox

- optional provider
- requires `REACT_APP_MAPBOX_KEY`
- available when the token is set

## Local Development

Install dependencies:

```powershell
npm install
```

Optional `.env` values:

```env
REACT_APP_MAPBOX_KEY=your_mapbox_public_token_here
REACT_APP_MAP_PROVIDER=maplibre
```

Run the development server:

```powershell
npm start
```

Create a production build:

```powershell
npm run build
```

## Deployment

- the production build is currently configured for hosting under `/projects/img2geojson`
- upload the contents of `build/` to your server path for that location
- if the deploy path changes, update the `homepage` field in `package.json`

## Notes

- Map opacity affects only the basemap, so traced features remain visible
- locked images use a four-corner map image source, not a full georeferencing warp tool
- the app is designed for tracing and alignment, not full GIS rectification
- MapLibre is the safer default because it does not require a token

## Credits

- Fork by Basel
- Original project by [@caseymmiller](https://twitter.com/caseymmiller) - [GitHub](https://github.com/caseymm/img2geojson)
