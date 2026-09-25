FITFORGE — paquete instalable y con backend opcional

1) Modo rápido sin cuentas
- Abre la app con un servidor local, no con file://.
- Ejemplo: python -m http.server 8000
- Abre http://localhost:8000
- GPS/cámara/notificaciones requieren contexto seguro; localhost es aceptado por los navegadores para desarrollo.

2) Modo completo con asistente y escaneo de comida por foto
- Instala Node.js.
- En esta carpeta ejecuta: npm install
- Copia .env.example a .env y coloca OPENAI_API_KEY.
- Ejecuta: npm start
- Abre http://localhost:3000
- El backend mantiene la API key fuera del navegador.

3) Cuentas y sincronización en la nube
- Crea un proyecto Supabase.
- Ejecuta supabase_schema.sql en SQL Editor.
- Edita config.js con supabaseUrl y supabaseAnonKey.
- Para avatares, crea el bucket Storage "avatars" y aplica políticas de acceso por usuario.

4) Funciones reales incluidas
- Registro/inicio de sesión con Supabase cuando está configurado.
- Sincronización del estado principal del usuario con Supabase.
- Foto de perfil.
- Escaneo facial real para detección, encuadre, orientación y calidad de captura; NO diagnostica salud ni mide grasa/peso desde la cara.
- Escaneo de código de barras y consulta de producto con Open Food Facts.
- Escaneo de comida por foto mediante endpoint de visión opcional del backend; entrega estimaciones, no valores exactos.
- Carrera con GPS, distancia, tiempo, ritmo, mapa, historial y cámara trasera opcional.
- Gimnasios cercanos con geolocalización y OpenStreetMap/Overpass.
- Calendario, consejos, recetas, nutrición, agua, objetivos y bienestar.
- Asistente con IA y búsqueda web cuando el backend está configurado.
- Notificaciones web con permiso del usuario.
- PWA instalable en navegadores compatibles.

5) Importante
- No uses la app para diagnosticar lesiones o enfermedades.
- GPS, cámara y notificaciones requieren permisos del usuario y, normalmente, HTTPS/localhost.
- Los datos de gimnasios dependen de la cobertura de OpenStreetMap.
- Los datos de Open Food Facts pueden estar incompletos.
- Una foto de comida no puede determinar con precisión los gramos o calorías.
