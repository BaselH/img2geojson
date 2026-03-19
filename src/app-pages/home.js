import React, { Component } from 'react';
import * as turf from '@turf/turf';
import {
  getMapProviderNotice,
  getMapProviderOptions,
  getInitialMapProvider,
  getProviderStyle,
  loadMapProvider,
  MAP_PROVIDERS,
  persistMapProvider,
  resolveProvider
} from '../map/provider';
import { FreehandLineMode, FreehandPolygonMode } from '../map/drawModes';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_KEY;
const HAS_MAPBOX_TOKEN = Boolean(MAPBOX_TOKEN);
const REGION_PRESETS = {
  australia: {
    label: 'Australia',
    lng: 134.5,
    lat: -25.7,
    zoom: 3.6
  },
  middleEast: {
    label: 'Middle East',
    lng: 41,
    lat: 29,
    zoom: 4.2
  }
};
const LAYER_OPACITY_PROPERTIES = {
  background: ['background-opacity'],
  circle: ['circle-opacity'],
  fill: ['fill-opacity'],
  'fill-extrusion': ['fill-extrusion-opacity'],
  heatmap: ['heatmap-opacity'],
  line: ['line-opacity'],
  raster: ['raster-opacity'],
  sky: ['sky-opacity'],
  symbol: ['icon-opacity', 'text-opacity']
};
const LOCKED_IMAGE_SOURCE_ID = 'img2geojson-locked-image';
const LOCKED_IMAGE_LAYER_ID = 'img2geojson-locked-image-layer';
const COORDINATE_SEARCH_ZOOM = 15;
const GEOMETRY_LABELS = {
  Point: 'Marker',
  LineString: 'Line',
  Polygon: 'Polygon'
};
const RANGE_FIELD_CONFIG = {
  mapOpacity: { min: 0, max: 1, step: 0.01, decimals: 2, suffix: '' },
  imageOpacity: { min: 0, max: 1, step: 0.01, decimals: 2, suffix: '' },
  imageWidth: { min: 100, max: 2000, step: 1, decimals: 0, suffix: '' },
  imageHeight: { min: 100, max: 2000, step: 1, decimals: 0, suffix: '' },
  imageRotation: { min: -180, max: 180, step: 1, decimals: 0, suffix: 'deg' },
  imagePerspectiveX: { min: -400, max: 400, step: 1, decimals: 0, suffix: 'px' },
  imagePerspectiveY: { min: -400, max: 400, step: 1, decimals: 0, suffix: 'px' },
  imagePerspectiveZ: { min: -400, max: 400, step: 1, decimals: 0, suffix: 'px' }
};
const DEFAULT_RANGE_VALUES = {
  mapOpacity: 1,
  imageOpacity: 0.5,
  imageWidth: 800,
  imageRotation: 0,
  imagePerspectiveX: 0,
  imagePerspectiveY: 0,
  imagePerspectiveZ: 0
};

const DRAW_STYLES = [
  {
    id: 'gl-draw-polygon-fill-inactive',
    type: 'fill',
    filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
    paint: {
      'fill-color': '#312E81',
      'fill-outline-color': '#312E81',
      'fill-opacity': 0.3
    }
  },
  {
    id: 'gl-draw-polygon-fill-active',
    type: 'fill',
    filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
    paint: {
      'fill-color': '#312E81',
      'fill-outline-color': '#312E81',
      'fill-opacity': 0.3
    }
  },
  {
    id: 'gl-draw-polygon-midpoint',
    type: 'circle',
    filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
    paint: {
      'circle-radius': 4,
      'circle-color': '#F59E0B',
      'circle-opacity': 0.95,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#312E81'
    }
  },
  {
    id: 'gl-draw-polygon-stroke-inactive',
    type: 'line',
    filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': '#312E81',
      'line-width': 3
    }
  },
  {
    id: 'gl-draw-polygon-stroke-active',
    type: 'line',
    filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': '#312E81',
      'line-width': 3
    }
  },
  {
    id: 'gl-draw-line-inactive',
    type: 'line',
    filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': '#312E81',
      'line-width': 3
    }
  },
  {
    id: 'gl-draw-line-active',
    type: 'line',
    filter: ['all', ['==', '$type', 'LineString'], ['==', 'active', 'true']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': '#312E81',
      'line-width': 3
    }
  },
  {
    id: 'gl-draw-polygon-and-line-vertex-stroke-inactive',
    type: 'circle',
    filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
    paint: {
      'circle-radius': 7,
      'circle-color': '#312E81'
    }
  },
  {
    id: 'gl-draw-polygon-and-line-vertex-inactive',
    type: 'circle',
    filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
    paint: {
      'circle-radius': 4,
      'circle-color': '#F8FAFC'
    }
  },
  {
    id: 'gl-draw-point-point-stroke-inactive',
    type: 'circle',
    filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Point'], ['==', 'meta', 'feature'], ['!=', 'mode', 'static']],
    paint: {
      'circle-radius': 7,
      'circle-opacity': 1,
      'circle-color': '#312E81'
    }
  },
  {
    id: 'gl-draw-point-inactive',
    type: 'circle',
    filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Point'], ['==', 'meta', 'feature'], ['!=', 'mode', 'static']],
    paint: {
      'circle-radius': 4,
      'circle-color': '#F8FAFC'
    }
  },
  {
    id: 'gl-draw-point-stroke-active',
    type: 'circle',
    filter: ['all', ['==', '$type', 'Point'], ['==', 'active', 'true'], ['!=', 'meta', 'midpoint']],
    paint: {
      'circle-radius': 8,
      'circle-color': '#312E81'
    }
  },
  {
    id: 'gl-draw-point-active',
    type: 'circle',
    filter: ['all', ['==', '$type', 'Point'], ['!=', 'meta', 'midpoint'], ['==', 'active', 'true']],
    paint: {
      'circle-radius': 5,
      'circle-color': '#F8FAFC'
    }
  },
  {
    id: 'gl-draw-polygon-fill-static',
    type: 'fill',
    filter: ['all', ['==', 'mode', 'static'], ['==', '$type', 'Polygon']],
    paint: {
      'fill-color': '#312E81',
      'fill-outline-color': '#312E81',
      'fill-opacity': 0.3
    }
  },
  {
    id: 'gl-draw-polygon-stroke-static',
    type: 'line',
    filter: ['all', ['==', 'mode', 'static'], ['==', '$type', 'Polygon']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': '#312E81',
      'line-width': 3
    }
  },
  {
    id: 'gl-draw-line-static',
    type: 'line',
    filter: ['all', ['==', 'mode', 'static'], ['==', '$type', 'LineString']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': '#312E81',
      'line-width': 3
    }
  }
];

class Map extends Component {
  constructor(props) {
    super(props);
    const provider = getInitialMapProvider(HAS_MAPBOX_TOKEN);
    const defaultRegion = REGION_PRESETS.australia;

    this.state = {
      lng: defaultRegion.lng,
      lat: defaultRegion.lat,
      zoom: defaultRegion.zoom,
      activeRegion: 'australia',
      mapOpacity: 1,
      imageOpacity: 0.5,
      imageWidth: 800,
      imageHeight: 800,
      isAspectRatioLocked: true,
      aspectLockRatio: 800 / 800,
      imageRotation: 0,
      imagePerspectiveX: 0,
      imagePerspectiveY: 0,
      imagePerspectiveZ: 0,
      imageUrl: '',
      imageAspectRatio: 1,
      imagePlacement: null,
      imageQuad: null,
      isImageLocked: false,
      activeDrawMode: 'simple_select',
      features: [],
      selectedFeatureId: null,
      editingFeatureId: null,
      editingFeatureLabel: '',
      activeStyleVariant: 'default',
      coordinateInput: '',
      editingRangeField: null,
      editingRangeValue: '',
      actionFeedback: null,
      provider,
      providerNotice: getMapProviderNotice(provider, HAS_MAPBOX_TOKEN),
      providerError: '',
      isHelpOpen: false,
      canUndo: false,
      canRedo: false,
      toolsSectionOpen: true,
      featuresSectionOpen: true,
      imageSectionOpen: true,
      mapSectionOpen: true
    };

    this.mapContainer = React.createRef();
    this.imageOverlayRef = React.createRef();
    this.imageCornerRefs = Array.from({ length: 4 }, () => React.createRef());
    this.fileInputRef = React.createRef();
    this.activeLoadId = 0;
    this.lockedImageState = null;
    this.imageObjectUrl = null;
    this.baseLayerOpacityCache = {};
    this.middleRotateState = null;
    this.lastMiddleMouseDown = null;
    this.leftPanState = null;
    this.suppressNextDrawClick = false;
    this.feedbackTimeout = null;
    this.historyStack = [];
    this.historyIndex = -1;
    this.isApplyingHistory = false;
    this.rangeInteraction = null;
  }

  attachMapWheelListener = () => {
    if (this.mapContainer.current) {
      this.mapContainer.current.removeEventListener('wheel', this.handleMapCtrlWheel, { passive: false });
      this.mapContainer.current.addEventListener('wheel', this.handleMapCtrlWheel, { passive: false });
    }
  };

  componentDidMount() {
    this.isMountedFlag = true;
    window.addEventListener('resize', this.handleViewportResize);
    window.addEventListener('dragover', this.handleWindowDragOver);
    window.addEventListener('drop', this.handleWindowDrop);
    window.addEventListener('copy', this.handleWindowCopy, true);
    window.addEventListener('paste', this.handleWindowPaste, true);
    window.addEventListener('keydown', this.handleGlobalKeyDown, true);
    // Remove wheel from window, add to mapContainer with passive: false
    if (this.mapContainer.current) {
      this.mapContainer.current.addEventListener('contextmenu', this.handleContextMenu);
      this.mapContainer.current.addEventListener('mousedown', this.handleMapMouseDown);
      this.mapContainer.current.addEventListener('click', this.handleMapClickCapture, true);
      this.mapContainer.current.addEventListener('wheel', this.handleMapCtrlWheel, { passive: false });
    }
    this.initializeMap();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.provider !== this.state.provider) {
      persistMapProvider(this.state.provider);
      this.initializeMap();
    }

    if (prevState.isImageLocked !== this.state.isImageLocked && this.state.isImageLocked) {
      this.updateLockedImageTransform();
    }
  }

  componentWillUnmount() {
    this.isMountedFlag = false;
    window.removeEventListener('resize', this.handleViewportResize);
    window.removeEventListener('dragover', this.handleWindowDragOver);
    window.removeEventListener('drop', this.handleWindowDrop);
    window.removeEventListener('copy', this.handleWindowCopy, true);
    window.removeEventListener('paste', this.handleWindowPaste, true);
    window.removeEventListener('keydown', this.handleGlobalKeyDown, true);
    this.detachRangeInteractionListeners();
    // Remove wheel from mapContainer
    if (this.mapContainer.current) {
      this.mapContainer.current.removeEventListener('contextmenu', this.handleContextMenu);
      this.mapContainer.current.removeEventListener('mousedown', this.handleMapMouseDown);
      this.mapContainer.current.removeEventListener('click', this.handleMapClickCapture, true);
      this.mapContainer.current.removeEventListener('wheel', this.handleMapCtrlWheel, { passive: false });
    }
    if (this.map) {
      this.map.off('styledata', this.attachMapWheelListener);
    }
    this.detachMiddleRotateListeners();
    this.detachLeftPanListeners();
    this.cleanupMap();
    this.revokeImageObjectUrl();
    if (this.feedbackTimeout) {
      window.clearTimeout(this.feedbackTimeout);
      this.feedbackTimeout = null;
    }
  }

  isDrawLayer = (layerId) => {
    return layerId.indexOf('gl-draw-') === 0;
  };

  getMapContainerRect = () => {
    if (!this.mapContainer.current) {
      return null;
    }

    return this.mapContainer.current.getBoundingClientRect();
  };

  getCenteredImagePlacement = (width, aspectRatio, explicitHeight = null) => {
    const containerRect = this.getMapContainerRect();
    const height = explicitHeight || width / aspectRatio;

    if (!containerRect) {
      return {
        x: 0,
        y: 0,
        width,
        height
      };
    }

    // Center in bottom half on mobile
    const isMobile = window.innerWidth <= 600;
    const centerY = isMobile ? containerRect.height * 0.75 : containerRect.height / 2;

    return {
      x: containerRect.width / 2,
      y: centerY,
      width,
      height
    };
  };

  getCurrentImagePlacement = (width = this.state.imageWidth, height = this.state.imageHeight) => {
    if (this.state.imagePlacement) {
      return this.state.imagePlacement;
    }

    const aspectRatio = height === 0 ? this.state.imageAspectRatio : width / height;
    return this.getCenteredImagePlacement(width, aspectRatio);
  };

  getLocalImageCorners = (
    width = this.state.imageWidth,
    height = this.state.imageHeight,
    perspectiveX = this.state.imagePerspectiveX,
    perspectiveY = this.state.imagePerspectiveY,
    perspectiveZ = this.state.imagePerspectiveZ
  ) => {
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    return [
      { x: -halfWidth + perspectiveX + perspectiveZ, y: -halfHeight + perspectiveY },
      { x: halfWidth + perspectiveX - perspectiveZ, y: -halfHeight - perspectiveY },
      { x: halfWidth - perspectiveX + perspectiveZ, y: halfHeight - perspectiveY },
      { x: -halfWidth - perspectiveX - perspectiveZ, y: halfHeight + perspectiveY }
    ];
  };

  rotatePoint = (point, rotationDegrees) => {
    const radians = rotationDegrees * (Math.PI / 180);
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);

    return {
      x: point.x * cosine - point.y * sine,
      y: point.x * sine + point.y * cosine
    };
  };

  getTransformedImageCorners = (placement, rotationDegrees) => {
    if (!placement) {
      return [];
    }

    return this.getLocalImageCorners(placement.width, placement.height).map((corner) => {
      const rotated = this.rotatePoint(corner, rotationDegrees);

      return {
        x: placement.x + rotated.x,
        y: placement.y + rotated.y
      };
    });
  };

  buildImageQuad = (
    placement = this.getCurrentImagePlacement(),
    rotationDegrees = this.state.imageRotation,
    perspectiveX = this.state.imagePerspectiveX,
    perspectiveY = this.state.imagePerspectiveY,
    perspectiveZ = this.state.imagePerspectiveZ,
    width = this.state.imageWidth,
    height = this.state.imageHeight
  ) => {
    if (!placement) {
      return [];
    }

    return this.getLocalImageCorners(width, height, perspectiveX, perspectiveY, perspectiveZ).map((corner) => {
      const rotated = this.rotatePoint(corner, rotationDegrees);

      return {
        x: placement.x + rotated.x,
        y: placement.y + rotated.y
      };
    });
  };

  cloneScreenPoints = (points) => {
    return (points || []).map((point) => ({ x: point.x, y: point.y }));
  };

  areValidScreenCorners = (corners) => {
    return Array.isArray(corners) &&
      corners.length === 4 &&
      corners.every((corner) => (
        corner &&
        Number.isFinite(corner.x) &&
        Number.isFinite(corner.y)
      ));
  };

  getScreenCornerBounds = (corners) => {
    if (!this.areValidScreenCorners(corners)) {
      return null;
    }

    return corners.reduce((bounds, corner) => ({
      minX: Math.min(bounds.minX, corner.x),
      minY: Math.min(bounds.minY, corner.y),
      maxX: Math.max(bounds.maxX, corner.x),
      maxY: Math.max(bounds.maxY, corner.y)
    }), {
      minX: corners[0].x,
      minY: corners[0].y,
      maxX: corners[0].x,
      maxY: corners[0].y
    });
  };

  getPlacementFromScreenCorners = (corners) => {
    const center = this.getScreenPointCenter(corners);

    return {
      x: center ? center.x : this.getCurrentImagePlacement().x,
      y: center ? center.y : this.getCurrentImagePlacement().y,
      width: this.state.imageWidth,
      height: this.state.imageHeight
    };
  };

  getCurrentImageScreenCorners = () => {
    if (this.state.isImageLocked) {
      return this.getLockedImageScreenCorners();
    }

    if (this.areValidScreenCorners(this.state.imageQuad)) {
      return this.cloneScreenPoints(this.state.imageQuad);
    }

    const renderedCorners = this.getRenderedOverlayCorners();

    if (this.areValidScreenCorners(renderedCorners)) {
      return renderedCorners;
    }

    return this.buildImageQuad();
  };

  getRenderedOverlayCorners = () => {
    if (!this.imageOverlayRef.current || !this.mapContainer.current) {
      return null;
    }

    const containerRect = this.mapContainer.current.getBoundingClientRect();
    const corners = this.imageCornerRefs.map((cornerRef) => {
      if (!cornerRef.current) {
        return null;
      }

      const rect = cornerRef.current.getBoundingClientRect();

      return {
        x: rect.left - containerRect.left,
        y: rect.top - containerRect.top
      };
    });

    return corners.some((corner) => !corner) ? null : corners;
  };

  sanitizeScreenPoint = (point) => {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      return null;
    }

    const containerRect = this.getMapContainerRect();

    if (!containerRect) {
      return {
        x: point.x,
        y: point.y
      };
    }

    const maxX = containerRect.width * 8;
    const maxY = containerRect.height * 8;

    return {
      x: Math.max(-maxX, Math.min(maxX, point.x)),
      y: Math.max(-maxY, Math.min(maxY, point.y))
    };
  };

  getEdgeAxis = (startPoint, endPoint) => {
    const deltaX = endPoint.x - startPoint.x;
    const deltaY = endPoint.y - startPoint.y;
    const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY) || 1;

    return {
      x: deltaX / length,
      y: deltaY / length
    };
  };

  getImageAxesFromCorners = (corners) => {
    if (!corners || corners.length !== 4) {
      return {
        xAxis: { x: 1, y: 0 },
        yAxis: { x: 0, y: 1 }
      };
    }

    const topAxis = this.getEdgeAxis(corners[0], corners[1]);
    const bottomAxis = this.getEdgeAxis(corners[3], corners[2]);
    const leftAxis = this.getEdgeAxis(corners[0], corners[3]);
    const rightAxis = this.getEdgeAxis(corners[1], corners[2]);
    const xAxis = {
      x: topAxis.x + bottomAxis.x,
      y: topAxis.y + bottomAxis.y
    };
    const yAxis = {
      x: leftAxis.x + rightAxis.x,
      y: leftAxis.y + rightAxis.y
    };

    return {
      xAxis: this.getEdgeAxis({ x: 0, y: 0 }, xAxis),
      yAxis: this.getEdgeAxis({ x: 0, y: 0 }, yAxis)
    };
  };

  solveLinearSystem = (matrix, values) => {
    const size = values.length;
    const augmented = matrix.map((row, index) => [...row, values[index]]);

    for (let pivotIndex = 0; pivotIndex < size; pivotIndex += 1) {
      let maxRowIndex = pivotIndex;

      for (let rowIndex = pivotIndex + 1; rowIndex < size; rowIndex += 1) {
        if (Math.abs(augmented[rowIndex][pivotIndex]) > Math.abs(augmented[maxRowIndex][pivotIndex])) {
          maxRowIndex = rowIndex;
        }
      }

      if (Math.abs(augmented[maxRowIndex][pivotIndex]) < 1e-9) {
        return null;
      }

      if (maxRowIndex !== pivotIndex) {
        [augmented[pivotIndex], augmented[maxRowIndex]] = [augmented[maxRowIndex], augmented[pivotIndex]];
      }

      const pivot = augmented[pivotIndex][pivotIndex];

      for (let columnIndex = pivotIndex; columnIndex <= size; columnIndex += 1) {
        augmented[pivotIndex][columnIndex] /= pivot;
      }

      for (let rowIndex = 0; rowIndex < size; rowIndex += 1) {
        if (rowIndex === pivotIndex) {
          continue;
        }

        const factor = augmented[rowIndex][pivotIndex];

        for (let columnIndex = pivotIndex; columnIndex <= size; columnIndex += 1) {
          augmented[rowIndex][columnIndex] -= factor * augmented[pivotIndex][columnIndex];
        }
      }
    }

    return augmented.map((row) => row[size]);
  };

  getProjectiveTransform = (corners, width = this.state.imageWidth, height = this.state.imageHeight) => {
    if (!corners || corners.length !== 4 || width <= 0 || height <= 0) {
      return null;
    }

    const sourcePoints = [
      [0, 0],
      [width, 0],
      [width, height],
      [0, height]
    ];
    const matrix = [];
    const values = [];

    sourcePoints.forEach(([sourceX, sourceY], index) => {
      const targetPoint = corners[index];

      matrix.push([sourceX, sourceY, 1, 0, 0, 0, -targetPoint.x * sourceX, -targetPoint.x * sourceY]);
      values.push(targetPoint.x);
      matrix.push([0, 0, 0, sourceX, sourceY, 1, -targetPoint.y * sourceX, -targetPoint.y * sourceY]);
      values.push(targetPoint.y);
    });

    return this.solveLinearSystem(matrix, values);
  };

  getOverlayStyle = () => {
    const corners = this.state.imageQuad && this.state.imageQuad.length === 4
      ? this.cloneScreenPoints(this.state.imageQuad)
      : this.buildImageQuad();
    const bounds = this.getScreenCornerBounds(corners);
    const origin = bounds
      ? { x: bounds.minX, y: bounds.minY }
      : { x: 0, y: 0 };
    const normalizedCorners = this.areValidScreenCorners(corners)
      ? corners.map((corner) => ({
        x: corner.x - origin.x,
        y: corner.y - origin.y
      }))
      : corners;
    const transform = this.getProjectiveTransform(normalizedCorners);

    return {
      left: `${origin.x}px`,
      top: `${origin.y}px`,
      width: `${this.state.imageWidth}px`,
      height: `${this.state.imageHeight}px`,
      opacity: this.state.imageOpacity,
      transform: transform
        ? `matrix3d(${transform[0]}, ${transform[3]}, 0, ${transform[6]}, ${transform[1]}, ${transform[4]}, 0, ${transform[7]}, 0, 0, 1, 0, ${transform[2]}, ${transform[5]}, 0, 1)`
        : 'none',
      transformOrigin: '0 0'
    };
  };

  getLockedImageScreenCorners = () => {
    if (!this.map || !this.lockedImageState || !this.lockedImageState.coordinates) {
      return [];
    }

    return this.lockedImageState.coordinates.map((coordinate) => {
      const point = this.map.project(coordinate);
      return {
        x: point.x,
        y: point.y
      };
    });
  };

  getScreenPointCenter = (points) => {
    if (!points || points.length === 0) {
      return null;
    }

    const aggregate = points.reduce((accumulator, point) => ({
      x: accumulator.x + point.x,
      y: accumulator.y + point.y
    }), { x: 0, y: 0 });

    return {
      x: aggregate.x / points.length,
      y: aggregate.y / points.length
    };
  };

  getDistanceBetweenPoints = (pointA, pointB) => {
    if (!pointA || !pointB) {
      return 0;
    }

    const deltaX = pointB.x - pointA.x;
    const deltaY = pointB.y - pointA.y;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  };

  getRotationBetweenPoints = (pointA, pointB) => {
    if (!pointA || !pointB) {
      return 0;
    }

    return Math.atan2(pointB.y - pointA.y, pointB.x - pointA.x) * (180 / Math.PI);
  };

  mapScreenPointsToCoordinates = (points) => {
    if (!this.map) {
      return [];
    }

    return points.map((point) => {
      const safePoint = this.sanitizeScreenPoint(point);

      if (!safePoint) {
        return null;
      }

      const lngLat = this.map.unproject([safePoint.x, safePoint.y]);

      if (!Number.isFinite(lngLat.lng) || !Number.isFinite(lngLat.lat)) {
        return null;
      }

      return [lngLat.lng, lngLat.lat];
    }).filter(Boolean);
  };

  getFirstDrawLayerId = () => {
    if (!this.map) {
      return null;
    }

    const style = this.map.getStyle();
    if (!style || !style.layers) {
      return null;
    }

    const drawLayer = style.layers.find((layer) => this.isDrawLayer(layer.id));
    return drawLayer ? drawLayer.id : null;
  };

  removeLockedImageLayer = () => {
    if (!this.map) {
      return;
    }

    if (this.map.getLayer(LOCKED_IMAGE_LAYER_ID)) {
      this.map.removeLayer(LOCKED_IMAGE_LAYER_ID);
    }

    if (this.map.getSource(LOCKED_IMAGE_SOURCE_ID)) {
      this.map.removeSource(LOCKED_IMAGE_SOURCE_ID);
    }
  };

  syncLockedImageLayer = () => {
    if (!this.map || !this.lockedImageState || !this.state.imageUrl) {
      return;
    }

    const coordinates = this.lockedImageState.coordinates;

    // Validate coordinates: must be 4 points, all finite numbers, and not all the same
    if (!Array.isArray(coordinates) || coordinates.length !== 4 || coordinates.some(
      (c) => !Array.isArray(c) || c.length !== 2 || !isFinite(c[0]) || !isFinite(c[1])
    )) {
    // Invalid coordinates, do not update
      return;
    }

    if (this.map.getLayer(LOCKED_IMAGE_LAYER_ID) && this.map.getSource(LOCKED_IMAGE_SOURCE_ID)) {
      const source = this.map.getSource(LOCKED_IMAGE_SOURCE_ID);

      if (source && typeof source.setCoordinates === 'function') {
        source.setCoordinates(coordinates);
      }

      if (
        source &&
        typeof source.updateImage === 'function' &&
        this.lockedImageState.imageUrl !== this.state.imageUrl
      ) {
        source.updateImage({
          url: this.state.imageUrl,
          coordinates
        });
        this.lockedImageState = {
          ...this.lockedImageState,
          imageUrl: this.state.imageUrl
        };
      }

      this.map.setPaintProperty(LOCKED_IMAGE_LAYER_ID, 'raster-opacity', this.state.imageOpacity);
      return;
    }

    this.removeLockedImageLayer();
    this.map.addSource(LOCKED_IMAGE_SOURCE_ID, {
      type: 'image',
      url: this.state.imageUrl,
      coordinates
    });
    this.map.addLayer({
      id: LOCKED_IMAGE_LAYER_ID,
      type: 'raster',
      source: LOCKED_IMAGE_SOURCE_ID,
      paint: {
        'raster-opacity': this.state.imageOpacity
      }
    }, this.getFirstDrawLayerId() || undefined);
  };

  updateLockedImageFromScreenPoints = (screenPoints, nextState, options = {}) => {
    if (!this.map || !this.lockedImageState || !screenPoints || screenPoints.length !== 4) {
      return;
    }

    const coordinates = this.mapScreenPointsToCoordinates(screenPoints);

    if (coordinates.length !== 4) {
      return;
    }

    this.lockedImageState = {
      ...this.lockedImageState,
      coordinates
    };

    this.setState(nextState, () => {
      this.syncLockedImageLayer();
      if (options.captureHistory) {
        this.recordHistorySnapshot();
      }
    });
  };

  applyMapOpacity = (opacity) => {
    if (!this.map) {
      return;
    }

    const style = this.map.getStyle();

    if (!style || !style.layers) {
      return;
    }

    style.layers.forEach((layer) => {
      if (this.isDrawLayer(layer.id)) {
        return;
      }

      const opacityProperties = LAYER_OPACITY_PROPERTIES[layer.type] || [];

      opacityProperties.forEach((propertyName) => {
        const cacheKey = `${layer.id}:${propertyName}`;
        const baseValue =
          this.baseLayerOpacityCache[cacheKey] !== undefined
            ? this.baseLayerOpacityCache[cacheKey]
            : 1;
        const nextValue = typeof baseValue === 'number' ? baseValue * opacity : opacity;

        try {
          this.map.setPaintProperty(layer.id, propertyName, nextValue);
        } catch (error) {
          // Ignore paint properties unsupported by the active style layer.
        }
      });
    });
  };

  cacheBaseLayerOpacity = () => {
    if (!this.map) {
      return;
    }

    const style = this.map.getStyle();

    if (!style || !style.layers) {
      return;
    }

    const nextCache = {};

    style.layers.forEach((layer) => {
      if (this.isDrawLayer(layer.id)) {
        return;
      }

      const opacityProperties = LAYER_OPACITY_PROPERTIES[layer.type] || [];

      opacityProperties.forEach((propertyName) => {
        let value = this.map.getPaintProperty(layer.id, propertyName);

        if (value === undefined || value === null) {
          value = 1;
        }

        nextCache[`${layer.id}:${propertyName}`] = value;
      });
    });

    this.baseLayerOpacityCache = nextCache;
  };

  removeEmptyControlShells = () => {
    if (!this.mapContainer.current) {
      return;
    }

    const emptyGroups = this.mapContainer.current.querySelectorAll(
      '.mapboxgl-ctrl-group:empty, .maplibregl-ctrl-group:empty'
    );
    emptyGroups.forEach((node) => node.remove());

    const emptyCorners = this.mapContainer.current.querySelectorAll(
      '.mapboxgl-ctrl-top-left:empty, .mapboxgl-ctrl-top-right:empty, .mapboxgl-ctrl-bottom-left:empty, .mapboxgl-ctrl-bottom-right:empty, .maplibregl-ctrl-top-left:empty, .maplibregl-ctrl-top-right:empty, .maplibregl-ctrl-bottom-left:empty, .maplibregl-ctrl-bottom-right:empty'
    );
    emptyCorners.forEach((node) => node.remove());
  };

  revokeImageObjectUrl = () => {
    if (this.imageObjectUrl) {
      URL.revokeObjectURL(this.imageObjectUrl);
      this.imageObjectUrl = null;
    }
  };

  cleanupMap = () => {
    this.activeLoadId += 1;

    if (this.map) {
      this.map.remove();
    }

    this.map = null;
    this.mapLib = null;
    this.Draw = null;
    this.baseLayerOpacityCache = {};
  };

  getCurrentMapView = () => {
    if (!this.map) {
      return {
        lng: this.state.lng,
        lat: this.state.lat,
        zoom: this.state.zoom,
        bearing: 0,
        pitch: 0
      };
    }

    const center = this.map.getCenter();

    return {
      lng: center.lng,
      lat: center.lat,
      zoom: this.map.getZoom(),
      bearing: this.map.getBearing(),
      pitch: this.map.getPitch()
    };
  };

  syncViewportStateFromMap = () => {
    if (!this.map) {
      return;
    }

    const center = this.map.getCenter();

    this.setState({
      lng: center.lng,
      lat: center.lat,
      zoom: this.map.getZoom()
    });
  };

  getDrawFeatureCollection = () => {
    if (!this.Draw) {
      return turf.featureCollection([]);
    }

    return this.Draw.getAll();
  };

  restoreDrawState = (featureCollection, selectedFeatureId = null) => {
    if (
      !this.Draw ||
      !featureCollection ||
      !Array.isArray(featureCollection.features)
    ) {
      return;
    }

    this.Draw.set(featureCollection);

    const hasSelectedFeature =
      selectedFeatureId &&
      featureCollection.features.some((feature) => String(feature.id) === String(selectedFeatureId));

    if (hasSelectedFeature) {
      this.Draw.changeMode('simple_select', {
        featureIds: [selectedFeatureId]
      });
    }

    this.syncFeaturesFromDraw();
  };

  initializeMap = async () => {
    const provider = resolveProvider(this.state.provider, HAS_MAPBOX_TOKEN);

    if (provider !== this.state.provider) {
      this.setState({
        provider,
        providerNotice: getMapProviderNotice(provider, HAS_MAPBOX_TOKEN),
        providerError: ''
      });
      return;
    }

    if (!this.mapContainer.current) {
      return;
    }

    const currentView = this.getCurrentMapView();
    const featureSnapshot = this.getDrawFeatureCollection();
    const selectedFeatureId = this.state.selectedFeatureId;

    this.cleanupMap();
    const loadId = this.activeLoadId;

    try {
      const { mapLib, GeocoderClass, DrawClass } = await loadMapProvider(
        provider,
        MAPBOX_TOKEN
      );

      if (!this.isMountedFlag || loadId !== this.activeLoadId) {
        return;
      }

      const map = new mapLib.Map({
        container: this.mapContainer.current,
        style: getProviderStyle(provider, this.state.activeStyleVariant),
        center: [currentView.lng, currentView.lat],
        zoom: currentView.zoom,
        bearing: currentView.bearing,
        pitch: currentView.pitch
      });

      const scale = new mapLib.ScaleControl({
        maxWidth: 120,
        unit: 'metric'
      });

      map.addControl(scale, 'bottom-left');

      if (typeof scale.setUnit === 'function') {
        scale.setUnit('metric');
      }

      const draw = new DrawClass({
        displayControlsDefault: false,
        controls: {},
        modes: Object.assign({}, DrawClass.modes, {
          draw_polygon: FreehandPolygonMode,
          draw_line_string: FreehandLineMode
        }),
        styles: DRAW_STYLES
      });

      if (map.dragRotate && typeof map.dragRotate.disable === 'function') {
        map.dragRotate.disable();
      }

      if (provider === MAP_PROVIDERS.mapbox && GeocoderClass && MAPBOX_TOKEN) {
        map.addControl(
          new GeocoderClass({
            accessToken: MAPBOX_TOKEN,
            mapboxgl: mapLib,
            marker: false
          }),
          'top-left'
        );
      }

      map.addControl(draw, 'top-left');
      this.removeEmptyControlShells();
      map.on('load', () => {
        this.cacheBaseLayerOpacity();
        this.applyMapOpacity(this.state.mapOpacity);
        if (this.state.isImageLocked) {
          this.syncLockedImageLayer();
        }
        this.restoreDrawState(featureSnapshot, selectedFeatureId);
        this.removeEmptyControlShells();
      });
      map.on('moveend', this.syncViewportStateFromMap);
      map.on('draw.modechange', this.handleDrawModeChange);
      map.on('draw.create', this.handleDrawCreate);
      map.on('draw.update', this.handleDrawUpdate);
      map.on('draw.delete', this.handleDrawDelete);
      map.on('draw.selectionchange', this.handleDrawSelectionChange);

      this.map = map;
      this.mapLib = mapLib;
      this.Draw = draw;
      map.on('styledata', this.attachMapWheelListener);

      this.setState({
        lng: currentView.lng,
        lat: currentView.lat,
        zoom: currentView.zoom,
        activeDrawMode: 'simple_select',
        providerNotice: getMapProviderNotice(provider, HAS_MAPBOX_TOKEN),
        providerError: ''
      });

      if (this.historyStack.length === 0) {
        map.once('load', this.resetHistory);
      }
    } catch (error) {
      if (!this.isMountedFlag || loadId !== this.activeLoadId) {
        return;
      }

      this.setState({
        providerError: error && error.message ? error.message : 'Unknown map initialization error'
      });
    }
  };

  updateLockedImageTransform = () => {
    if (this.state.isImageLocked) {
      this.syncLockedImageLayer();
    }
  };

  handleDrawModeChange = (event) => {
    this.setState({
      activeDrawMode: event && event.mode ? event.mode : 'simple_select'
    });
  };

  handleDrawCreate = (event) => {
    const createdFeature =
      event && event.features && event.features.length > 0 ? event.features[0] : null;

    if (createdFeature && createdFeature.id) {
      const createdFeatureId = String(createdFeature.id);
      const nextLabel = this.getDisplayLabelForFeature(
        createdFeature,
        this.state.features.length + 1
      );

      this.Draw.setFeatureProperty(createdFeatureId, 'label', nextLabel);
      this.Draw.setFeatureProperty(createdFeatureId, 'name', nextLabel);
      this.Draw.setFeatureProperty(createdFeatureId, 'title', nextLabel);

      this.setState(
        {
          selectedFeatureId: createdFeatureId,
          editingFeatureId: null,
          editingFeatureLabel: ''
        },
        () => {
          this.syncFeaturesFromDraw();
          this.recordHistorySnapshot();
        }
      );
    } else {
      this.syncFeaturesFromDraw();
      this.recordHistorySnapshot();
    }
  };

  handleDrawUpdate = () => {
    this.syncFeaturesFromDraw();
    this.recordHistorySnapshot();
  };

  handleDrawDelete = () => {
    this.syncFeaturesFromDraw();
    this.recordHistorySnapshot();
  };

  handleDrawSelectionChange = (event) => {
    const selectedFeature =
      event && event.features && event.features.length > 0 ? event.features[0] : null;
    const nextSelectedFeatureId = selectedFeature && selectedFeature.id ? String(selectedFeature.id) : null;

    if (nextSelectedFeatureId === this.state.selectedFeatureId) {
      return;
    }

    this.setState({
      selectedFeatureId: nextSelectedFeatureId
    });
  };

  getDrawFeatureById = (featureId) => {
    if (!this.Draw || !featureId) {
      return null;
    }

    const collection = this.Draw.getAll();
    return (collection.features || []).find((feature) => String(feature.id) === String(featureId)) || null;
  };

  areFeatureEntriesEqual = (currentFeatures, nextFeatures) => {
    if (currentFeatures.length !== nextFeatures.length) {
      return false;
    }

    return nextFeatures.every((feature, index) => {
      const currentFeature = currentFeatures[index];

      return currentFeature &&
        currentFeature.id === feature.id &&
        currentFeature.geometryType === feature.geometryType &&
        currentFeature.label === feature.label;
    });
  };

  syncFeaturesFromDraw = () => {
    if (!this.Draw) {
      return;
    }

    const collection = this.Draw.getAll();
    const features = collection.features.map((feature, index) => {
      const geometryType = feature.geometry ? feature.geometry.type : 'Feature';
      const label =
        feature.properties && (feature.properties.label || feature.properties.name)
          ? feature.properties.label || feature.properties.name
          : `${GEOMETRY_LABELS[geometryType] || geometryType} ${index + 1}`;

      return {
        id: String(feature.id),
        geometryType,
        label
      };
    });

    const selectedIds =
      typeof this.Draw.getSelectedIds === 'function'
        ? this.Draw.getSelectedIds().map((id) => String(id))
        : [];

    const nextSelectedFeatureId = selectedIds[0] || null;

    if (
      this.areFeatureEntriesEqual(this.state.features, features) &&
      this.state.selectedFeatureId === nextSelectedFeatureId
    ) {
      return;
    }

    this.setState({
      features,
      selectedFeatureId: nextSelectedFeatureId
    });
  };

  setUnlockedImageQuad = (screenCorners, nextState = {}, options = {}) => {
    this.setState({
      ...nextState,
      imageQuad: this.cloneScreenPoints(screenCorners),
      isImageLocked: false
    }, () => {
      if (options.captureHistory) {
        this.recordHistorySnapshot();
      }
    });
  };

  getEditableImageScreenCorners = () => {
    if (this.state.isImageLocked) {
      return this.getCurrentImageScreenCorners();
    }

    if (this.state.imageQuad && this.state.imageQuad.length === 4) {
      return this.cloneScreenPoints(this.state.imageQuad);
    }

    return this.buildImageQuad();
  };

  rebuildImageQuadFromControls = (overrides = {}) => {
    const currentCorners = this.getEditableImageScreenCorners();
    const center = this.getScreenPointCenter(currentCorners);
    const width = overrides.imageWidth !== undefined ? overrides.imageWidth : this.state.imageWidth;
    const height = overrides.imageHeight !== undefined ? overrides.imageHeight : this.state.imageHeight;
    const rotation = overrides.imageRotation !== undefined ? overrides.imageRotation : this.state.imageRotation;
    const perspectiveX = overrides.imagePerspectiveX !== undefined ? overrides.imagePerspectiveX : this.state.imagePerspectiveX;
    const perspectiveY = overrides.imagePerspectiveY !== undefined ? overrides.imagePerspectiveY : this.state.imagePerspectiveY;
    const perspectiveZ = overrides.imagePerspectiveZ !== undefined ? overrides.imagePerspectiveZ : this.state.imagePerspectiveZ;
    const fallbackPlacement = this.getCurrentImagePlacement(width, height);
    const placement = {
      x: center ? center.x : fallbackPlacement.x,
      y: center ? center.y : fallbackPlacement.y,
      width,
      height
    };

    return this.buildImageQuad(
      placement,
      rotation,
      perspectiveX,
      perspectiveY,
      perspectiveZ,
      width,
      height
    );
  };

  applyRebuiltImageQuad = (nextState, options = {}) => {
    const nextCorners = this.rebuildImageQuadFromControls(nextState);

    if (!nextCorners || nextCorners.length !== 4) {
      return;
    }

    if (this.state.isImageLocked) {
      this.updateLockedImageFromScreenPoints(nextCorners, nextState, options);
      return;
    }

    this.setUnlockedImageQuad(nextCorners, nextState, options);
  };

  updateImageScreenCorners = (transformer, nextState = {}, options = {}) => {
    const currentCorners = this.getEditableImageScreenCorners();

    if (!currentCorners || currentCorners.length !== 4) {
      return;
    }

    const nextCorners = transformer(this.cloneScreenPoints(currentCorners));

    if (!nextCorners || nextCorners.length !== 4) {
      return;
    }

    if (this.state.isImageLocked) {
      this.updateLockedImageFromScreenPoints(nextCorners, nextState, options);
      return;
    }

    this.setUnlockedImageQuad(nextCorners, nextState, options);
  };

  scaleImageQuad = (corners, scaleX = 1, scaleY = 1) => {
    const center = this.getScreenPointCenter(corners);
    const { xAxis, yAxis } = this.getImageAxesFromCorners(corners);

    return corners.map((point) => {
      const relativeX = point.x - center.x;
      const relativeY = point.y - center.y;
      const projectedX = relativeX * xAxis.x + relativeY * xAxis.y;
      const projectedY = relativeX * yAxis.x + relativeY * yAxis.y;

      return {
        x: center.x + xAxis.x * projectedX * scaleX + yAxis.x * projectedY * scaleY,
        y: center.y + xAxis.y * projectedX * scaleX + yAxis.y * projectedY * scaleY
      };
    });
  };

  rotateImageQuad = (corners, deltaRotation) => {
    const center = this.getScreenPointCenter(corners);

    return corners.map((point) => {
      const rotated = this.rotatePoint({
        x: point.x - center.x,
        y: point.y - center.y
      }, deltaRotation);

      return {
        x: center.x + rotated.x,
        y: center.y + rotated.y
      };
    });
  };

  adjustImagePerspective = (corners, deltaX = 0, deltaY = 0) => {
    const { xAxis, yAxis } = this.getImageAxesFromCorners(corners);
    const cornerSigns = [
      { x: -1, y: -1 },
      { x: 1, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: 1 }
    ];

    return corners.map((point, index) => ({
      x: point.x + xAxis.x * (-cornerSigns[index].y * deltaX) + yAxis.x * (-cornerSigns[index].x * deltaY),
      y: point.y + xAxis.y * (-cornerSigns[index].y * deltaX) + yAxis.y * (-cornerSigns[index].x * deltaY)
    }));
  };

  adjustImagePerspectiveZ = (corners, deltaZ = 0) => {
    const { xAxis } = this.getImageAxesFromCorners(corners);
    const cornerSigns = [
      { x: -1, y: -1 },
      { x: 1, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: 1 }
    ];

    return corners.map((point, index) => {
      const shift = deltaZ * cornerSigns[index].x * cornerSigns[index].y;

      return {
        x: point.x + xAxis.x * shift,
        y: point.y + xAxis.y * shift
      };
    });
  };

  handleViewportResize = () => {
    if (!this.state.imageUrl) {
      return;
    }

    if (this.state.isImageLocked) {
      return;
    }

    const currentCorners = this.getCurrentImageScreenCorners();

    if (currentCorners && currentCorners.length === 4) {
      this.setState({
        imageQuad: this.cloneScreenPoints(currentCorners)
      });
      return;
    }

    const nextPlacement = this.getCenteredImagePlacement(
      this.state.imageWidth,
      this.state.imageAspectRatio,
      this.state.imageHeight
    );

    this.setState({
      imageQuad: this.buildImageQuad(
        nextPlacement,
        this.state.imageRotation,
        this.state.imagePerspectiveX,
        this.state.imagePerspectiveY,
        this.state.imagePerspectiveZ,
        this.state.imageWidth,
        this.state.imageHeight
      ),
      imagePlacement: nextPlacement
    });
  };

  handleWindowDragOver = (event) => {
    event.preventDefault();
  };

  confirmImageOverwrite = () => {
    if (!this.state.imageUrl) {
      return true;
    }

    return window.confirm('Replace the current image?');
  };

  isImageFile = (file) => {
    return Boolean(file && file.type && file.type.indexOf('image/') === 0);
  };

  isGeoJSONFile = (file) => {
    if (!file) {
      return false;
    }

    if (
      file.type === 'application/geo+json' ||
      file.type === 'application/json'
    ) {
      return true;
    }

    return /\.(geojson|json)$/i.test(file.name || '');
  };

  getClipboardImageFile = (clipboardData) => {
    if (!clipboardData || !clipboardData.items) {
      return null;
    }

    const imageItem = Array.from(clipboardData.items).find((item) => {
      return item.kind === 'file' && item.type.indexOf('image/') === 0;
    });

    return imageItem ? imageItem.getAsFile() : null;
  };

  readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('Unable to read file'));
      reader.readAsText(file);
    });
  };

  showActionFeedback = (message, tone = 'success') => {
    if (this.feedbackTimeout) {
      window.clearTimeout(this.feedbackTimeout);
    }

    this.setState({
      actionFeedback: {
        id: Date.now(),
        message,
        tone
      }
    });

    this.feedbackTimeout = window.setTimeout(() => {
      this.setState({
        actionFeedback: null
      });
      this.feedbackTimeout = null;
    }, 1800);
  };

  cloneHistoryValue = (value) => {
    return value === null || value === undefined
      ? value
      : JSON.parse(JSON.stringify(value));
  };

  getHistorySnapshot = () => {
    return {
      drawData: this.cloneHistoryValue(this.Draw ? this.getNormalizedDrawData() : turf.featureCollection([])),
      selectedFeatureId: this.state.selectedFeatureId,
      activeDrawMode: this.state.activeDrawMode,
      image: {
        imageUrl: this.state.imageUrl,
        imageAspectRatio: this.state.imageAspectRatio,
        imagePlacement: this.cloneHistoryValue(this.state.imagePlacement),
        imageQuad: this.cloneHistoryValue(this.state.imageQuad),
        isImageLocked: this.state.isImageLocked,
        imageOpacity: this.state.imageOpacity,
        imageWidth: this.state.imageWidth,
        imageHeight: this.state.imageHeight,
        isAspectRatioLocked: this.state.isAspectRatioLocked,
        aspectLockRatio: this.state.aspectLockRatio,
        imageRotation: this.state.imageRotation,
        imagePerspectiveX: this.state.imagePerspectiveX,
        imagePerspectiveY: this.state.imagePerspectiveY,
        imagePerspectiveZ: this.state.imagePerspectiveZ
      },
      lockedImageState: this.cloneHistoryValue(this.lockedImageState)
    };
  };

  updateHistoryAvailability = () => {
    const canUndo = this.historyIndex > 0;
    const canRedo = this.historyIndex >= 0 && this.historyIndex < this.historyStack.length - 1;

    if (this.state.canUndo === canUndo && this.state.canRedo === canRedo) {
      return;
    }

    this.setState({
      canUndo,
      canRedo
    });
  };

  recordHistorySnapshot = () => {
    if (this.isApplyingHistory || !this.Draw) {
      return;
    }

    const snapshot = this.getHistorySnapshot();
    const signature = JSON.stringify(snapshot);
    const currentEntry = this.historyStack[this.historyIndex];

    if (currentEntry && currentEntry.signature === signature) {
      return;
    }

    const nextHistory = this.historyStack.slice(0, this.historyIndex + 1);
    nextHistory.push({
      signature,
      snapshot
    });

    this.historyStack = nextHistory;
    this.historyIndex = nextHistory.length - 1;
    this.updateHistoryAvailability();
  };

  resetHistory = () => {
    if (!this.Draw) {
      return;
    }

    const snapshot = this.getHistorySnapshot();
    this.historyStack = [{
      signature: JSON.stringify(snapshot),
      snapshot
    }];
    this.historyIndex = 0;
    this.updateHistoryAvailability();
  };

  applyHistorySnapshot = (snapshot) => {
    if (!snapshot || !this.Draw) {
      return;
    }

    this.isApplyingHistory = true;
    this.lockedImageState = this.cloneHistoryValue(snapshot.lockedImageState);

    const nextImageState = snapshot.image || {};

    this.setState({
      ...nextImageState,
      selectedFeatureId: snapshot.selectedFeatureId || null,
      activeDrawMode: snapshot.activeDrawMode || 'simple_select',
      editingFeatureId: null,
      editingFeatureLabel: ''
    }, () => {
      if (this.lockedImageState && nextImageState.isImageLocked) {
        this.syncLockedImageLayer();
      } else {
        this.removeLockedImageLayer();
      }

      this.Draw.set(this.cloneHistoryValue(snapshot.drawData) || turf.featureCollection([]));

      if (snapshot.selectedFeatureId) {
        if (snapshot.activeDrawMode === 'direct_select') {
          this.Draw.changeMode('direct_select', {
            featureId: snapshot.selectedFeatureId
          });
        } else {
          this.Draw.changeMode('simple_select', {
            featureIds: [snapshot.selectedFeatureId]
          });
        }
      } else {
        this.Draw.changeMode('simple_select');
      }

      this.syncFeaturesFromDraw();
      this.isApplyingHistory = false;
      this.updateHistoryAvailability();
    });
  };

  undoHistory = () => {
    if (this.historyIndex <= 0) {
      return;
    }

    this.historyIndex -= 1;
    this.applyHistorySnapshot(this.historyStack[this.historyIndex].snapshot);
  };

  redoHistory = () => {
    if (this.historyIndex >= this.historyStack.length - 1) {
      return;
    }

    this.historyIndex += 1;
    this.applyHistorySnapshot(this.historyStack[this.historyIndex].snapshot);
  };

  attachRangeInteractionListeners = () => {
    window.addEventListener('mouseup', this.finishRangeInteraction, true);
    window.addEventListener('touchend', this.finishRangeInteraction, true);
    window.addEventListener('touchcancel', this.finishRangeInteraction, true);
  };

  detachRangeInteractionListeners = () => {
    window.removeEventListener('mouseup', this.finishRangeInteraction, true);
    window.removeEventListener('touchend', this.finishRangeInteraction, true);
    window.removeEventListener('touchcancel', this.finishRangeInteraction, true);
  };

  startRangeInteraction = (fieldName) => {
    if (this.rangeInteraction && this.rangeInteraction.fieldName === fieldName) {
      return;
    }

    if (this.rangeInteraction) {
      this.finishRangeInteraction();
    }

    this.rangeInteraction = {
      fieldName,
      startValue: this.state[fieldName],
      changed: false
    };
    this.attachRangeInteractionListeners();
  };

  finishRangeInteraction = () => {
    if (!this.rangeInteraction) {
      return;
    }

    const { changed, fieldName, startValue } = this.rangeInteraction;
    this.rangeInteraction = null;
    this.detachRangeInteractionListeners();

    if (!changed) {
      return;
    }

    if (Number(this.state[fieldName]) === Number(startValue)) {
      return;
    }

    this.recordHistorySnapshot();
  };

  isRangeInteractionActive = (fieldName) => {
    return Boolean(
      this.rangeInteraction &&
      this.rangeInteraction.fieldName === fieldName
    );
  };

  getRangeInputHandlers = (fieldName) => {
    return {
      onMouseDown: () => this.startRangeInteraction(fieldName),
      onTouchStart: () => this.startRangeInteraction(fieldName),
      onMouseUp: this.finishRangeInteraction,
      onTouchEnd: this.finishRangeInteraction,
      onBlur: this.finishRangeInteraction
    };
  };

  isEditableTarget = (target) => {
    if (!target || typeof target.closest !== 'function') {
      return false;
    }

    return Boolean(target.closest('input, textarea, [contenteditable="true"]'));
  };

  getClipboardGeoJSONPayload = () => {
    const selectedFeature = this.state.selectedFeatureId
      ? this.state.features.find((feature) => feature.id === this.state.selectedFeatureId)
      : null;
    const selectedDrawFeature = selectedFeature ? this.getDrawFeatureById(selectedFeature.id) : null;

    if (selectedFeature && selectedDrawFeature) {
      return {
        data: this.getNormalizedDrawData(turf.featureCollection([selectedDrawFeature])),
        message: `Copied ${selectedFeature.label} as GeoJSON`
      };
    }

    const data = this.getNormalizedDrawData();

    if (!data.features.length) {
      return null;
    }

    return {
      data,
      message: 'Copied GeoJSON'
    };
  };

  getDisplayLabelForFeature = (feature, fallbackIndex = 1) => {
    const geometryType = feature && feature.geometry ? feature.geometry.type : 'Feature';
    const properties = feature && feature.properties ? feature.properties : {};
    return properties.label || properties.name || `${GEOMETRY_LABELS[geometryType] || geometryType} ${fallbackIndex}`;
  };

  normalizeFeatureForExport = (feature, fallbackIndex = 1) => {
    const label = this.getDisplayLabelForFeature(feature, fallbackIndex);

    return {
      ...feature,
      properties: {
        ...(feature.properties || {}),
        label,
        name: label,
        title: label
      }
    };
  };

  normalizeFeatureForImport = (feature, fallbackIndex = 1) => {
    const normalizedFeature = this.normalizeFeatureForExport(feature, fallbackIndex);
    const { id, ...featureWithoutId } = normalizedFeature;

    return featureWithoutId;
  };

  getNormalizedDrawData = (featureCollection = null) => {
    const collection = featureCollection || (this.Draw ? this.Draw.getAll() : turf.featureCollection([]));

    return {
      ...collection,
      features: (collection.features || []).map((feature, index) => this.normalizeFeatureForExport(feature, index + 1))
    };
  };

  importGeoJSONData = (rawText) => {
    if (!this.Draw || !this.map) {
      return;
    }

    let parsed;

    try {
      parsed = JSON.parse(rawText);
    } catch (error) {
      this.showActionFeedback('Could not parse GeoJSON', 'error');
      return;
    }

    let features;

    if (parsed && parsed.type === 'FeatureCollection' && Array.isArray(parsed.features)) {
      features = parsed.features;
    } else if (parsed && parsed.type === 'Feature') {
      features = [parsed];
    } else {
      this.showActionFeedback('GeoJSON must be a Feature or FeatureCollection', 'error');
      return;
    }

    const normalizedFeatures = features
      .filter((feature) => feature && feature.geometry)
      .map((feature, index) => this.normalizeFeatureForImport(feature, index + 1));

    if (normalizedFeatures.length === 0) {
      this.showActionFeedback('No valid features were found in that GeoJSON file', 'error');
      return;
    }

    this.Draw.add({
      type: 'FeatureCollection',
      features: normalizedFeatures
    });
    this.syncFeaturesFromDraw();
    this.recordHistorySnapshot();
    this.showActionFeedback(`Imported ${normalizedFeatures.length} feature${normalizedFeatures.length === 1 ? '' : 's'}`);

    try {
      const bounds = turf.bbox({
        type: 'FeatureCollection',
        features: normalizedFeatures
      });

      if (bounds && bounds.length === 4) {
        if (bounds[0] === bounds[2] && bounds[1] === bounds[3]) {
          this.map.easeTo({
            center: [bounds[0], bounds[1]],
            zoom: Math.max(this.map.getZoom(), 15),
            duration: 500
          });
        } else {
          this.map.fitBounds([
            [bounds[0], bounds[1]],
            [bounds[2], bounds[3]]
          ], {
            padding: 50,
            duration: 500
          });
        }
      }
    } catch (error) {
      // Leave the imported features on the map even if bounds fitting fails.
    }
  };

  handleUploadedFile = async (file) => {
    if (this.isImageFile(file)) {
      if (!this.confirmImageOverwrite()) {
        return;
      }

      this.handleImageSelected(file);
      return;
    }

    if (this.isGeoJSONFile(file)) {
      try {
        const text = await this.readFileAsText(file);
        this.importGeoJSONData(text);
      } catch (error) {
        this.showActionFeedback('Unable to load that GeoJSON file', 'error');
      }
    }
  };

  handleWindowDrop = async (event) => {
    event.preventDefault();

    const files = event.dataTransfer ? Array.from(event.dataTransfer.files || []) : [];
    const supportedFile = files.find((file) => this.isImageFile(file) || this.isGeoJSONFile(file));

    if (!supportedFile) {
      return;
    }

    await this.handleUploadedFile(supportedFile);
  };

  handleWindowCopy = (event) => {
    if (this.isEditableTarget(event.target)) {
      return;
    }

    const payload = this.getClipboardGeoJSONPayload();

    if (!payload || !event.clipboardData) {
      return;
    }

    const text = JSON.stringify(payload.data, null, 2);

    event.preventDefault();
    event.clipboardData.setData('application/geo+json', text);
    event.clipboardData.setData('application/json', text);
    event.clipboardData.setData('text/plain', text);
    this.showActionFeedback(payload.message);
  };

  handleWindowPaste = (event) => {
    if (this.isEditableTarget(event.target)) {
      return;
    }

    const clipboardData = event.clipboardData;

    if (!clipboardData) {
      return;
    }

    const imageFile = this.getClipboardImageFile(clipboardData);

    if (imageFile) {
      if (!this.confirmImageOverwrite()) {
        return;
      }

      event.preventDefault();
      this.handleImageSelected(imageFile);
      return;
    }

    const text =
      clipboardData.getData('application/geo+json') ||
      clipboardData.getData('application/json') ||
      clipboardData.getData('text/plain');

    if (!text) {
      return;
    }

    try {
      const parsed = JSON.parse(text);

      if (
        !parsed ||
        (parsed.type !== 'Feature' && parsed.type !== 'FeatureCollection')
      ) {
        return;
      }

      event.preventDefault();
      this.importGeoJSONData(text);
    } catch (error) {
      // Ignore pasted text that is not GeoJSON.
    }
  };

  handleContextMenu = (event) => {
    event.preventDefault();
  };

  isFreehandCapableMode = () => {
    return (
      this.state.activeDrawMode === 'draw_polygon' ||
      this.state.activeDrawMode === 'draw_line_string'
    );
  };

  handleMapClickCapture = (event) => {
    if (!this.suppressNextDrawClick) {
      return;
    }

    this.suppressNextDrawClick = false;
    event.preventDefault();
    event.stopPropagation();
  };

  handleMapMouseDown = (event) => {
    if (!this.map) {
      return;
    }

    if (event.button === 1) {
      event.preventDefault();

      const now = Date.now();
      const isResetGesture =
        this.lastMiddleMouseDown &&
        now - this.lastMiddleMouseDown.timestamp < 320 &&
        Math.abs(event.clientX - this.lastMiddleMouseDown.x) < 10 &&
        Math.abs(event.clientY - this.lastMiddleMouseDown.y) < 10;

      this.lastMiddleMouseDown = {
        timestamp: now,
        x: event.clientX,
        y: event.clientY
      };

      if (isResetGesture) {
        this.resetMapOrientation();
        return;
      }

      this.middleRotateState = {
        startX: event.clientX,
        startY: event.clientY,
        bearing: this.map.getBearing(),
        pitch: this.map.getPitch()
      };

      window.addEventListener('mousemove', this.handleMiddleRotateMove);
      window.addEventListener('mouseup', this.handleMiddleRotateEnd);
      return;
    }

    if (event.button === 0 && this.isFreehandCapableMode()) {
      this.leftPanState = {
        startX: event.clientX,
        startY: event.clientY,
        moved: false
      };

      window.addEventListener('mousemove', this.handleLeftPanMove);
      window.addEventListener('mouseup', this.handleLeftPanEnd);
    }
  };

  detachMiddleRotateListeners = () => {
    window.removeEventListener('mousemove', this.handleMiddleRotateMove);
    window.removeEventListener('mouseup', this.handleMiddleRotateEnd);
  };

  detachLeftPanListeners = () => {
    window.removeEventListener('mousemove', this.handleLeftPanMove);
    window.removeEventListener('mouseup', this.handleLeftPanEnd);
  };

  handleMiddleRotateMove = (event) => {
    if (!this.middleRotateState || !this.map) {
      return;
    }

    const deltaX = event.clientX - this.middleRotateState.startX;
    const deltaY = event.clientY - this.middleRotateState.startY;
    const nextBearing = this.middleRotateState.bearing + deltaX * 0.35;
    const nextPitch = Math.max(0, Math.min(60, this.middleRotateState.pitch - deltaY * 0.25));

    this.map.setBearing(nextBearing);
    this.map.setPitch(nextPitch);
  };

  handleMiddleRotateEnd = () => {
    this.middleRotateState = null;
    this.detachMiddleRotateListeners();
  };

  resetMapOrientation = () => {
    if (!this.map) {
      return;
    }

    this.middleRotateState = null;
    this.detachMiddleRotateListeners();
    this.map.easeTo({
      bearing: 0,
      pitch: 0,
      duration: 250
    });
  };

  handleLeftPanMove = (event) => {
    if (!this.leftPanState) {
      return;
    }

    const deltaX = Math.abs(event.clientX - this.leftPanState.startX);
    const deltaY = Math.abs(event.clientY - this.leftPanState.startY);

    if (deltaX > 4 || deltaY > 4) {
      this.leftPanState.moved = true;
    }
  };

  handleLeftPanEnd = () => {
    if (this.leftPanState && this.leftPanState.moved) {
      this.suppressNextDrawClick = true;
      window.setTimeout(() => {
        this.suppressNextDrawClick = false;
      }, 0);
    }

    this.leftPanState = null;
    this.detachLeftPanListeners();
  };

  openFilePicker = () => {
    if (this.fileInputRef.current) {
      this.fileInputRef.current.value = '';
      this.fileInputRef.current.click();
    }
  };

  handleFileInputChange = (event) => {
    const [file] = Array.from(event.target.files || []);

    if (!file) {
      return;
    }

    this.handleUploadedFile(file);
  };

  handleImageSelected = (file) => {
    const nextImageUrl = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      if (!this.isMountedFlag) {
        URL.revokeObjectURL(nextImageUrl);
        return;
      }

      const nextAspectRatio = image.naturalWidth / image.naturalHeight || 1;
      const nextHeight = this.state.imageWidth / nextAspectRatio;

      this.revokeImageObjectUrl();
      this.imageObjectUrl = nextImageUrl;
      this.removeLockedImageLayer();
      this.lockedImageState = null;

      this.setState({
        imageUrl: nextImageUrl,
        imageAspectRatio: nextAspectRatio,
        aspectLockRatio: nextAspectRatio,
        imageHeight: nextHeight,
        imagePerspectiveX: 0,
        imagePerspectiveY: 0,
        imagePerspectiveZ: 0,
        imageQuad: this.buildImageQuad(
          this.getCenteredImagePlacement(this.state.imageWidth, nextAspectRatio, nextHeight),
          0,
          0,
          0,
          0,
          this.state.imageWidth,
          nextHeight
        ),
        imagePlacement: this.getCenteredImagePlacement(
          this.state.imageWidth,
          nextAspectRatio,
          nextHeight
        ),
        imageRotation: 0,
        isImageLocked: false
      }, this.resetHistory);
      this.showActionFeedback('Image loaded');
    };

    image.onerror = () => {
      URL.revokeObjectURL(nextImageUrl);
    };

    image.src = nextImageUrl;
  };

  handleChange = (event) => {
    const { name, value } = event.target;
    const numericValue =
      name === 'mapOpacity' ||
      name === 'imageOpacity' ||
      name === 'imageWidth' ||
      name === 'imageHeight' ||
      name === 'imageRotation' ||
      name === 'imagePerspectiveX' ||
      name === 'imagePerspectiveY' ||
      name === 'imagePerspectiveZ'
        ? Number(value)
        : value;

    if (typeof numericValue === 'number') {
      this.applyRangeValue(name, numericValue);
      return;
    }

    this.setState({
      [name]: numericValue
    });
  };

  applyRangeValue = (name, numericValue) => {
    const captureHistory = !this.isRangeInteractionActive(name);

    if (this.rangeInteraction && this.rangeInteraction.fieldName === name) {
      this.rangeInteraction.changed = true;
    }

    if (name === 'imageWidth') {
      const scale = this.state.imageWidth === 0 ? 1 : numericValue / this.state.imageWidth;
      const nextState = { imageWidth: numericValue };

      if (this.state.isAspectRatioLocked) {
        nextState.imageHeight = numericValue / this.state.aspectLockRatio;
      }

      this.updateImageScreenCorners(
        (corners) => this.scaleImageQuad(
          corners,
          scale,
          this.state.isAspectRatioLocked ? scale : 1
        ),
        nextState,
        { captureHistory }
      );
      return;
    }

    if (name === 'imageHeight') {
      const scale = this.state.imageHeight === 0 ? 1 : numericValue / this.state.imageHeight;
      const nextState = { imageHeight: numericValue };

      if (this.state.isAspectRatioLocked) {
        nextState.imageWidth = numericValue * this.state.aspectLockRatio;
      }

      this.updateImageScreenCorners(
        (corners) => this.scaleImageQuad(
          corners,
          this.state.isAspectRatioLocked ? scale : 1,
          scale
        ),
        nextState,
        { captureHistory }
      );
      return;
    }

    if (name === 'mapOpacity') {
      this.setState({
        [name]: numericValue
      }, () => {
        this.applyMapOpacity(numericValue);
        if (captureHistory) {
          this.recordHistorySnapshot();
        }
      });
      return;
    }

    if (name === 'imageOpacity') {
      this.setState({
        imageOpacity: numericValue
      }, () => {
        this.updateLockedImageTransform();
        if (captureHistory) {
          this.recordHistorySnapshot();
        }
      });
      return;
    }

    if (name === 'imageRotation') {
      this.applyRebuiltImageQuad({
        imageRotation: numericValue
      }, { captureHistory });
      return;
    }

    if (name === 'imagePerspectiveX') {
      this.applyRebuiltImageQuad({
        imagePerspectiveX: numericValue
      }, { captureHistory });
      return;
    }

    if (name === 'imagePerspectiveY') {
      this.applyRebuiltImageQuad({
        imagePerspectiveY: numericValue
      }, { captureHistory });
      return;
    }

    if (name === 'imagePerspectiveZ') {
      this.applyRebuiltImageQuad({
        imagePerspectiveZ: numericValue
      }, { captureHistory });
      return;
    }

    this.setState({
      [name]: numericValue
    });
  };

  getDefaultRangeValue = (fieldName) => {
    if (fieldName === 'imageHeight') {
      return DEFAULT_RANGE_VALUES.imageWidth / this.state.imageAspectRatio;
    }

    return DEFAULT_RANGE_VALUES[fieldName];
  };

  resetRangeField = (fieldName) => {
    const defaultValue = this.getDefaultRangeValue(fieldName);

    if (typeof defaultValue !== 'number' || Number.isNaN(defaultValue)) {
      return;
    }

    this.applyRangeValue(fieldName, defaultValue);
  };

  isRangeFieldAtDefault = (fieldName) => {
    const defaultValue = this.getDefaultRangeValue(fieldName);
    const currentValue = Number(this.state[fieldName]);

    if (!Number.isFinite(defaultValue) || !Number.isFinite(currentValue)) {
      return true;
    }

    return Math.abs(currentValue - defaultValue) < 0.0001;
  };

  handleProviderChange = (provider) => {
    const nextProvider = resolveProvider(provider, HAS_MAPBOX_TOKEN);

    if (nextProvider === this.state.provider) {
      return;
    }

    this.setState({
      provider: nextProvider,
      providerNotice: getMapProviderNotice(nextProvider, HAS_MAPBOX_TOKEN),
      providerError: ''
    });
  };

  toggleAspectRatioLock = () => {
    this.setState((currentState) => {
      const nextLocked = !currentState.isAspectRatioLocked;

      if (!nextLocked) {
        return {
          isAspectRatioLocked: false
        };
      }

      const nextAspectLockRatio =
        currentState.imageHeight === 0
          ? currentState.aspectLockRatio || currentState.imageAspectRatio
          : currentState.imageWidth / currentState.imageHeight;

      return {
        isAspectRatioLocked: true,
        aspectLockRatio: nextAspectLockRatio
      };
    });
  };

  resetImageProportions = () => {
    const currentCorners = this.getEditableImageScreenCorners();
    const center = this.getScreenPointCenter(currentCorners);
    const nextHeight = this.state.imageWidth / this.state.imageAspectRatio;
    const placement = {
      x: center ? center.x : this.getCurrentImagePlacement().x,
      y: center ? center.y : this.getCurrentImagePlacement().y,
      width: this.state.imageWidth,
      height: nextHeight
    };
    const nextCorners = this.buildImageQuad(
      placement,
      0,
      0,
      0,
      0,
      this.state.imageWidth,
      nextHeight
    );

    if (this.state.isImageLocked) {
      this.updateLockedImageFromScreenPoints(nextCorners, {
        imageHeight: nextHeight,
        imageRotation: 0,
        imagePerspectiveX: 0,
        imagePerspectiveY: 0,
        imagePerspectiveZ: 0,
        aspectLockRatio: this.state.imageAspectRatio,
        isAspectRatioLocked: true
      }, { captureHistory: true });
      return;
    }

    this.setUnlockedImageQuad(nextCorners, {
      imagePlacement: placement,
      imageHeight: nextHeight,
      imageRotation: 0,
      imagePerspectiveX: 0,
      imagePerspectiveY: 0,
      imagePerspectiveZ: 0,
      aspectLockRatio: this.state.imageAspectRatio,
      isAspectRatioLocked: true
    }, { captureHistory: true });
  };

  lockImageToMap = () => {
    if (!this.map || !this.state.imageUrl) {
      return;
    }

    const screenCorners = this.getEditableImageScreenCorners();
    const coordinates = this.mapScreenPointsToCoordinates(screenCorners);

    if (!this.areValidScreenCorners(screenCorners) || coordinates.length !== 4) {
      this.showActionFeedback('Could not lock the image from its current screen position', 'error');
      return;
    }

    this.lockedImageState = {
      coordinates,
      imageUrl: this.state.imageUrl
    };

    this.setState({
      isImageLocked: true
    }, () => {
      this.syncLockedImageLayer();
      this.recordHistorySnapshot();
    });
  };

  unlockImageFromMap = () => {
    const currentScreenCorners = this.getLockedImageScreenCorners();

    if (!this.areValidScreenCorners(currentScreenCorners)) {
      this.showActionFeedback('Could not unlock the image from its current map position', 'error');
      return;
    }

    const nextPlacement = this.getPlacementFromScreenCorners(currentScreenCorners);

    this.removeLockedImageLayer();
    this.lockedImageState = null;

    this.setState({
      isImageLocked: false,
      imagePlacement: nextPlacement,
      imageQuad: this.cloneScreenPoints(currentScreenCorners)
    }, this.recordHistorySnapshot);
  };

  setMapStyle = (variant) => {
    if (!this.map) {
      return;
    }

    const featureSnapshot = this.getDrawFeatureCollection();
    const selectedFeatureId = this.state.selectedFeatureId;

    this.map.setStyle(getProviderStyle(this.state.provider, variant));
    this.map.once('style.load', () => {
      this.cacheBaseLayerOpacity();
      this.applyMapOpacity(this.state.mapOpacity);
      this.syncLockedImageLayer();
      this.restoreDrawState(featureSnapshot, selectedFeatureId);
      this.removeEmptyControlShells();
    });

    this.setState({
      activeStyleVariant: variant
    });
  };

  finZoomIn = () => {
    if (!this.map) {
      return;
    }

    this.map.setZoom(this.map.getZoom() + 0.01);
  };

  finZoomOut = () => {
    if (!this.map) {
      return;
    }

    this.map.setZoom(this.map.getZoom() - 0.01);
  };

  changeRegion = (regionKey) => {
    const preset = REGION_PRESETS[regionKey];

    if (!preset) {
      return;
    }

    this.setState({
      activeRegion: regionKey,
      lng: preset.lng,
      lat: preset.lat,
      zoom: preset.zoom
    });

    if (this.map) {
      this.map.easeTo({
        center: [preset.lng, preset.lat],
        zoom: preset.zoom,
        duration: 700
      });
    }
  };

  handleCoordinateInputChange = (event) => {
    this.setState({
      coordinateInput: event.target.value
    });
  };

  centerMapOnCoordinates = () => {
    const parts = this.state.coordinateInput
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (parts.length !== 2) {
      window.alert('Enter coordinates as: latitude, longitude');
      return;
    }

    const latitude = Number(parts[0]);
    const longitude = Number(parts[1]);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      window.alert('Coordinates must be numeric.');
      return;
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      window.alert('Coordinates are out of range.');
      return;
    }

    this.setState({
      activeRegion: '',
      lat: latitude,
      lng: longitude,
      zoom: COORDINATE_SEARCH_ZOOM
    });

    if (this.map) {
      this.map.easeTo({
        center: [longitude, latitude],
        zoom: COORDINATE_SEARCH_ZOOM,
        duration: 700
      });
    }
  };

  startRangeFieldEdit = (fieldName) => {
    const config = RANGE_FIELD_CONFIG[fieldName];
    const value = Number(this.state[fieldName]);
    const displayValue =
      config && config.decimals > 0 ? value.toFixed(config.decimals) : `${Math.round(value)}`;

    this.setState({
      editingRangeField: fieldName,
      editingRangeValue: displayValue
    });
  };

  handleRangeFieldEditChange = (event) => {
    this.setState({
      editingRangeValue: event.target.value
    });
  };

  commitRangeFieldEdit = () => {
    const { editingRangeField, editingRangeValue } = this.state;
    const config = RANGE_FIELD_CONFIG[editingRangeField];
    const parsedValue = Number(editingRangeValue);

    if (!editingRangeField) {
      return;
    }

    this.setState({
      editingRangeField: null,
      editingRangeValue: ''
    });

    if (!config || !Number.isFinite(parsedValue)) {
      return;
    }

    const clampedValue = Math.min(config.max, Math.max(config.min, parsedValue));
    this.handleChange({
      target: {
        name: editingRangeField,
        value: clampedValue
      }
    });
  };

  cancelRangeFieldEdit = () => {
    this.setState({
      editingRangeField: null,
      editingRangeValue: ''
    });
  };

  startDrawMode = (mode) => {
    if (!this.Draw) {
      return;
    }

    if (this.state.activeDrawMode === mode) {
      this.Draw.changeMode('simple_select');
      this.setState({
        activeDrawMode: 'simple_select',
        selectedFeatureId: null
      });
      return;
    }

    this.Draw.changeMode(mode);
    this.setState({
      activeDrawMode: mode,
      selectedFeatureId: null
    });
  };

  clearSelectedDrawing = () => {
    if (!this.Draw) {
      return;
    }

    this.Draw.trash();
    this.setState({
      activeDrawMode: 'simple_select'
    }, this.syncFeaturesFromDraw);
  };

  selectFeature = (featureId) => {
    if (!this.Draw) {
      return;
    }

    this.Draw.changeMode('simple_select', {
      featureIds: [featureId]
    });

    this.setState({
      activeDrawMode: 'simple_select',
      selectedFeatureId: featureId
    });
  };

  editFeature = (featureId) => {
    if (!this.Draw) {
      return;
    }

    this.Draw.changeMode('direct_select', {
      featureId
    });

    this.setState({
      activeDrawMode: 'direct_select',
      selectedFeatureId: featureId
    });
  };

  deleteFeature = (featureId) => {
    if (!this.Draw) {
      return;
    }

    this.Draw.delete(featureId);
    this.setState({
      activeDrawMode: 'simple_select',
      editingFeatureId: this.state.editingFeatureId === featureId ? null : this.state.editingFeatureId,
      editingFeatureLabel:
        this.state.editingFeatureId === featureId ? '' : this.state.editingFeatureLabel
    }, this.syncFeaturesFromDraw);
  };

  startFeatureLabelEdit = (featureId) => {
    const featureEntry = this.state.features.find((feature) => feature.id === featureId);

    if (!featureEntry) {
      return;
    }

    this.selectFeature(featureId);
    this.setState({
      editingFeatureId: featureId,
      editingFeatureLabel: featureEntry.label
    });
  };

  handleFeatureLabelChange = (event) => {
    this.setState({
      editingFeatureLabel: event.target.value
    });
  };

  commitFeatureLabel = () => {
    const { editingFeatureId, editingFeatureLabel, features } = this.state;

    if (!editingFeatureId || !this.Draw) {
      return;
    }

    const currentFeature = features.find((feature) => feature.id === editingFeatureId);
    const nextLabel = editingFeatureLabel.trim() || (currentFeature ? currentFeature.label : '');

    this.Draw.setFeatureProperty(editingFeatureId, 'label', nextLabel);
    this.Draw.setFeatureProperty(editingFeatureId, 'name', nextLabel);
    this.Draw.setFeatureProperty(editingFeatureId, 'title', nextLabel);
    this.setState({
      editingFeatureId: null,
      editingFeatureLabel: ''
    }, this.syncFeaturesFromDraw);
  };

  cancelFeatureLabelEdit = () => {
    this.setState({
      editingFeatureId: null,
      editingFeatureLabel: ''
    });
  };

  triggerGeoJSONDownload = (data, filename) => {
    const convertedData = `text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data))}`;
    const exportLink = document.getElementById('export');

    exportLink.setAttribute('href', `data:${convertedData}`);
    exportLink.setAttribute('download', filename);
    exportLink.click();
    this.showActionFeedback(`Downloaded ${filename}`);
  };

  downloadFeature = (featureId) => {
    const featureEntry = this.state.features.find((feature) => feature.id === featureId);
    const drawFeature = this.getDrawFeatureById(featureId);

    if (!featureEntry || !drawFeature) {
      return;
    }

    this.triggerGeoJSONDownload(
      this.getNormalizedDrawData(turf.featureCollection([drawFeature])),
      `${featureEntry.label.replace(/\s+/g, '-').toLowerCase()}.geojson`
    );
  };

  downloadGeoJSON = () => {
    const data = this.getNormalizedDrawData();

    if (data.features.length === 0) {
      this.showActionFeedback('Nothing to export', 'error');
      return;
    }

    this.triggerGeoJSONDownload(data, 'data.geojson');
  };

  copyGeoJSON = async () => {
    const payload = this.getClipboardGeoJSONPayload();

    if (!payload) {
      this.showActionFeedback('Nothing to copy', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload.data, null, 2));
      this.showActionFeedback(payload.message);
    } catch (error) {
      this.showActionFeedback('Could not copy GeoJSON', 'error');
    }
  };

  copyFeature = async (featureId) => {
    const featureEntry = this.state.features.find((feature) => feature.id === featureId);
    const drawFeature = this.getDrawFeatureById(featureId);

    if (!featureEntry || !drawFeature) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        JSON.stringify(
          this.getNormalizedDrawData(turf.featureCollection([drawFeature])),
          null,
          2
        )
      );
      this.showActionFeedback(`Copied ${featureEntry.label} as GeoJSON`);
    } catch (error) {
      this.showActionFeedback('Could not copy that feature', 'error');
    }
  };

  toggleImageLock = () => {
    if (this.state.isImageLocked) {
      this.unlockImageFromMap();
      return;
    }

    this.lockImageToMap();
  };

  toggleHelp = () => {
    this.setState((currentState) => ({
      isHelpOpen: !currentState.isHelpOpen
    }));
  };

  toggleSidebarSection = (sectionName) => {
    this.setState((currentState) => ({
      [sectionName]: !currentState[sectionName]
    }));
  };

  handleGlobalKeyDown = (event) => {
    if (this.isEditableTarget(event.target)) {
      return;
    }

    const isModifierPressed = event.ctrlKey || event.metaKey;

    if (isModifierPressed && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        this.redoHistory();
      } else {
        this.undoHistory();
      }
      return;
    }

    if (isModifierPressed && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      this.redoHistory();
      return;
    }

    if ((event.key === 'Delete' || event.key === 'Backspace') && this.Draw) {
      event.preventDefault();
      this.Draw.trash();
      this.syncFeaturesFromDraw();
      return;
    }

    if (!this.map) return;
    const panAmount = event.ctrlKey ? 1 : 100; // px
    let dx = 0, dy = 0;
    switch (event.key) {
      case 'ArrowUp':
        dy = -panAmount;
        break;
      case 'ArrowDown':
        dy = panAmount;
        break;
      case 'ArrowLeft':
        dx = -panAmount;
        break;
      case 'ArrowRight':
        dx = panAmount;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.map.panBy([dx, dy], { animate: false });
  };

  handleMapCtrlWheel = (event) => {
    if (!this.map) return;
    if (event.ctrlKey) {
      event.preventDefault();
      event.stopPropagation();
      const direction = event.deltaY > 0 ? -1 : 1;
      this.map.setZoom(this.map.getZoom() + direction * 0.01);
    }
  };

  renderRangeValue = (fieldName, formatter) => {
    if (this.state.editingRangeField === fieldName) {
      const config = RANGE_FIELD_CONFIG[fieldName];

      return (
        <div className="range-label__controls">
          <input
            autoFocus
            className="range-label__input"
            min={config.min}
            max={config.max}
            onBlur={this.commitRangeFieldEdit}
            onChange={this.handleRangeFieldEditChange}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                this.commitRangeFieldEdit();
              }

              if (event.key === 'Escape') {
                this.cancelRangeFieldEdit();
              }
            }}
            step={config.step}
            type="number"
            value={this.state.editingRangeValue}
          />
          <button
            aria-label={`Reset ${fieldName}`}
            className="range-label__reset"
            disabled={this.isRangeFieldAtDefault(fieldName)}
            onClick={() => this.resetRangeField(fieldName)}
            title="Reset value"
            type="button"
          >
            <i className="fa-solid fa-arrow-rotate-left" aria-hidden="true"></i>
          </button>
        </div>
      );
    }

    return (
      <div className="range-label__controls">
        <button
          className="range-label__button"
          onDoubleClick={() => this.startRangeFieldEdit(fieldName)}
          type="button"
        >
          {formatter(this.state[fieldName])}
        </button>
        <button
          aria-label={`Reset ${fieldName}`}
          className="range-label__reset"
          disabled={this.isRangeFieldAtDefault(fieldName)}
          onClick={() => this.resetRangeField(fieldName)}
          title="Reset value"
          type="button"
        >
          <i className="fa-solid fa-arrow-rotate-left" aria-hidden="true"></i>
        </button>
      </div>
    );
  };

  getRangeInputStyle = (fieldName) => {
    const config = RANGE_FIELD_CONFIG[fieldName];

    if (!config) {
      return {};
    }

    const min = Number(config.min);
    const max = Number(config.max);
    const value = Number(this.state[fieldName]);
    const baseColor = 'rgba(49, 46, 129, 0.14)';
    const fillColor = 'rgba(49, 46, 129, 0.42)';
    const span = max - min;

    if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(value) || span <= 0) {
      return {};
    }

    const percentage = ((value - min) / span) * 100;
    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    const isZeroCenteredField = (
      fieldName === 'imageRotation' ||
      fieldName === 'imagePerspectiveX' ||
      fieldName === 'imagePerspectiveY' ||
      fieldName === 'imagePerspectiveZ'
    );

    let background = `linear-gradient(to right, ${fillColor} 0%, ${fillColor} ${clampedPercentage}%, ${baseColor} ${clampedPercentage}%, ${baseColor} 100%)`;

    if (isZeroCenteredField && min < 0 && max > 0) {
      const zeroPercentage = ((0 - min) / span) * 100;
      const start = Math.min(clampedPercentage, zeroPercentage);
      const end = Math.max(clampedPercentage, zeroPercentage);

      background = `linear-gradient(to right, ${baseColor} 0%, ${baseColor} ${start}%, ${fillColor} ${start}%, ${fillColor} ${end}%, ${baseColor} ${end}%, ${baseColor} 100%)`;
    }

    return {
      '--range-track-background': background
    };
  };

  render() {
    const providerOptions = getMapProviderOptions(HAS_MAPBOX_TOKEN);
    const isDrawing =
      this.state.activeDrawMode === 'draw_polygon' ||
      this.state.activeDrawMode === 'draw_line_string' ||
      this.state.activeDrawMode === 'draw_point';

    return (
      <div>
        <input
          accept="image/*,.geojson,.json,application/geo+json,application/json"
          hidden
          onChange={this.handleFileInputChange}
          ref={this.fileInputRef}
          type="file"
        />
        <div
          ref={this.mapContainer}
          className={`map-container${isDrawing ? ' is-drawing' : ''}`}
        />
        <button
          aria-label={this.state.isHelpOpen ? 'Close help' : 'Open help'}
          className={`help-trigger${this.state.isHelpOpen ? ' is-active' : ''}`}
          onClick={this.toggleHelp}
          title={this.state.isHelpOpen ? 'Close help' : 'Open help'}
          type="button"
        >
          <i className="fa-solid fa-circle-info" aria-hidden="true"></i>
        </button>
        <button
          aria-label={this.state.isImageLocked ? 'Unlock image from map' : 'Lock image to map'}
          className={`map-state-badge${this.state.isImageLocked ? ' map-state-badge--locked' : ' map-state-badge--unlocked'}`}
          onClick={this.toggleImageLock}
          title={this.state.isImageLocked ? 'Unlock image from map' : 'Lock image to map'}
          type="button"
        >
          <i
            className={`fa-solid ${this.state.isImageLocked ? 'fa-lock' : 'fa-lock-open'}`}
            aria-hidden="true"
          ></i>
        </button>
        {this.state.actionFeedback && (
          <div
            key={this.state.actionFeedback.id}
            className={`toast-feedback toast-feedback--${this.state.actionFeedback.tone}`}
          >
            <i
              className={`fa-solid ${
                this.state.actionFeedback.tone === 'error'
                  ? 'fa-circle-exclamation'
                  : 'fa-circle-check'
              }`}
              aria-hidden="true"
            ></i>
            <span>{this.state.actionFeedback.message}</span>
          </div>
        )}
        {this.state.isHelpOpen && (
          <div
            className="help-overlay"
            onClick={this.toggleHelp}
            role="presentation"
          >
            <div
              className="help-overlay__dialog"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="How to use img2geojson"
            >
              <div className="help-overlay__header">
                <div className="help-overlay__brand">
                  <img src={`${process.env.PUBLIC_URL}/logo.svg`} alt="" />
                  <div>
                    <p>img2geojson</p>
                    <span>How to use</span>
                  </div>
                </div>
                <button
                  aria-label="Close help"
                  className="help-overlay__close"
                  onClick={this.toggleHelp}
                  type="button"
                >
                  Close
                </button>
              </div>
              <div className="help-overlay__body">
                <div className="help-section">
                  <div className="help-section__title">
                    <i className="fa-solid fa-play" aria-hidden="true"></i>
                    <span>Quick start</span>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-upload" aria-hidden="true"></i>
                    <p>Start by selecting `Upload image / GeoJSON`, dragging a file onto the page, or pasting an image or GeoJSON from the clipboard.</p>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-image" aria-hidden="true"></i>
                    <p>Use the image controls to line up your image with the map. Adjust size, rotation, opacity, and perspective until it sits where you want it, and use the small reset icons to zero a single control.</p>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-lock" aria-hidden="true"></i>
                    <p>When the image is lined up, click the lock badge at the top right of the map so it stays in place while you pan, zoom, rotate, or tilt the map.</p>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-draw-polygon" aria-hidden="true"></i>
                    <p>Choose polygon, line, or marker and trace what you need. When you finish, copy or download the result as GeoJSON.</p>
                  </div>
                </div>

                <div className="help-section">
                  <div className="help-section__title">
                    <i className="fa-solid fa-computer-mouse" aria-hidden="true"></i>
                    <span>Mouse and keyboard</span>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-arrow-pointer" aria-hidden="true"></i>
                    <p>Drag with the left mouse button to move around the map. Left click adds points, or places a marker if the marker tool is active.</p>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>
                    <p>Use right-drag to sketch a polygon or line freehand. For polygons, click the first point again to close the shape.</p>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-arrows-rotate" aria-hidden="true"></i>
                    <p>Use middle-drag to rotate or tilt the map, and double middle click if you want to reset it to flat north-up view.</p>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-keyboard" aria-hidden="true"></i>
                    <p>Use the arrow keys to nudge the map. When a slider is focused, the arrow keys adjust that slider instead. `Ctrl/Cmd+Z` undoes, `Ctrl/Cmd+Shift+Z` or `Ctrl+Y` redoes, `Ctrl/Cmd+C` copies GeoJSON, and `Ctrl/Cmd+V` pastes an image or GeoJSON when your cursor is not inside a text field.</p>
                  </div>
                </div>

                <div className="help-section">
                  <div className="help-section__title">
                    <i className="fa-solid fa-pen-ruler" aria-hidden="true"></i>
                    <span>Drawing and features</span>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-vector-square" aria-hidden="true"></i>
                    <p>Select a draw tool to start drawing, and select it again when you want to leave draw mode. Use `Delete` or `Backspace` to remove selected vertices, the current sketch, or the selected feature.</p>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-list" aria-hidden="true"></i>
                    <p>Use the feature list to select, edit, rename, copy, download, or delete one item at a time.</p>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-tag" aria-hidden="true"></i>
                    <p>Select a feature name in the list if you want to rename it before exporting.</p>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-file-import" aria-hidden="true"></i>
                    <p>You can bring in existing GeoJSON by upload, drag-and-drop, or paste, and it will be added to your current feature list.</p>
                  </div>
                </div>

                <div className="help-section">
                  <div className="help-section__title">
                    <i className="fa-solid fa-map" aria-hidden="true"></i>
                    <span>Map and image settings</span>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
                    <p>Use the zoom buttons for fine adjustments, and double click a slider value if you want to type an exact number.</p>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-location-crosshairs" aria-hidden="true"></i>
                    <p>Jump to Australia or the Middle East, or paste coordinates such as `32.08446, 35.91316` to centre the map on a specific place.</p>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-layer-group" aria-hidden="true"></i>
                    <p>Switch styles when you need a cleaner tracing view. If the map is distracting, lower map opacity and keep tracing over your image.</p>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-globe" aria-hidden="true"></i>
                    <p>Use `Map provider` if you want to switch between MapLibre and Mapbox.</p>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                    <p>If part of your image is off-screen while aligning it, bring it back into view before locking if the lock action is rejected.</p>
                  </div>
                </div>

                <div className="help-section">
                  <div className="help-section__title">
                    <i className="fa-solid fa-circle-info" aria-hidden="true"></i>
                    <span>About</span>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-user" aria-hidden="true"></i>
                    <p>By Basel, forked from the <a href="https://caseymm.github.io/img2geojson/">original project</a> by @caseymmiller.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {this.state.imageUrl && !this.state.isImageLocked && (
          <div
            ref={this.imageOverlayRef}
            className="image-overlay"
            style={this.getOverlayStyle()}
          >
            <img src={this.state.imageUrl} alt="" draggable="false" />
            <span className="image-overlay__corner-marker image-overlay__corner-marker--tl" ref={this.imageCornerRefs[0]} />
            <span className="image-overlay__corner-marker image-overlay__corner-marker--tr" ref={this.imageCornerRefs[1]} />
            <span className="image-overlay__corner-marker image-overlay__corner-marker--br" ref={this.imageCornerRefs[2]} />
            <span className="image-overlay__corner-marker image-overlay__corner-marker--bl" ref={this.imageCornerRefs[3]} />
          </div>
        )}
        <div className="panel panel--left">
          <div className="settings-section">
            <button
              aria-expanded={this.state.toolsSectionOpen}
              className={`section-toggle${this.state.toolsSectionOpen ? ' is-open' : ''}`}
              onClick={() => this.toggleSidebarSection('toolsSectionOpen')}
              type="button"
            >
              <span>
                <i className="fa-solid fa-pen-ruler" aria-hidden="true"></i>
                Tools
              </span>
              <i className="fa-solid fa-chevron-down" aria-hidden="true"></i>
            </button>
            {this.state.toolsSectionOpen && (
              <div className="settings-section__body settings-section__body--tools">
                <div className="button-container button-container--history">
                  <button
                    aria-label="Undo"
                    disabled={!this.state.canUndo}
                    onClick={this.undoHistory}
                    title="Undo"
                    type="button"
                  >
                    <i className="fa-solid fa-arrow-rotate-left" aria-hidden="true"></i>
                    <span>Undo</span>
                  </button>
                  <button
                    aria-label="Redo"
                    disabled={!this.state.canRedo}
                    onClick={this.redoHistory}
                    title="Redo"
                    type="button"
                  >
                    <i className="fa-solid fa-arrow-rotate-right" aria-hidden="true"></i>
                    <span>Redo</span>
                  </button>
                </div>
                <div className="button-container button-container--draw">
                  <button
                    aria-label="Draw polygon"
                    className={`mapbox-gl-draw_polygon${this.state.activeDrawMode === 'draw_polygon' ? ' is-active' : ''}`}
                    onClick={() => this.startDrawMode('draw_polygon')}
                    title="Draw polygon"
                    type="button"
                  >
                    <i className="fa-solid fa-draw-polygon" aria-hidden="true"></i>
                  </button>
                  <button
                    aria-label="Draw line"
                    className={`mapbox-gl-draw_line${this.state.activeDrawMode === 'draw_line_string' ? ' is-active' : ''}`}
                    onClick={() => this.startDrawMode('draw_line_string')}
                    title="Draw line"
                    type="button"
                  >
                    <i className="fa-solid fa-pen-ruler" aria-hidden="true"></i>
                  </button>
                  <button
                    aria-label="Draw marker"
                    className={`mapbox-gl-draw_point${this.state.activeDrawMode === 'draw_point' ? ' is-active' : ''}`}
                    onClick={() => this.startDrawMode('draw_point')}
                    title="Draw marker"
                    type="button"
                  >
                    <i className="fa-solid fa-location-dot" aria-hidden="true"></i>
                  </button>
                  <button
                    aria-label="Delete selected drawing"
                    className="mapbox-gl-draw_trash"
                    onClick={this.clearSelectedDrawing}
                    title="Delete selected drawing"
                    type="button"
                  >
                    <i className="fa-solid fa-trash" aria-hidden="true"></i>
                  </button>
                </div>
                <p className="small">Left click adds points. Right drag freehands.</p>
                <button className="button-with-icon" onClick={this.openFilePicker} type="button">
                  <i className="fa-solid fa-upload" aria-hidden="true"></i>
                  <span>Upload image / GeoJSON</span>
                </button>
                <div className="button-container button-container--export">
                  <button onClick={this.downloadGeoJSON} type="button">
                    <i className="fa-solid fa-download" aria-hidden="true"></i>
                    <span>Download</span>
                  </button>
                  <button onClick={this.copyGeoJSON} type="button">
                    <i className="fa-solid fa-copy" aria-hidden="true"></i>
                    <span>Copy</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="settings-section settings-section--grow">
            <button
              aria-expanded={this.state.featuresSectionOpen}
              className={`section-toggle${this.state.featuresSectionOpen ? ' is-open' : ''}`}
              onClick={() => this.toggleSidebarSection('featuresSectionOpen')}
              type="button"
            >
              <span>
                <i className="fa-solid fa-list" aria-hidden="true"></i>
                Features
              </span>
              <i className="fa-solid fa-chevron-down" aria-hidden="true"></i>
            </button>
            {this.state.featuresSectionOpen && (
              <div className="settings-section__body settings-section__body--scroll">
                <div className="feature-list">
                  {this.state.features.length === 0 && (
                    <p className="small feature-list__empty">No features yet.</p>
                  )}
                  {this.state.features.map((feature) => (
                    <div
                      key={feature.id}
                      className={`feature-list__item${this.state.selectedFeatureId === feature.id ? ' is-selected' : ''
                        }`}
                    >
                      {this.state.editingFeatureId === feature.id ? (
                        <input
                          autoFocus
                          className="feature-list__input"
                          onBlur={this.commitFeatureLabel}
                          onChange={this.handleFeatureLabelChange}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              this.commitFeatureLabel();
                            }

                            if (event.key === 'Escape') {
                              this.cancelFeatureLabelEdit();
                            }
                          }}
                          value={this.state.editingFeatureLabel}
                        />
                      ) : (
                        <button
                          className="feature-list__label feature-list__label-button"
                          onClick={() => this.startFeatureLabelEdit(feature.id)}
                          type="button"
                        >
                          {feature.label}
                        </button>
                      )}
                      <div className="feature-list__actions">
                        <button
                          aria-label={`Select ${feature.label}`}
                          className="feature-action feature-action--select"
                          disabled={this.state.selectedFeatureId === feature.id}
                          onClick={() => this.selectFeature(feature.id)}
                          title="Select"
                          type="button"
                        />
                        <button
                          aria-label={`Edit ${feature.label}`}
                          className="feature-action feature-action--edit"
                          disabled={this.state.activeDrawMode === 'direct_select' && this.state.selectedFeatureId === feature.id}
                          onClick={() => this.editFeature(feature.id)}
                          title="Edit"
                          type="button"
                        />
                        <button
                          aria-label={`Copy ${feature.label}`}
                          className="feature-action feature-action--copy"
                          onClick={() => this.copyFeature(feature.id)}
                          title="Copy"
                          type="button"
                        />
                        <button
                          aria-label={`Download ${feature.label}`}
                          className="feature-action feature-action--download"
                          onClick={() => this.downloadFeature(feature.id)}
                          title="Download"
                          type="button"
                        />
                        <button
                          aria-label={`Delete ${feature.label}`}
                          className="feature-action feature-action--delete"
                          onClick={() => this.deleteFeature(feature.id)}
                          title="Delete"
                          type="button"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="panel panel--right">
          <div className="settings-section">
            <button
              aria-expanded={this.state.imageSectionOpen}
              className={`section-toggle${this.state.imageSectionOpen ? ' is-open' : ''}`}
              onClick={() => this.toggleSidebarSection('imageSectionOpen')}
              type="button"
            >
              <span>
                <i className="fa-regular fa-image" aria-hidden="true"></i>
                Image
              </span>
              <i className="fa-solid fa-chevron-down" aria-hidden="true"></i>
            </button>
            {this.state.imageSectionOpen && (
              <div className="settings-section__body">
                <label>
                  <div className="slider-label">
                    Opacity
                    <div className="range-label">{this.renderRangeValue('imageOpacity', (value) => value.toFixed(2))}</div>
                  </div>
                  <input
                    type="range"
                    className="range"
                    name="imageOpacity"
                    min="0"
                    max="1"
                    step=".01"
                    style={this.getRangeInputStyle('imageOpacity')}
                    value={this.state.imageOpacity}
                    onChange={this.handleChange}
                    {...this.getRangeInputHandlers('imageOpacity')}
                  />
                </label>
                <label>
                  <div className="slider-label">
                    Width
                    <div className="range-label__controls">
                      <button
                        aria-label={this.state.isAspectRatioLocked ? 'Unlock width and height' : 'Link width and height'}
                        className={`range-label__toggle${this.state.isAspectRatioLocked ? ' is-active' : ''}`}
                        onClick={this.toggleAspectRatioLock}
                        title={this.state.isAspectRatioLocked ? 'Unlock width and height' : 'Link width and height'}
                        type="button"
                      >
                        <i className={`fa-solid ${this.state.isAspectRatioLocked ? 'fa-link' : 'fa-link-slash'}`} aria-hidden="true"></i>
                      </button>
                      <div className="range-label">{this.renderRangeValue('imageWidth', (value) => Math.round(value))}</div>
                    </div>
                  </div>
                  <input
                    type="range"
                    className="range"
                    name="imageWidth"
                    min="100"
                    max="2000"
                    step="1"
                    style={this.getRangeInputStyle('imageWidth')}
                    value={this.state.imageWidth}
                    onChange={this.handleChange}
                    {...this.getRangeInputHandlers('imageWidth')}
                  />
                </label>
                <label>
                  <div className="slider-label">
                    Height
                    <div className="range-label">{this.renderRangeValue('imageHeight', (value) => Math.round(value))}</div>
                  </div>
                  <input
                    type="range"
                    className="range"
                    name="imageHeight"
                    min="100"
                    max="2000"
                    step="1"
                    style={this.getRangeInputStyle('imageHeight')}
                    value={this.state.imageHeight}
                    onChange={this.handleChange}
                    {...this.getRangeInputHandlers('imageHeight')}
                  />
                </label>
                <label>
                  <div className="slider-label">
                    Rotation
                    <div className="range-label">{this.renderRangeValue('imageRotation', (value) => `${value.toFixed(0)}deg`)}</div>
                  </div>
                  <input
                    type="range"
                    className="range"
                    name="imageRotation"
                    min="-180"
                    max="180"
                    step="1"
                    style={this.getRangeInputStyle('imageRotation')}
                    value={this.state.imageRotation}
                    onChange={this.handleChange}
                    {...this.getRangeInputHandlers('imageRotation')}
                  />
                </label>
                <label>
                  <div className="slider-label">
                    Perspective X
                    <div className="range-label">{this.renderRangeValue('imagePerspectiveX', (value) => `${value.toFixed(0)}px`)}</div>
                  </div>
                  <input
                    type="range"
                    className="range"
                    name="imagePerspectiveX"
                    min="-400"
                    max="400"
                    step="1"
                    style={this.getRangeInputStyle('imagePerspectiveX')}
                    value={this.state.imagePerspectiveX}
                    onChange={this.handleChange}
                    {...this.getRangeInputHandlers('imagePerspectiveX')}
                  />
                </label>
                <label>
                  <div className="slider-label">
                    Perspective Y
                    <div className="range-label">{this.renderRangeValue('imagePerspectiveY', (value) => `${value.toFixed(0)}px`)}</div>
                  </div>
                  <input
                    type="range"
                    className="range"
                    name="imagePerspectiveY"
                    min="-400"
                    max="400"
                    step="1"
                    style={this.getRangeInputStyle('imagePerspectiveY')}
                    value={this.state.imagePerspectiveY}
                    onChange={this.handleChange}
                    {...this.getRangeInputHandlers('imagePerspectiveY')}
                  />
                </label>
                <label>
                  <div className="slider-label">
                    Perspective Z
                    <div className="range-label">{this.renderRangeValue('imagePerspectiveZ', (value) => `${value.toFixed(0)}px`)}</div>
                  </div>
                  <input
                    type="range"
                    className="range"
                    name="imagePerspectiveZ"
                    min="-400"
                    max="400"
                    step="1"
                    style={this.getRangeInputStyle('imagePerspectiveZ')}
                    value={this.state.imagePerspectiveZ}
                    onChange={this.handleChange}
                    {...this.getRangeInputHandlers('imagePerspectiveZ')}
                  />
                </label>
              </div>
            )}
          </div>

          <div className="settings-section">
            <button
              aria-expanded={this.state.mapSectionOpen}
              className={`section-toggle${this.state.mapSectionOpen ? ' is-open' : ''}`}
              onClick={() => this.toggleSidebarSection('mapSectionOpen')}
              type="button"
            >
              <span>
                <i className="fa-solid fa-map" aria-hidden="true"></i>
                Map
              </span>
              <i className="fa-solid fa-chevron-down" aria-hidden="true"></i>
            </button>
            {this.state.mapSectionOpen && (
              <div className="settings-section__body">
                <label className="coordinate-search">
                  <div className="slider-label">Coordinates</div>
                  <div className="split-input">
                    <input
                      className="text-input"
                      name="coordinateInput"
                      onChange={this.handleCoordinateInputChange}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          this.centerMapOnCoordinates();
                        }
                      }}
                      placeholder="32.08446, 35.91316"
                      type="text"
                      value={this.state.coordinateInput}
                    />
                    <button
                      aria-label="Center on coordinates"
                      className="split-input__button"
                      onClick={this.centerMapOnCoordinates}
                      title="Center on coordinates"
                      type="button"
                    >
                      <i className="fa-solid fa-location-crosshairs" aria-hidden="true"></i>
                    </button>
                  </div>
                </label>
                <div className="button-container button-container--mode">
                  {Object.entries(REGION_PRESETS).map(([regionKey, preset]) => (
                    <button
                      key={regionKey}
                      className={this.state.activeRegion === regionKey ? 'is-active' : ''}
                      onClick={() => this.changeRegion(regionKey)}
                      type="button"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <p className="header">Zoom</p>
                <div className="button-container button-container--zoom">
                  <button
                    aria-label="Zoom out"
                    className="zoom-button zoom-button--out"
                    onClick={this.finZoomOut}
                    title="Zoom out"
                    type="button"
                  >
                    <i className="fa-solid fa-magnifying-glass-minus" aria-hidden="true"></i>
                  </button>
                  <button
                    aria-label="Zoom in"
                    className="zoom-button zoom-button--in"
                    onClick={this.finZoomIn}
                    title="Zoom in"
                    type="button"
                  >
                    <i className="fa-solid fa-magnifying-glass-plus" aria-hidden="true"></i>
                  </button>
                </div>
                <label>
                  <div className="slider-label">
                    Opacity
                    <div className="range-label">{this.renderRangeValue('mapOpacity', (value) => value.toFixed(2))}</div>
                  </div>
                  <input
                    type="range"
                    className="range"
                    name="mapOpacity"
                    min="0"
                    max="1"
                    step=".01"
                    style={this.getRangeInputStyle('mapOpacity')}
                    value={this.state.mapOpacity}
                    onChange={this.handleChange}
                    {...this.getRangeInputHandlers('mapOpacity')}
                  />
                </label>
                <p className="header">Style</p>
                <div className="button-container button-container--style">
                  <button
                    className={this.state.activeStyleVariant === 'blank' ? 'is-active' : ''}
                    onClick={() => this.setMapStyle('blank')}
                    type="button"
                  >
                    Blank
                  </button>
                  <button
                    className={this.state.activeStyleVariant === 'default' ? 'is-active' : ''}
                    onClick={() => this.setMapStyle('default')}
                    type="button"
                  >
                    Base
                  </button>
                  <button
                    className={this.state.activeStyleVariant === 'satellite' ? 'is-active' : ''}
                    onClick={() => this.setMapStyle('satellite')}
                    type="button"
                  >
                    Sat
                  </button>
                </div>
                <p className="header">Map provider</p>
                <div className="button-container button-container--providers">
                  {providerOptions.map((option) => (
                    <button
                      key={option.value}
                      className={this.state.provider === option.value ? 'is-active' : ''}
                      disabled={option.disabled}
                      onClick={() => this.handleProviderChange(option.value)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {this.state.providerError && <p className="small error">{this.state.providerError}</p>}
              </div>
            )}
          </div>
          <a id="export" href="data:,">
            file
          </a>
        </div>
      </div>
    );
  }
}

const Home = () => <Map />;

export default Home;
