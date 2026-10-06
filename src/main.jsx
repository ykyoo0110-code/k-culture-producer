import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './react-overrides.css';
import './admin.css';
import './integrated-v8.css';
import ConnectWall from './components/ConnectWall';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'wall'
      ? <main style={{ padding: 24, maxWidth: 1280, margin: 'auto' }}><ConnectWall language="ko" sessionId={null} nickname="PREVIEW" /></main>
      : <App />}
  </React.StrictMode>,
);
