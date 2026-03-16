# img2geojson

`img2geojson` is a browser tool for tracing an image over a map and exporting the result as GeoJSON.

This fork extends the original project with a split workflow UI, MapLibre support, image locking, per-feature management, and updated draw interactions for tracing work.

## Current Status

The app currently lets you:

- load an image from the file picker or by dragging it anywhere onto the page
- position the image over the map, control width, rotation, and opacity
- lock the image to the map so it follows pan, zoom, rotation, and pitch
- trace polygons and lines with either click-by-click points or right-drag freehand input
- keep a per-feature list for selecting, editing, renaming, downloading, and deleting individual features
- export either a single feature or the full collection as GeoJSON
- switch map provider between `MapLibre` and `Mapbox`
- switch base style between blank, base, and satellite
- jump quickly between Australia and Jordan presets

## Layout

- Left panel: drawing tools and feature list
- Right panel: image controls, map controls, style, region, provider, and help
- Map canvas: image overlay, traced geometry, and map interaction area

## Mouse And Tool Behavior

### Drawing

- `Polygon`: click to add points, or right-drag to sketch freehand
- `Line`: click to add points, or right-drag to sketch freehand
- click the active draw button again to leave draw mode
- polygon closes by clicking back on the starting point
- line drawing stays a line; it does not auto-close into a polygon

### Navigation

- left-drag pans the map, including while a draw tool is active
- mouse wheel zooms the map
- middle-drag rotates and pitches the map
- double middle click resets map rotation and pitch

### Editing

- select a feature from the list or with the map selection flow
- edit mode exposes vertices and midpoint handles
- click a feature name in the list to rename it inline
- use the feature action icons to select, edit, download, or delete one feature

## Image Workflow

1. Load an image.
2. Adjust image width, rotation, and opacity.
3. Move and zoom the map until the image is aligned.
4. Lock the image when you want it to stay attached to the map.
5. Trace the geometry.
6. Export the result as GeoJSON.

## Map Providers

### MapLibre

- default provider
- no token required
- uses raster basemaps
- search/geocoder stays disabled in this mode

### Mapbox

- optional provider
- requires `REACT_APP_MAPBOX_KEY`
- can be selected in the UI when the token is present

You can set the startup provider with:

```env
REACT_APP_MAP_PROVIDER=maplibre
```

or

```env
REACT_APP_MAP_PROVIDER=mapbox
```

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

Build production output:

```powershell
npm run build
```

## Notes

- the tracked `build/` output is configured for GitHub Pages under `/img2geojson/`
- locked image perspective is currently a visual approximation, not a full four-corner georeference warp
- MapLibre is the safer default because it does not depend on a token

## Credits

- Fork by Basel
- Original project by [@caseymmiller](https://twitter.com/caseymmiller)
