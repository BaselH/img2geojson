const MAP_PROVIDERS = {
  mapbox: 'mapbox',
  maplibre: 'maplibre'
};

const MAPBOX_DEFAULT_STYLE = 'mapbox://styles/caseymmiler/cl45xkrmg000714loppfn16v6';
const MAPBOX_BLANK_STYLE = 'mapbox://styles/caseymmiler/cl466jhd2000515o4sqpaul44';
const MAPBOX_SATELLITE_STYLE = 'mapbox://styles/mapbox/satellite-v9';

const MAPLIBRE_DEFAULT_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors'
    }
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm'
    }
  ]
};

const MAPLIBRE_SATELLITE_STYLE = {
  version: 8,
  sources: {
    satellite: {
      type: 'raster',
      tiles: [
        'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      attribution: 'Tiles © Esri'
    }
  },
  layers: [
    {
      id: 'satellite',
      type: 'raster',
      source: 'satellite'
    }
  ]
};

const MAPLIBRE_BLANK_STYLE = {
  version: 8,
  sources: {},
  layers: [
    {
      id: 'blank-background',
      type: 'background',
      paint: {
        'background-color': '#ffffff'
      }
    }
  ]
};

const STORAGE_KEY = 'img2geojson.mapProvider';
const DEFAULT_PROVIDER = normalizeProvider(process.env.REACT_APP_MAP_PROVIDER);

function normalizeProvider(provider) {
  return provider === MAP_PROVIDERS.mapbox ? MAP_PROVIDERS.mapbox : MAP_PROVIDERS.maplibre;
}

function cloneStyle(style) {
  if (typeof style === 'string') {
    return style;
  }

  return JSON.parse(JSON.stringify(style));
}

function unwrapModule(moduleValue) {
  return moduleValue && moduleValue.default ? moduleValue.default : moduleValue;
}

export function getInitialMapProvider(hasMapboxToken) {
  const storedProvider =
    typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;

  return resolveProvider(storedProvider || DEFAULT_PROVIDER, hasMapboxToken);
}

export function persistMapProvider(provider) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, provider);
}

export function resolveProvider(provider, hasMapboxToken) {
  const normalized = normalizeProvider(provider);

  if (normalized === MAP_PROVIDERS.mapbox && !hasMapboxToken) {
    return MAP_PROVIDERS.maplibre;
  }

  return normalized;
}

export function getMapProviderOptions(hasMapboxToken) {
  return [
    {
      value: MAP_PROVIDERS.maplibre,
      label: 'MapLibre',
      disabled: false
    },
    {
      value: MAP_PROVIDERS.mapbox,
      label: 'Mapbox',
      disabled: !hasMapboxToken
    }
  ];
}

export function getMapProviderNotice(provider, hasMapboxToken) {
  if (provider === MAP_PROVIDERS.maplibre) {
    return 'MapLibre uses OpenStreetMap raster tiles. Search stays disabled in this mode.';
  }

  if (!hasMapboxToken) {
    return 'Mapbox is unavailable until REACT_APP_MAPBOX_KEY is set.';
  }

  return 'Mapbox mode restores the existing Mapbox style and search control.';
}

export function getMapCanvasClass(provider) {
  return provider === MAP_PROVIDERS.mapbox ? '.mapboxgl-canvas' : '.maplibregl-canvas';
}

export function getProviderStyle(provider, variant) {
  if (provider === MAP_PROVIDERS.mapbox) {
    if (variant === 'blank') {
      return MAPBOX_BLANK_STYLE;
    }

    if (variant === 'satellite') {
      return MAPBOX_SATELLITE_STYLE;
    }

    return MAPBOX_DEFAULT_STYLE;
  }

  if (variant === 'blank') {
    return cloneStyle(MAPLIBRE_BLANK_STYLE);
  }

  if (variant === 'satellite') {
    return cloneStyle(MAPLIBRE_SATELLITE_STYLE);
  }

  return cloneStyle(MAPLIBRE_DEFAULT_STYLE);
}

export async function loadMapProvider(provider, mapboxToken) {
  const normalizedProvider = normalizeProvider(provider);
  const moduleNames =
    normalizedProvider === MAP_PROVIDERS.mapbox
      ? [
          import('mapbox-gl'),
          import('@mapbox/mapbox-gl-geocoder'),
          import('@mapbox/mapbox-gl-draw')
        ]
      : [
          import('maplibre-gl'),
          Promise.resolve(null),
          import('@mapbox/mapbox-gl-draw')
        ];

  const [mapLibModule, geocoderModule, drawModule] = await Promise.all(moduleNames);
  const mapLib = unwrapModule(mapLibModule);

  if (normalizedProvider === MAP_PROVIDERS.mapbox) {
    mapLib.accessToken = mapboxToken;
  }

  return {
    provider: normalizedProvider,
    mapLib,
    GeocoderClass: geocoderModule ? unwrapModule(geocoderModule) : null,
    DrawClass: unwrapModule(drawModule)
  };
}

export { MAP_PROVIDERS };
