FITFORGE 2.0 — APP COMPLETA

1. Requisitos
- Node.js 20 o superior recomendado.
- Navegador moderno (Chrome/Edge/Firefox/Safari).
- Para cámara, GPS, notificaciones e instalación PWA: usa http://localhost:3000 o HTTPS.

2. Iniciar
Windows: doble clic en start.bat
Terminal: npm install && npm start
Luego abre: http://localhost:3000

3. Cuentas
FITFORGE incluye registro e inicio de sesión real en el servidor. Los usuarios y sus datos se guardan en fitforge-data.json. Para producción con muchos usuarios se recomienda migrar esa capa a PostgreSQL/Supabase.

4. Asistente IA
Copia .env.example como .env y coloca OPENAI_API_KEY. Sin clave, el asistente conserva un modo local de respaldo.

5. Escáner facial
Usa MediaPipe Face Mesh desde CDN. La cámara detecta el rostro en vivo y calcula un resultado real de calidad de captura, encuadre, orientación y estabilidad geométrica. No diagnostica salud ni mide grasa corporal/peso con la cara.

6. Correr
GPS real con distancia, tiempo, ritmo, mapa, historial y cámara trasera opcional. La precisión depende del teléfono y permisos.

7. Gimnasios
- Usa tu ubicación para consultar datos en vivo de OpenStreetMap/Overpass.
- Incluye botón directo para Somoto, Madriz usando el centro de Somoto si no quieres compartir ubicación.
- La cobertura depende de los datos publicados; no existe una fuente que garantice literalmente todos los gimnasios del mundo.

8. Comida
- Código de barras: consulta Open Food Facts.
- Foto: usa el endpoint de IA y entrega una estimación, nunca una medición exacta.

9. PWA
La aplicación incluye manifest y service worker. En Chrome/Edge usa el botón Instalar del navegador o el banner de FITFORGE.
