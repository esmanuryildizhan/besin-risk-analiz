/* Service worker — YALNIZCA kurulabilirlik için.
 *
 * NİYE VAR: Chrome, "uygulamayı yükle" istemini (beforeinstallprompt) ancak
 * sitede bir service worker ve fetch dinleyicisi varsa gösteriyor. Bu dosya
 * olmadan uygulama yalnızca tarayıcı menüsünden elle kurulabiliyordu.
 *
 * NİYE HİÇBİR ŞEY ÖNBELLEĞE ALMIYOR: bu bir SAĞLIK uygulaması. Önbellekten
 * eski bir tahlil sonucu ya da eski bir risk değerlendirmesi göstermek,
 * hiçbir şey göstermemekten daha kötü. Önbellek yoksa bayatlama da yok.
 *
 * fetch dinleyicisi respondWith ÇAĞIRMIYOR: istek tarayıcının normal yoluna
 * düşüyor, yani ağ davranışı hiç değişmiyor. Dinleyicinin tek işlevi
 * kurulabilirlik şartını karşılamak.
 *
 * skipWaiting + clients.claim: yeni sürüm hemen devralıyor. Olmasaydı eski
 * service worker sekme tamamen kapanana kadar yaşar ve güncelleme
 * gecikirdi.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* kasıtlı olarak boş */ });
