// script.js
// Uses MapLibre public demo style (no API key required)
const STYLE_URL = "https://demotiles.maplibre.org/style.json"; // public MapLibre demo style

let map;
let currentStyle;

const statusEl = () => document.getElementById('status');

async function initMap() {
  map = new maplibregl.Map({
    container: 'map',
    style: STYLE_URL,
    center: [0, 20],
    zoom: 2
  });

  map.on('load', () => {
    currentStyle = map.getStyle();
    statusEl().textContent = 'Status: map loaded';
  });
}

function readPickers() {
  return {
    water: document.getElementById('waterPicker').value,
    land: document.getElementById('landPicker').value,
    roads: document.getElementById('roadsPicker').value,
    buildings: document.getElementById('buildingsPicker').value,
    labels: document.getElementById('labelsPicker').value
  };
}

// Heuristic: find layers by keywords in layer id or source-layer
function findLayersByKeyword(keywords) {
  if (!map || !map.style) return [];
  const layers = map.getStyle().layers || [];
  return layers.filter(l => {
    const id = (l.id || "").toLowerCase();
    const srcLayer = (l['source-layer'] || "").toLowerCase();
    return keywords.some(k => id.includes(k) || srcLayer.includes(k));
  });
}

// Apply color to appropriate paint property depending on layer type
function applyColorToLayer(layer, color) {
  try {
    const type = layer.type;
    const id = layer.id;
    if (type === 'background') {
      map.setPaintProperty(id, 'background-color', color);
    } else if (type === 'fill') {
      map.setPaintProperty(id, 'fill-color', color);
    } else if (type === 'line') {
      map.setPaintProperty(id, 'line-color', color);
    } else if (type === 'symbol') {
      // text-color for symbol layers (labels)
      // Some styles use 'text-color' or 'text-halo-color' in paint
      if (map.getPaintProperty(id, 'text-color') !== undefined) {
        map.setPaintProperty(id, 'text-color', color);
      } else if (map.getPaintProperty(id, 'icon-color') !== undefined) {
        map.setPaintProperty(id, 'icon-color', color);
      }
      // set text-halo-color for contrast if present
      if (map.getPaintProperty(id, 'text-halo-color') !== undefined) {
        map.setPaintProperty(id, 'text-halo-color', '#ffffff33');
      }
    } else {
      // fallback attempt
      if (map.getPaintProperty(id, 'fill-color') !== undefined) {
        map.setPaintProperty(id, 'fill-color', color);
      }
      if (map.getPaintProperty(id, 'line-color') !== undefined) {
        map.setPaintProperty(id, 'line-color', color);
      }
    }
  } catch (e) {
    console.warn('applyColorToLayer failed for', layer.id, e);
  }
}

function applyStyleObject(style) {
  // style: { water, land, roads, buildings, labels, name? }
  if (!map || !map.getStyle) return;
  statusEl().textContent = `Status: applying style ${style.name || ''}`;

  // map layers to keywords
  const targets = {
    water: ['water', 'ocean', 'lake', 'river'],
    land: ['land', 'background', 'landcover', 'grass', 'park'],
    roads: ['road', 'highway', 'street', 'motorway'],
    buildings: ['building', 'structure'],
    labels: ['label', 'place', 'poi', 'admin']
  };

  Object.keys(targets).forEach(key => {
    const color = style[key];
    if (!color) return;
    const kws = targets[key];
    const matched = findLayersByKeyword(kws);
    if (matched.length === 0) {
      console.warn('No layers matched for', key, kws);
    }
    matched.forEach(layer => applyColorToLayer(layer, color));
  });

  // update pickers to reflect applied style
  const pickers = ['water','land','roads','buildings','labels'];
  pickers.forEach(k => {
    const el = document.getElementById(k + 'Picker');
    if (el && style[k]) el.value = style[k];
  });

  statusEl().textContent = `Status: style applied`;
}

// Download current style JSON (map.getStyle())
function downloadCurrentStyle() {
  if (!map) return;
  const styleJson = map.getStyle();
  const blob = new Blob([JSON.stringify(styleJson, null, 2)], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `maplibre-style.json`;
  a.click();
}

// Wire UI buttons
function wireUI() {
  document.getElementById('applyBtn').addEventListener('click', () => {
    const style = readPickers();
    style.name = 'Manual override';
    applyStyleObject(style);
  });

  document.getElementById('downloadBtn').addEventListener('click', downloadCurrentStyle);

  document.getElementById('aiBtn').addEventListener('click', async () => {
    const prompt = document.getElementById('prompt').value.trim();
    if (!prompt) { alert('Enter a prompt'); return; }
    statusEl().textContent = 'Status: calling AI...';
    try {
      const overrides = readPickers(); // we send pickers as helpful hints
      const res = await fetch('/.netlify/functions/generate-style', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ prompt, overrides })
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || res.statusText);
      }
      const payload = await res.json();
      const style = payload.style || payload; // support different response shapes
      applyStyleObject(style);
    } catch (err) {
      console.error(err);
      statusEl().textContent = 'Status: AI error (check console)';
      alert('AI error: see console for details');
    }
  });
}

// start
initMap();
wireUI();
