// Interactive Audio Tour Guide
// Entry point - initializes map and services

import './style.css';
import { initMap, addTileLayer, onViewportChange, getViewport } from './components/Map.js';
import { debounce } from './utils/debounce.js';

// Initialize map
const map = initMap('map');
addTileLayer(map);

// Log viewport changes (placeholder for attraction loading)
const handleViewportChange = debounce((viewport) => {
  console.log('Viewport changed:', viewport);
}, 500);

onViewportChange(handleViewportChange);

console.log('Audio Tour Guide initialized');
