FITFORGE — versión rápida y con cuentas reales

1. Instala Node.js 18 o superior.
2. Abre una terminal dentro de esta carpeta.
3. Ejecuta: npm start
4. Abre: http://localhost:3000

Las cuentas se guardan en data/users.json y las contraseñas se almacenan con scrypt (no en texto plano).
La sesión se mantiene mediante cookie HttpOnly.

Para publicar en internet usa HTTPS y un almacenamiento/BD de producción. El servidor incluido es funcional para pruebas y uso pequeño; para producción con muchos usuarios conviene PostgreSQL/Supabase.

Cámara/GPS/notificaciones: en teléfono publicado usa HTTPS. localhost funciona para pruebas en PC.
El escaneo facial es un análisis de detección, encuadre, orientación y calidad de captura; no diagnostica salud ni calcula grasa corporal desde la cara.
