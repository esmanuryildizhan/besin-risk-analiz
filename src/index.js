import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { uygula, sistemiIzle } from './tema';

// Tema zaten public/index.html icindeki betikle uygulandi (FOUC olmasin diye).
// Burada bir kez daha uygulaniyor ki o betik bir sekilde calismadiysa da
// dogru tema gecerli olsun; ayrica isletim sistemi temasi degisirse
// "sistem" secili kullanicilarin arayuzu kendiliginden takip etsin.
uygula();
sistemiIzle();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
