import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './theme-surfaces.css';
import './workspace.css';
import './fit-workbench.css';
import './home.css';
import './spice.css';
import './menus.css';
import './fullscreen.css';
import './interface.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
