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
      imageRotation: 0,
      imageUrl: '',
      imageAspectRatio: 1,
      imagePlacement: null,
      isImageLocked: false,
      activeDrawMode: 'simple_select',
      features: [],
      selectedFeatureId: null,
      editingFeatureId: null,
      editingFeatureLabel: '',
      activeStyleVariant: 'default',
      provider,
      providerNotice: getMapProviderNotice(provider, HAS_MAPBOX_TOKEN),
      providerError: '',
      isHelpOpen: false
    };

    this.mapContainer = React.createRef();
    this.imageOverlayRef = React.createRef();
    this.fileInputRef = React.createRef();
    this.activeLoadId = 0;
    this.lockedImageState = null;
    this.imageObjectUrl = null;
    this.baseLayerOpacityCache = {};
    this.middleRotateState = null;
    this.lastMiddleMouseDown = null;
    this.leftPanState = null;
    this.suppressNextDrawClick = false;
  }

  componentDidMount() {
    this.isMountedFlag = true;
    window.addEventListener('resize', this.handleViewportResize);
    window.addEventListener('dragover', this.handleWindowDragOver);
    window.addEventListener('drop', this.handleWindowDrop);
    if (this.mapContainer.current) {
      this.mapContainer.current.addEventListener('contextmenu', this.handleContextMenu);
      this.mapContainer.current.addEventListener('mousedown', this.handleMapMouseDown);
      this.mapContainer.current.addEventListener('click', this.handleMapClickCapture, true);
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
    if (this.mapContainer.current) {
      this.mapContainer.current.removeEventListener('contextmenu', this.handleContextMenu);
      this.mapContainer.current.removeEventListener('mousedown', this.handleMapMouseDown);
      this.mapContainer.current.removeEventListener('click', this.handleMapClickCapture, true);
    }
    this.detachMiddleRotateListeners();
    this.detachLeftPanListeners();
    this.cleanupMap();
    this.revokeImageObjectUrl();
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

  getCenteredImagePlacement = (width, aspectRatio) => {
    const containerRect = this.getMapContainerRect();

    if (!containerRect) {
      return {
        x: 0,
        y: 0,
        width,
        height: width / aspectRatio
      };
    }

    return {
      x: containerRect.width / 2,
      y: containerRect.height / 2,
      width,
      height: width / aspectRatio
    };
  };

  getCurrentImagePlacement = () => {
    if (this.state.isImageLocked && this.lockedImageState && this.map) {
      const projectedCenter = this.map.project(this.lockedImageState.anchor);
      const scale = Math.pow(2, this.map.getZoom() - this.lockedImageState.zoom);

      return {
        x: projectedCenter.x,
        y: projectedCenter.y,
        width: this.lockedImageState.width * scale,
        height: this.lockedImageState.height * scale
      };
    }

    return this.state.imagePlacement;
  };

  getOverlayStyle = () => {
    const placement =
      this.getCurrentImagePlacement() ||
      this.getCenteredImagePlacement(this.state.imageWidth, this.state.imageAspectRatio);

    return {
      left: `${placement.x}px`,
      top: `${placement.y}px`,
      width: `${placement.width}px`,
      height: `${placement.height}px`,
      opacity: this.state.imageOpacity,
      transform: `translate(-50%, -50%) rotate(${this.state.imageRotation + this.getMapBearingOffset()}deg) skewX(${this.getMapSkewOffset()}deg) scaleY(${this.getMapScaleYOffset()})`
    };
  };

  getMapBearingOffset = () => {
    if (!this.state.isImageLocked || !this.map) {
      return 0;
    }

    return this.map.getBearing() * -1;
  };

  getMapSkewOffset = () => {
    if (!this.state.isImageLocked || !this.map) {
      return 0;
    }

    return this.map.getPitch() * 0.18;
  };

  getMapScaleYOffset = () => {
    if (!this.state.isImageLocked || !this.map) {
      return 1;
    }

    return Math.max(0.72, 1 - this.map.getPitch() * 0.004);
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

    const emptyGroups = this.mapContainer.current.querySelectorAll('.mapboxgl-ctrl-group:empty');
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
        center: [this.state.lng, this.state.lat],
        zoom: this.state.zoom
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
        this.updateLockedImageTransform();
        this.removeEmptyControlShells();
      });
      map.on('move', this.handleMapInteraction);
      map.on('zoom', this.handleMapInteraction);
      map.on('resize', this.handleMapInteraction);
      map.on('pitch', this.handleMapInteraction);
      map.on('rotate', this.handleMapInteraction);
      map.on('draw.modechange', this.handleDrawModeChange);
      map.on('draw.create', this.handleDrawCreate);
      map.on('draw.update', this.syncFeaturesFromDraw);
      map.on('draw.delete', this.syncFeaturesFromDraw);
      map.on('draw.selectionchange', this.handleDrawSelectionChange);

      this.map = map;
      this.mapLib = mapLib;
      this.Draw = draw;

      this.setState({
        activeDrawMode: 'simple_select',
        features: [],
        selectedFeatureId: null,
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
    if (!this.state.isImageLocked || !this.imageOverlayRef.current) {
      return;
    }

    const placement = this.getCurrentImagePlacement();

    if (!placement) {
      return;
    }

    const overlay = this.imageOverlayRef.current;
    overlay.style.left = `${placement.x}px`;
    overlay.style.top = `${placement.y}px`;
    overlay.style.width = `${placement.width}px`;
    overlay.style.height = `${placement.height}px`;
    overlay.style.opacity = `${this.state.imageOpacity}`;
    overlay.style.transform = `translate(-50%, -50%) rotate(${this.state.imageRotation + this.getMapBearingOffset()}deg) skewX(${this.getMapSkewOffset()}deg) scaleY(${this.getMapScaleYOffset()})`;
  };

  handleMapInteraction = () => {
    if (this.state.isImageLocked) {
      this.updateLockedImageTransform();
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
        feature.properties && feature.properties.label
          ? feature.properties.label
          : `${geometryType} ${index + 1}`;

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

  handleViewportResize = () => {
    if (!this.state.imageUrl) {
      return;
    }

    if (this.state.isImageLocked) {
      this.updateLockedImageTransform();
      return;
    }

    this.setState({
      imagePlacement: this.getCenteredImagePlacement(
        this.state.imageWidth,
        this.state.imageAspectRatio
      )
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

  handleWindowDrop = (event) => {
    event.preventDefault();

    const files = event.dataTransfer ? Array.from(event.dataTransfer.files || []) : [];
    const imageFile = files.find((file) => file.type && file.type.indexOf('image/') === 0);

    if (!imageFile) {
      return;
    }

    if (!this.confirmImageOverwrite()) {
      return;
    }

    this.handleImageSelected(imageFile);
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
    this.updateLockedImageTransform();
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
    this.updateLockedImageTransform();
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

    if (!this.confirmImageOverwrite()) {
      return;
    }

    this.handleImageSelected(file);
  };

  handleImageSelected = (file) => {
    const nextImageUrl = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      if (!this.isMountedFlag) {
        URL.revokeObjectURL(nextImageUrl);
        return;
      }

      this.revokeImageObjectUrl();
      this.imageObjectUrl = nextImageUrl;
      this.lockedImageState = null;

      this.setState({
        imageUrl: nextImageUrl,
        imageAspectRatio: image.naturalWidth / image.naturalHeight || 1,
        imagePlacement: this.getCenteredImagePlacement(
          this.state.imageWidth,
          image.naturalWidth / image.naturalHeight || 1
        ),
        isImageLocked: false
      });
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
      name === 'imageRotation'
        ? Number(value)
        : value;

    if (name === 'imageWidth') {
      if (this.state.isImageLocked && this.lockedImageState) {
        this.lockedImageState = {
          ...this.lockedImageState,
          width: numericValue,
          height: numericValue / this.state.imageAspectRatio
        };

        this.setState({
          imageWidth: numericValue
        }, this.updateLockedImageTransform);

        return;
      }

      this.setState({
        imageWidth: numericValue,
        imagePlacement: this.getCurrentImagePlacement()
          ? {
              ...this.getCurrentImagePlacement(),
              width: numericValue,
              height: numericValue / this.state.imageAspectRatio
            }
          : this.getCenteredImagePlacement(numericValue, this.state.imageAspectRatio)
      });

      return;
    }

    this.setState({
      [name]: numericValue
    });

    if (name === 'mapOpacity') {
      this.applyMapOpacity(numericValue);
    }
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

  lockImageToMap = () => {
    if (!this.map || !this.state.imageUrl) {
      return;
    }

    const placement =
      this.getCurrentImagePlacement() ||
      this.getCenteredImagePlacement(this.state.imageWidth, this.state.imageAspectRatio);

    this.lockedImageState = {
      anchor: this.map.unproject([placement.x, placement.y]),
      zoom: this.map.getZoom(),
      width: placement.width,
      height: placement.height
    };

    this.setState({
      isImageLocked: true
    }, this.updateLockedImageTransform);
  };

  unlockImageFromMap = () => {
    const placement = this.getCurrentImagePlacement();
    this.lockedImageState = null;

    this.setState({
      isImageLocked: false,
      imagePlacement: placement
    });
  };

  setMapStyle = (variant) => {
    if (!this.map) {
      return;
    }

    this.map.setStyle(getProviderStyle(this.state.provider, variant));
    this.map.once('styledata', () => {
      this.cacheBaseLayerOpacity();
      this.applyMapOpacity(this.state.mapOpacity);
      this.updateLockedImageTransform();
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
  };

  downloadFeature = (featureId) => {
    const featureEntry = this.state.features.find((feature) => feature.id === featureId);

    if (!featureEntry) {
      return;
    }

    this.triggerGeoJSONDownload(
      turf.featureCollection([featureEntry.feature]),
      `${featureEntry.label.replace(/\s+/g, '-').toLowerCase()}.geojson`
    );
  };

  downloadGeoJSON = () => {
    const data = this.Draw ? this.Draw.getAll() : turf.featureCollection([]);

    if (data.features.length === 0) {
      alert('Nothing to export');
      return;
    }

    this.triggerGeoJSONDownload(data, 'data.geojson');
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

  render() {
    const providerOptions = getMapProviderOptions(HAS_MAPBOX_TOKEN);
    const isDrawing =
      this.state.activeDrawMode === 'draw_polygon' ||
      this.state.activeDrawMode === 'draw_line_string';

    return (
      <div>
        <input
          accept="image/*"
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
          i
        </button>
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
                <p className="small"><strong>Getting started</strong></p>
                <p className="small">Select a file or drag and drop an image anywhere on the page.</p>
                <p className="small">Use Image width, Rotation, and Opacity to align it.</p>
                <p className="small">Lock image to bind it to the map while you pan, zoom, rotate, and pitch.</p>
                <p className="small"><strong>Mouse actions</strong></p>
                <p className="small">Left drag pans the map, including while a draw tool is active.</p>
                <p className="small">Right drag freehands the active polygon or line tool.</p>
                <p className="small">Left click adds precise points while drawing.</p>
                <p className="small">Middle drag rotates and pitches the map.</p>
                <p className="small">Double middle click resets map rotation and pitch.</p>
                <p className="small">Wheel zoom changes map zoom. Fine zoom buttons adjust it in small steps.</p>
                <p className="small"><strong>Drawing tools</strong></p>
                <p className="small">Polygon closes when you click back on the first point. Click the active tool again to exit drawing mode.</p>
                <p className="small">Line drawing can be freehand or point-by-point. Press Enter or switch tools when you are done.</p>
                <p className="small">Delete removes the selected feature or active sketch.</p>
                <p className="small"><strong>Feature list</strong></p>
                <p className="small">Click a feature name to rename it.</p>
                <p className="small">Use the row icons to select, edit, download, or delete a single feature.</p>
                <p className="small">Download all exports the full collection as GeoJSON.</p>
                <p className="small"><strong>Map settings</strong></p>
                <p className="small">Style switches between blank, base, and satellite layers.</p>
                <p className="small">Region jumps between Australia and Jordan.</p>
                <p className="small">MapLibre uses OpenStreetMap raster tiles. Search stays disabled in this mode.</p>
                <p className="small">Set REACT_APP_MAPBOX_KEY to re-enable Mapbox.</p>
              </div>
            </div>
          </div>
        )}
        {this.state.imageUrl && (
          <div
            ref={this.imageOverlayRef}
            className={`image-overlay${this.state.isImageLocked ? ' image-overlay--locked' : ''}`}
            style={this.getOverlayStyle()}
          >
            <img src={this.state.imageUrl} alt="" draggable="false" />
          </div>
        )}
        <div className="panel panel--left">
          <div className="panel__tools">
            <p>Drawing</p>
            <p className="small">Left drag pans. Right drag freehands. Middle drag rotates and pitches.</p>
            <div className="button-container button-container--draw">
              <button
                aria-label="Draw polygon"
                className={`mapbox-gl-draw_polygon${
                  this.state.activeDrawMode === 'draw_polygon' ? ' is-active' : ''
                }`}
                onClick={() => this.startDrawMode('draw_polygon')}
                title="Draw polygon"
                type="button"
              />
              <button
                aria-label="Draw line"
                className={`mapbox-gl-draw_line${
                  this.state.activeDrawMode === 'draw_line_string' ? ' is-active' : ''
                }`}
                onClick={() => this.startDrawMode('draw_line_string')}
                title="Draw line"
                type="button"
              />
              <button
                aria-label="Delete selected drawing"
                className="mapbox-gl-draw_trash"
                onClick={this.clearSelectedDrawing}
                title="Delete selected drawing"
                type="button"
              />
            </div>
            <button className="geojson" onClick={this.downloadGeoJSON} type="button">
              Download all
            </button>
          </div>
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
          <p>Image</p>
          <button onClick={this.openFilePicker} type="button">
            Select file
          </button>
          <p className="header">Image lock</p>
          <p className="small">Lock ties the image to the map while you pan and zoom.</p>
          <button
            className={`lock-toggle ${this.state.isImageLocked ? 'unlock is-active' : 'lock'}`}
            onClick={this.toggleImageLock}
            type="button"
          >
            {this.state.isImageLocked ? 'Unlock image' : 'Lock image'}
          </button>
          <p className="header">Zoom</p>
          <p className="small">Use wheel zoom, or fine tune here.</p>
          <div className="button-container button-container--zoom">
            <button
              aria-label="Zoom out"
              className="zoom-button zoom-button--out"
              onClick={this.finZoomOut}
              title="Zoom out"
              type="button"
            />
            <button
              aria-label="Zoom in"
              className="zoom-button zoom-button--in"
              onClick={this.finZoomIn}
              title="Zoom in"
              type="button"
            />
          </div>
          <p className="header">Opacity</p>
          <label>
            <div className="slider-label">
              Map
              <div className="range-label">{this.state.mapOpacity.toFixed(2)}</div>
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
              <div className="range-label">{this.state.imageOpacity.toFixed(2)}</div>
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
          <p className="header">Image size</p>
          <label>
            <div className="slider-label">
              Width
              <div className="range-label">{Math.round(this.state.imageWidth)}</div>
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
              Rotation
              <div className="range-label">{this.state.imageRotation.toFixed(0)}deg</div>
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
          <p className="small panel-credit">
            By Basel, forked from the original by <a href="https://twitter.com/caseymmiller">@caseymmiller</a>.
          </p>
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
