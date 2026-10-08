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

// SERVICE WORKER — yalnızca kurulabilirlik için (public/sw.js hiçbir şey
// önbelleğe almıyor). Kayıt sayfa yüklendikten SONRA yapılıyor: ilk açılışta
// ana iş parçacığıyla yarışmasın.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Kayıt başarısızsa uygulama normal çalışmaya devam ediyor; tek kayıp
      // tarayıcının kurulum isteminin çıkmaması.
    });
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
