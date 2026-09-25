FITFORGE — PUBLICACIÓN ONLINE
=============================

Esta versión ya está preparada para desplegarse como una aplicación web online.
El backend escucha en 0.0.0.0 y usa PORT del proveedor.
Las cuentas se guardan en data/users.json. En Render se monta un disco persistente
para evitar perderlas al reiniciar el servicio.

OPCIÓN RECOMENDADA: RENDER
--------------------------
1. Crea una cuenta en Render.
2. Sube esta carpeta a un repositorio de GitHub (o usa el repositorio que tengas).
3. En Render selecciona New > Blueprint y conecta el repositorio.
4. Render detectará render.yaml.
5. El servicio ejecutará:
   npm install
   npm start
6. Cuando termine, Render te dará una URL https://....onrender.com
7. Abre esa URL. NO abras index.html directamente.

PRUEBA DEL SERVIDOR
-------------------
Abre:
https://TU-DOMINIO/api/health

Debe devolver JSON parecido a:
{"ok":true,"service":"FITFORGE",...}

CUENTAS
-------
Crear cuenta e iniciar sesión funcionan contra /api/auth/register y /api/auth/login.
La sesión usa una cookie firmada. El secreto se crea automáticamente por Render.

IMPORTANTE
----------
- El plan gratuito de algunos proveedores puede suspender servicios cuando no hay tráfico.
- Para cámara/GPS/notificaciones usa HTTPS; la URL de Render ya usa HTTPS.
- data/users.json sirve para un despliegue pequeño. Para una aplicación grande conviene
  migrar usuarios a PostgreSQL/Supabase.
- Nunca pongas claves privadas de OpenAI en index.html.
