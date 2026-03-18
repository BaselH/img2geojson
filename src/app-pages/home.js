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
  jordan: {
    label: 'Jordan',
    lng: 36.35,
    lat: 31.25,
    zoom: 7
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
      imageHeight: 600,
      isAspectRatioLocked: true,
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
      isHelpOpen: false
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
    window.addEventListener('keydown', this.handleMapArrowKeys, true);
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
    window.removeEventListener('keydown', this.handleMapArrowKeys, true);
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

  getCurrentImageScreenCorners = () => {
    if (this.state.isImageLocked) {
      return this.getLockedImageScreenCorners();
    }

    const renderedCorners = this.getRenderedOverlayCorners();

    if (renderedCorners && renderedCorners.length === 4) {
      return renderedCorners;
    }

    if (this.state.imageQuad && this.state.imageQuad.length === 4) {
      return this.cloneScreenPoints(this.state.imageQuad);
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
    const corners = this.getCurrentImageScreenCorners();
    const transform = this.getProjectiveTransform(corners);

    return {
      left: '0px',
      top: '0px',
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

  updateLockedImageFromScreenPoints = (screenPoints, nextState) => {
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

    this.setState(nextState, this.syncLockedImageLayer);
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
      map.on('draw.update', this.syncFeaturesFromDraw);
      map.on('draw.delete', this.syncFeaturesFromDraw);
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
        this.syncFeaturesFromDraw
      );
    } else {
      this.syncFeaturesFromDraw();
    }
  };

  handleDrawSelectionChange = (event) => {
    const selectedFeature =
      event && event.features && event.features.length > 0 ? event.features[0] : null;

    this.setState({
      selectedFeatureId: selectedFeature && selectedFeature.id ? String(selectedFeature.id) : null
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
        label,
        feature
      };
    });

    const selectedIds =
      typeof this.Draw.getSelectedIds === 'function'
        ? this.Draw.getSelectedIds().map((id) => String(id))
        : [];

    this.setState({
      features,
      selectedFeatureId: selectedIds[0] || null
    });
  };

  setUnlockedImageQuad = (screenCorners, nextState = {}) => {
    this.setState({
      ...nextState,
      imageQuad: this.cloneScreenPoints(screenCorners),
      isImageLocked: false
    });
  };

  updateImageScreenCorners = (transformer, nextState = {}) => {
    const currentCorners = this.getCurrentImageScreenCorners();

    if (!currentCorners || currentCorners.length !== 4) {
      return;
    }

    const nextCorners = transformer(this.cloneScreenPoints(currentCorners));

    if (!nextCorners || nextCorners.length !== 4) {
      return;
    }

    if (this.state.isImageLocked) {
      this.updateLockedImageFromScreenPoints(nextCorners, nextState);
      return;
    }

    this.setUnlockedImageQuad(nextCorners, nextState);
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

    if (selectedFeature) {
      return {
        data: this.getNormalizedDrawData(turf.featureCollection([selectedFeature.feature])),
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
      });
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

    if (name === 'imageWidth') {
      const scale = this.state.imageWidth === 0 ? 1 : numericValue / this.state.imageWidth;
      const nextState = { imageWidth: numericValue };

      if (this.state.isAspectRatioLocked) {
        nextState.imageHeight = numericValue / this.state.imageAspectRatio;
      }

      this.updateImageScreenCorners(
        (corners) => this.scaleImageQuad(
          corners,
          scale,
          this.state.isAspectRatioLocked ? scale : 1
        ),
        nextState
      );
      return;
    }

    if (name === 'imageHeight') {
      const scale = this.state.imageHeight === 0 ? 1 : numericValue / this.state.imageHeight;
      const nextState = { imageHeight: numericValue };

      if (this.state.isAspectRatioLocked) {
        nextState.imageWidth = numericValue * this.state.imageAspectRatio;
      }

      this.updateImageScreenCorners(
        (corners) => this.scaleImageQuad(
          corners,
          this.state.isAspectRatioLocked ? scale : 1,
          scale
        ),
        nextState
      );
      return;
    }

    if (name === 'mapOpacity') {
      this.setState({
        [name]: numericValue
      });
      this.applyMapOpacity(numericValue);
      return;
    }

    if (name === 'imageOpacity') {
      this.setState({
        imageOpacity: numericValue
      }, this.updateLockedImageTransform);
      return;
    }

    if (name === 'imageRotation') {
      const deltaRotation = numericValue - this.state.imageRotation;
      this.updateImageScreenCorners(
        (corners) => this.rotateImageQuad(corners, deltaRotation),
        { imageRotation: numericValue }
      );
      return;
    }

    if (name === 'imagePerspectiveX') {
      const deltaPerspective = numericValue - this.state.imagePerspectiveX;
      this.updateImageScreenCorners(
        (corners) => this.adjustImagePerspective(corners, deltaPerspective, 0),
        { imagePerspectiveX: numericValue }
      );
      return;
    }

    if (name === 'imagePerspectiveY') {
      const deltaPerspective = numericValue - this.state.imagePerspectiveY;
      this.updateImageScreenCorners(
        (corners) => this.adjustImagePerspective(corners, 0, deltaPerspective),
        { imagePerspectiveY: numericValue }
      );
      return;
    }

    if (name === 'imagePerspectiveZ') {
      const deltaPerspective = numericValue - this.state.imagePerspectiveZ;
      this.updateImageScreenCorners(
        (corners) => this.adjustImagePerspectiveZ(corners, deltaPerspective),
        { imagePerspectiveZ: numericValue }
      );
      return;
    }

    this.setState({
      [name]: numericValue
    });
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

      return {
        isAspectRatioLocked: true,
        imageHeight: currentState.imageWidth / currentState.imageAspectRatio
      };
    }, () => {
      if (!this.state.isAspectRatioLocked) {
        return;
      }

      const targetHeight = this.state.imageWidth / this.state.imageAspectRatio;
      const currentHeight = this.state.imageHeight;
      const scale = currentHeight === 0 ? 1 : targetHeight / currentHeight;

      if (Math.abs(scale - 1) < 0.0001) {
        return;
      }

      this.updateImageScreenCorners(
        (corners) => this.scaleImageQuad(corners, scale, scale),
        { imageHeight: targetHeight }
      );
    });
  };

  resetImageProportions = () => {
    const currentCorners = this.getCurrentImageScreenCorners();
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
      this.state.imageRotation,
      0,
      0,
      0,
      this.state.imageWidth,
      nextHeight
    );

    if (this.state.isImageLocked) {
      this.updateLockedImageFromScreenPoints(nextCorners, {
        imageHeight: nextHeight,
        imagePerspectiveX: 0,
        imagePerspectiveY: 0,
        imagePerspectiveZ: 0,
        isAspectRatioLocked: true
      });
      return;
    }

    this.setUnlockedImageQuad(nextCorners, {
      imagePlacement: placement,
      imageHeight: nextHeight,
      imagePerspectiveX: 0,
      imagePerspectiveY: 0,
      imagePerspectiveZ: 0,
      isAspectRatioLocked: true
    });
  };

  lockImageToMap = () => {
    if (!this.map || !this.state.imageUrl) {
      return;
    }

    const screenCorners = this.getCurrentImageScreenCorners();
    const coordinates = this.mapScreenPointsToCoordinates(screenCorners);

    if (!screenCorners || screenCorners.length !== 4 || coordinates.length !== 4) {
      this.showActionFeedback('Could not lock the image from its current screen position', 'error');
      return;
    }

    this.lockedImageState = {
      coordinates,
      imageUrl: this.state.imageUrl
    };

    this.setState({
      isImageLocked: true
    }, this.syncLockedImageLayer);
  };

  unlockImageFromMap = () => {
    const currentScreenCorners = this.getLockedImageScreenCorners();

    this.removeLockedImageLayer();
    this.lockedImageState = null;

    this.setState({
      isImageLocked: false,
      imagePlacement: this.getCurrentImagePlacement(),
      imageQuad: this.cloneScreenPoints(currentScreenCorners)
    });
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

    if (!featureEntry) {
      return;
    }

    this.triggerGeoJSONDownload(
      this.getNormalizedDrawData(turf.featureCollection([featureEntry.feature])),
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

    if (!featureEntry) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        JSON.stringify(
          this.getNormalizedDrawData(turf.featureCollection([featureEntry.feature])),
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

  handleMapArrowKeys = (event) => {
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
      );
    }

    return (
      <button
        className="range-label__button"
        onDoubleClick={() => this.startRangeFieldEdit(fieldName)}
        type="button"
      >
        {formatter(this.state[fieldName])}
      </button>
    );
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
                <p>How to use</p>
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
                    <p>Select `Upload image / GeoJSON`, drag files onto the page, or paste GeoJSON from the clipboard.</p>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-image" aria-hidden="true"></i>
                    <p>Align the image with width, height, rotation, opacity, aspect lock, reset proportions, and perspective X/Y/Z.</p>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-lock" aria-hidden="true"></i>
                    <p>Lock the image when you want it attached to the map. Pan, zoom, rotate, and pitch will then move the image with the map.</p>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-draw-polygon" aria-hidden="true"></i>
                    <p>Trace polygons, lines, or markers. Export the whole collection or one selected feature as GeoJSON.</p>
                  </div>
                </div>

                <div className="help-section">
                  <div className="help-section__title">
                    <i className="fa-solid fa-computer-mouse" aria-hidden="true"></i>
                    <span>Mouse and keyboard</span>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-arrow-pointer" aria-hidden="true"></i>
                    <p>Left drag pans the map, even while a draw tool is active. Left click adds precise points or drops a marker.</p>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>
                    <p>Right drag freehands the active polygon or line tool. Polygon closes when you click the starting point again.</p>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-arrows-rotate" aria-hidden="true"></i>
                    <p>Middle drag rotates and pitches the map. Double middle click resets bearing and pitch.</p>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-keyboard" aria-hidden="true"></i>
                    <p>Arrow keys pan the map. Hold `Ctrl` for 1px nudges. `Ctrl/Cmd+C` copies GeoJSON and `Ctrl/Cmd+V` pastes GeoJSON when you are not typing in a field.</p>
                  </div>
                </div>

                <div className="help-section">
                  <div className="help-section__title">
                    <i className="fa-solid fa-pen-ruler" aria-hidden="true"></i>
                    <span>Drawing and features</span>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-vector-square" aria-hidden="true"></i>
                    <p>Click the active draw button again to leave draw mode. `Delete` removes the active sketch or selected feature.</p>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-list" aria-hidden="true"></i>
                    <p>The feature list lets you select, edit, rename, copy, download, or delete one feature at a time.</p>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-tag" aria-hidden="true"></i>
                    <p>Feature names are written to `label`, `name`, and `title` in exported GeoJSON for better compatibility with other tools.</p>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-file-import" aria-hidden="true"></i>
                    <p>Uploaded or pasted GeoJSON is appended to the current feature list. Re-importing the same feature creates a new copy.</p>
                  </div>
                </div>

                <div className="help-section">
                  <div className="help-section__title">
                    <i className="fa-solid fa-map" aria-hidden="true"></i>
                    <span>Map and image settings</span>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
                    <p>Use the fine zoom buttons for tiny zoom adjustments. Double click any slider value to type an exact number.</p>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-location-crosshairs" aria-hidden="true"></i>
                    <p>Switch between Australia and Jordan or centre the map from a latitude, longitude pair such as `32.0844629063387, 35.913167314100065`.</p>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-layer-group" aria-hidden="true"></i>
                    <p>Style switches between blank, base, and satellite. Map opacity affects only the basemap, so your traced features stay visible.</p>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-globe" aria-hidden="true"></i>
                    <p>MapLibre is the default provider and uses OpenStreetMap raster tiles. Mapbox becomes available when `REACT_APP_MAPBOX_KEY` is set.</p>
                  </div>
                  <div className="help-item">
                    <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                    <p>Images can extend beyond the viewport, but extremely far off-screen lock attempts may be rejected for safety instead of guessed.</p>
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
          <div className="panel__tools">
            <p className="header">Drawing</p>
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
            <p className="small">Left click adds points or markers. Right drag freehands lines and polygons.</p>
            <button onClick={this.openFilePicker} type="button">
              <i className="fa-solid fa-upload" aria-hidden="true" style={{ marginRight: 8 }}></i>
              Upload image / GeoJSON
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
          <p className="header">Features</p>
          <div className="feature-list">
            {this.state.features.length === 0 && (
              <p className="small feature-list__empty">No features yet.</p>
            )}
            {this.state.features.map((feature) => (
              <div
                key={feature.id}
                className={`feature-list__item${
                  this.state.selectedFeatureId === feature.id ? ' is-selected' : ''
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
        <div className="panel panel--right">
          <div className="button-container">
            {this.state.isImageLocked ? (
              <button className="unlock" style={{ width: '100%' }} onClick={this.unlockImageFromMap}>
                <i className="fa-solid fa-lock" aria-hidden="true" style={{ marginRight: 8 }}></i> Unlock from map
              </button>
            ) : (
              <button className="lock" style={{ width: '100%' }} onClick={this.lockImageToMap}>
                <i className="fa-solid fa-lock-open" aria-hidden="true" style={{ marginRight: 8 }}></i> Lock image to map
              </button>
            )}
          </div>
          <p className="small">Lock ties the image to the map while you pan and zoom.</p>
          <p className="header">Zoom</p>
          <p className="small">Fine tune map zoom.</p>
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
          <p className="header">Opacity</p>
          <label>
            <div className="slider-label">
              Map
              <div className="range-label">{this.renderRangeValue('mapOpacity', (value) => value.toFixed(2))}</div>
            </div>
            <input
              type="range"
              className="range"
              name="mapOpacity"
              min="0"
              max="1"
              step=".01"
              value={this.state.mapOpacity}
              onChange={this.handleChange}
            />
          </label>
          <label>
            <div className="slider-label">
              Image
              <div className="range-label">{this.renderRangeValue('imageOpacity', (value) => value.toFixed(2))}</div>
            </div>
            <input
              type="range"
              className="range"
              name="imageOpacity"
              min="0"
              max="1"
              step=".01"
              value={this.state.imageOpacity}
              onChange={this.handleChange}
            />
          </label>
          <div className="header header--with-actions">
            <p className="header">Image size</p>
            <div className="header-actions">
              <button
                aria-label={this.state.isAspectRatioLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                className={`icon-button${this.state.isAspectRatioLocked ? ' is-active' : ''}`}
                onClick={this.toggleAspectRatioLock}
                title={this.state.isAspectRatioLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                type="button"
              >
                <i className={`fa-solid ${this.state.isAspectRatioLocked ? 'fa-link' : 'fa-link-slash'}`} aria-hidden="true"></i>
              </button>
              <button
                aria-label="Reset image proportions"
                className="icon-button"
                onClick={this.resetImageProportions}
                title="Reset image proportions"
                type="button"
              >
                <i className="fa-solid fa-arrow-rotate-left" aria-hidden="true"></i>
              </button>
            </div>
          </div>
          <label>
            <div className="slider-label">
              Width
              <div className="range-label">{this.renderRangeValue('imageWidth', (value) => Math.round(value))}</div>
            </div>
            <input
              type="range"
              className="range"
              name="imageWidth"
              min="100"
              max="2000"
              step="1"
              value={this.state.imageWidth}
              onChange={this.handleChange}
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
              value={this.state.imageHeight}
              onChange={this.handleChange}
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
              value={this.state.imageRotation}
              onChange={this.handleChange}
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
              value={this.state.imagePerspectiveX}
              onChange={this.handleChange}
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
              value={this.state.imagePerspectiveY}
              onChange={this.handleChange}
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
              value={this.state.imagePerspectiveZ}
              onChange={this.handleChange}
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
          <p className="header">Region</p>
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
          <label className="coordinate-search">
            <div className="slider-label">
              Coordinates
            </div>
            <input
              className="text-input"
              name="coordinateInput"
              onChange={this.handleCoordinateInputChange}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  this.centerMapOnCoordinates();
                }
              }}
              placeholder="32.0844629063387, 35.913167314100065"
              type="text"
              value={this.state.coordinateInput}
            />
          </label>
          <button onClick={this.centerMapOnCoordinates} type="button">
            Center on coordinates
          </button>
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
