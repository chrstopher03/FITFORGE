FITFORGE V3 — mejoras solicitadas

Incluye:
- Mascota de racha con niveles, XP, etapas y retos diarios.
- Retos que desbloquean experiencia y notificaciones.
- Pantalla de Correr rediseñada con estética oscura, ruta luminosa, HUD, mapa y cámara opcional, inspirada en la referencia proporcionada.
- Escáner de alimentos rápido: BarcodeDetector + Open Food Facts para productos con código; reconocimiento visual local con TensorFlow.js/MobileNet para categorías de alimentos conocidas.
- Escaneo facial acelerado: carga del modelo al abrir la sección y ciclo de detección más frecuente. Solo evalúa captura/rasgos geométricos visibles, no peso, grasa, edad, identidad ni enfermedades.
- Bienvenida después de crear cuenta con el nombre real, mascota, novedades y valoración por estrellas.
- Notificaciones y recordatorios variados, incluidos avisos de retos, videos, hidratación y actividad.
- PWA y service worker.

Importante:
- Cámara, GPS, PWA y notificaciones requieren HTTPS o localhost.
- Los recordatorios cada 15 minutos mediante setInterval funcionan mientras el navegador mantiene activa la página; para notificaciones garantizadas con la app cerrada se necesita Web Push y un servidor programado.
- El reconocimiento visual de comida es aproximado y depende de la calidad de la foto y de las categorías que reconoce el modelo. El código de barras es el método más preciso y rápido para productos empaquetados.
