import React from 'react';
import ReactDOM from 'react-dom';
import 'mapbox-gl/dist/mapbox-gl.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import './index.scss';
import './sidebar.scss';
import App from './App';
 
ReactDOM.render(
<React.StrictMode>
  <App />
</React.StrictMode>,
document.getElementById('root')
);
