import DrawLineString from '@mapbox/mapbox-gl-draw/src/modes/draw_line_string';
import DrawPolygon from '@mapbox/mapbox-gl-draw/src/modes/draw_polygon';
import * as CommonSelectors from '@mapbox/mapbox-gl-draw/src/lib/common_selectors';
import createVertex from '@mapbox/mapbox-gl-draw/src/lib/create_vertex';
import doubleClickZoom from '@mapbox/mapbox-gl-draw/src/lib/double_click_zoom';
import * as Constants from '@mapbox/mapbox-gl-draw/src/constants';

const FREEHAND_POINT_SPACING_PX = 8;

function isRightButtonEvent(event) {
  const originalEvent = event && event.originalEvent;
  if (!originalEvent) {
    return false;
  }

  return originalEvent.button === 2 || (originalEvent.buttons & 2) === 2;
}

function preventDefault(event) {
  if (event && event.originalEvent && typeof event.originalEvent.preventDefault === 'function') {
    event.originalEvent.preventDefault();
  }
}

function getEventPoint(event) {
  return event && event.point ? event.point : null;
}

function shouldCommitFreehandPoint(state, event) {
  const point = getEventPoint(event);

  if (!point || !state.lastCommittedPoint) {
    return true;
  }

  const deltaX = point.x - state.lastCommittedPoint.x;
  const deltaY = point.y - state.lastCommittedPoint.y;

  return Math.sqrt(deltaX * deltaX + deltaY * deltaY) >= FREEHAND_POINT_SPACING_PX;
}

const FreehandPolygonMode = Object.assign({}, DrawPolygon);

FreehandPolygonMode.onSetup = function() {
  const polygon = this.newFeature({
    type: Constants.geojsonTypes.FEATURE,
    properties: {},
    geometry: {
      type: Constants.geojsonTypes.POLYGON,
      coordinates: [[]]
    }
  });

  this.addFeature(polygon);
  this.clearSelectedFeatures();
  doubleClickZoom.disable(this);
  this.updateUIClasses({ mouse: Constants.cursors.ADD });
  this.activateUIButton(Constants.types.POLYGON);
  this.setActionableState({
    trash: true
  });

  return {
    polygon,
    currentVertexPosition: 0,
    dragMoving: false,
    lastCommittedPoint: null
  };
};

FreehandPolygonMode.onMouseDown = function(state, event) {
  if (!isRightButtonEvent(event)) {
    return;
  }

  preventDefault(event);
  state.dragMoving = true;
  state.lastCommittedPoint = null;
  this.updateUIClasses({ mouse: Constants.cursors.ADD });
};

FreehandPolygonMode.commitDragCoordinate = function(state, event, force) {
  const shouldCommit = force || shouldCommitFreehandPoint(state, event);

  state.polygon.updateCoordinate(`0.${state.currentVertexPosition}`, event.lngLat.lng, event.lngLat.lat);

  if (!shouldCommit) {
    return;
  }

  state.lastCommittedPoint = getEventPoint(event);
  state.currentVertexPosition += 1;
  state.polygon.updateCoordinate(`0.${state.currentVertexPosition}`, event.lngLat.lng, event.lngLat.lat);
};

FreehandPolygonMode.onMouseMove = function(state, event) {
  if (state.dragMoving && isRightButtonEvent(event)) {
    preventDefault(event);
    this.commitDragCoordinate(state, event, false);
    return;
  }

  state.polygon.updateCoordinate(`0.${state.currentVertexPosition}`, event.lngLat.lng, event.lngLat.lat);
  if (CommonSelectors.isVertex(event)) {
    this.updateUIClasses({ mouse: Constants.cursors.POINTER });
    return;
  }

  this.updateUIClasses({ mouse: Constants.cursors.ADD });
};

FreehandPolygonMode.onMouseUp = function(state, event) {
  if (!state.dragMoving) {
    return;
  }

  preventDefault(event);
  this.commitDragCoordinate(state, event, true);
  state.dragMoving = false;
  state.lastCommittedPoint = null;
  this.updateUIClasses({ mouse: Constants.cursors.ADD });
};

FreehandPolygonMode.onTap = FreehandPolygonMode.onClick = function(state, event) {
  if (isRightButtonEvent(event)) {
    return;
  }

  if (CommonSelectors.isVertex(event)) {
    return this.clickOnVertex(state, event);
  }

  return this.clickAnywhere(state, event);
};

const FreehandLineMode = Object.assign({}, DrawLineString);

FreehandLineMode.onSetup = function(opts) {
  opts = opts || {};

  const featureId = opts.featureId;
  let line;
  let currentVertexPosition;
  let direction = 'forward';

  if (featureId) {
    line = this.getFeature(featureId);
    if (!line) {
      throw new Error('Could not find a feature with the provided featureId');
    }

    let from = opts.from;
    if (from && from.type === 'Feature' && from.geometry && from.geometry.type === 'Point') {
      from = from.geometry;
    }
    if (from && from.type === 'Point' && from.coordinates && from.coordinates.length === 2) {
      from = from.coordinates;
    }
    if (!from || !Array.isArray(from)) {
      throw new Error('Please use the `from` property to indicate which point to continue the line from');
    }

    const lastCoord = line.coordinates.length - 1;
    if (line.coordinates[lastCoord][0] === from[0] && line.coordinates[lastCoord][1] === from[1]) {
      currentVertexPosition = lastCoord + 1;
      line.addCoordinate(currentVertexPosition, ...line.coordinates[lastCoord]);
    } else if (line.coordinates[0][0] === from[0] && line.coordinates[0][1] === from[1]) {
      direction = 'backwards';
      currentVertexPosition = 0;
      line.addCoordinate(currentVertexPosition, ...line.coordinates[0]);
    } else {
      throw new Error('`from` should match the point at either the start or the end of the provided LineString');
    }
  } else {
    line = this.newFeature({
      type: Constants.geojsonTypes.FEATURE,
      properties: {},
      geometry: {
        type: Constants.geojsonTypes.LINE_STRING,
        coordinates: []
      }
    });
    currentVertexPosition = 0;
    this.addFeature(line);
  }

  this.clearSelectedFeatures();
  doubleClickZoom.disable(this);
  this.updateUIClasses({ mouse: Constants.cursors.ADD });
  this.activateUIButton(Constants.types.LINE);
  this.setActionableState({
    trash: true
  });

  return {
    line,
    currentVertexPosition,
    direction,
    dragMoving: false,
    lastCommittedPoint: null
  };
};

FreehandLineMode.onMouseDown = function(state, event) {
  if (!isRightButtonEvent(event)) {
    return;
  }

  preventDefault(event);
  state.dragMoving = true;
  state.lastCommittedPoint = null;
  this.updateUIClasses({ mouse: Constants.cursors.ADD });
};

FreehandLineMode.commitDragCoordinate = function(state, event, force) {
  const shouldCommit = force || shouldCommitFreehandPoint(state, event);

  state.line.updateCoordinate(state.currentVertexPosition, event.lngLat.lng, event.lngLat.lat);

  if (!shouldCommit) {
    return;
  }

  state.lastCommittedPoint = getEventPoint(event);

  if (state.direction === 'forward') {
    state.currentVertexPosition += 1;
    state.line.updateCoordinate(state.currentVertexPosition, event.lngLat.lng, event.lngLat.lat);
    return;
  }

  state.line.addCoordinate(0, event.lngLat.lng, event.lngLat.lat);
};

FreehandLineMode.onMouseMove = function(state, event) {
  if (state.dragMoving && isRightButtonEvent(event)) {
    preventDefault(event);
    this.commitDragCoordinate(state, event, false);
    return;
  }

  state.line.updateCoordinate(state.currentVertexPosition, event.lngLat.lng, event.lngLat.lat);
  if (CommonSelectors.isVertex(event)) {
    this.updateUIClasses({ mouse: Constants.cursors.POINTER });
    return;
  }

  this.updateUIClasses({ mouse: Constants.cursors.ADD });
};

FreehandLineMode.onMouseUp = function(state, event) {
  if (!state.dragMoving) {
    return;
  }

  preventDefault(event);
  this.commitDragCoordinate(state, event, true);
  state.dragMoving = false;
  state.lastCommittedPoint = null;
  this.updateUIClasses({ mouse: Constants.cursors.ADD });
};

FreehandLineMode.onTap = FreehandLineMode.onClick = function(state, event) {
  if (isRightButtonEvent(event)) {
    return;
  }

  if (CommonSelectors.isVertex(event)) {
    return this.clickOnVertex(state, event);
  }

  return this.clickAnywhere(state, event);
};

FreehandLineMode.toDisplayFeatures = function(state, geojson, display) {
  const isActiveLine = geojson.properties.id === state.line.id;
  geojson.properties.active = isActiveLine ? Constants.activeStates.ACTIVE : Constants.activeStates.INACTIVE;
  if (!isActiveLine) {
    return display(geojson);
  }

  if (geojson.geometry.coordinates.length < 2) {
    return;
  }

  geojson.properties.meta = Constants.meta.FEATURE;
  display(createVertex(
    state.line.id,
    geojson.geometry.coordinates[state.direction === 'forward' ? geojson.geometry.coordinates.length - 2 : 1],
    `${state.direction === 'forward' ? geojson.geometry.coordinates.length - 2 : 1}`,
    false
  ));

  display(geojson);
};

export { FreehandLineMode, FreehandPolygonMode };
