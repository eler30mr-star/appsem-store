# FASE 2 — Métricas seguras (tienda pública)

**Fecha:** 14/10/2026. **Estado:** backend implementado y conectado por bandera de activación; **NO ACTIVO EN PRODUCCIÓN** hasta configurar Vercel y desplegar las reglas coordinadamente.

Comparte Firebase `webs-8b1bf` con `eler30mr-star/appsem-store-admin`. El fichero de reglas vigente fue facilitado por el propietario y se conserva en el repositorio Admin. No publicar unilateralmente ninguno de los archivos `firestore.rules` antiguos.

## Qué está implementado

- Endpoint Vercel `/api/interaction`: GET para estado del visitante y POST para `like`, `rating` y `download`.
- Vercel valida el token con Cloudflare Turnstile **Siteverify**: hostname y action exactos. Token obligatorio y de un solo uso.
- Los datos se escriben desde el servidor con Firebase Admin SDK. Nunca se entrega una credencial del servidor al navegador.
- Firestore transaction para comprobar app publicada, comprobar evento único, limitar operaciones por IP/ventana de 15 minutos, crear evento y actualizar contador juntos. Las escrituras directas desde navegador se bloquearán **únicamente al publicar** las nuevas reglas de Fase 2.
- IDs de visitante e IP se convierten en HMAC-SHA-256 con secreto del servidor; no se guardan IPs en claro. **Un ID de navegador puede borrarse o falsificarse**: esto no equivale a identidad inmutable ni elimina por completo fraude distribuido. Turnstile + cuota reducen abuso, no lo imposibilitan.
- Likes/ratings antiguos registrados con ID de localStorage se reconocen para evitar duplicación tras el cambio.
- Destino de descarga HTTPS debe coincidir exactamente con la URL configurada por el administrador.
- El cliente usa el backend solo si `VITE_METRICS_BACKEND=server`. **Por defecto se conserva la ruta antigua de Firestore** y no se interrumpen las interacciones públicas antes del lanzamiento coordinado.
- Ningún secreto está versionado en el repositorio.

## Variables de Vercel, únicamente cuando se decida activar

Configurar en el **proyecto Vercel de la tienda pública**, Settings -> Environment Variables:

| Variable | Ámbito | Valor |
|---|---|---|
| `METRICS_BACKEND_ENABLED` | Servidor | `true` |
| `PUBLIC_SITE_ORIGIN` | Servidor | `https://appsem-store.vercel.app` (ajustar si la URL canónica difiere) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | **Secreto de servidor** | JSON de cuenta de servicio de Firebase `webs-8b1bf`, solo Vercel Server (nunca `VITE_`) |
| `METRICS_HMAC_SECRET` | **Secreto de servidor** | Cadena aleatoria de al menos 32 caracteres, estable entre despliegues |
| `TURNSTILE_SECRET_KEY` | **Secreto de servidor** | Secreto Cloudflare Turnstile Siteverify |
| `VITE_TURNSTILE_SITE_KEY` | Build público | Sitekey pública Cloudflare Turnstile para el dominio de la tienda |
| `VITE_METRICS_BACKEND` | Build público | `server` **solo al activar conjuntamente backend + reglas** |

Usar claves restringidas y de mínimo privilegio. No insertar el JSON de la cuenta de servicio en GitHub, navegador, documentos públicos o chat. El SDK Admin necesita permiso para leer/escribir `apps` y subcolecciones y mantener `metricsLimits`; preferir identidad de servicio con permisos ajustados. Vercel/Cloudflare tienen cuotas y términos propios; no presuponer infraestructura gratuita ilimitada.

## Orden seguro de activación

1. Confirmar que el archivo de respaldo cifrado real de Firestore se puede **descifrar y recuperar** en un emulador aislado. El mero hecho de existir en GitHub no demuestra recuperación.
2. Probar un entorno separado mediante Firestore Emulator y credenciales *de prueba*, no contra los datos reales. Ejecutar `npm run test:security` (unidad) y `npm run lint`; usar la suite de reglas de Admin para los permisos.
3. Crear Turnstile con hostname **exacto** de la tienda y configurar en Vercel los secretos de servidor. **Nunca** publicar un frontend en modo `server` mientras el backend no esté respondiendo.
4. Probar en preview controlada GET/POST con un catálogo ficticio; revisar que URLs, likes, rating y clics funcionan y no se duplican. Las credenciales de servidor siempre deben referirse a un entorno de prueba en preview.
5. Planificar ventana de publicación **coordinada** para cambiar cliente a `server` y publicar la candidata de reglas en Firebase Console. El fichero candidato vive en `appsem-store-admin/docs/fase-02/firestore.hardened.rules`; su despliegue anticipado bloquearía las acciones actuales.
6. Comprobar errores de permisos, eventos y contadores reales tras el cambio, con un camino de reversión documentado. Si la verificación anti-bot falla, el servidor **rechaza la escritura**, sin caer silenciosamente al cliente inseguro.
7. Decidir retención de `metricsLimits` y política de limpieza de eventos, considerando cuota/costo de Firestore. Los documentos de cuota contienen `expiresAt` para limpieza/TTL programado; **TTL no está configurado automáticamente**.

## Límites conocidos

- El sistema NO prueba que una descarga sea una instalación real: cuenta clics.
- Las identidades anónimas reiniciables, proxies y retos anti-bot superados por granjas no son infalibles; el riesgo residual necesita monitoreo.
- Rating promedio histórico puede estar redondeado; este backend preserva compatibilidad y mantiene suma/cantidad en nuevas interacciones. Conciliación completa corresponde a Fase 3.
- Exigir Turnstile añade un paso al visitante. El widget se muestra solo cuando se activa la ruta nueva.
- Servicio Admin SDK y página pública requieren configuración real; CI trabaja con datos ficticios y **no confirma** despliegue productivo.
- El endpoint GET consulta varios documentos para comprobar el estado del visitante; se deben aplicar límites de tráfico/WAF en Vercel en producción para proteger cuotas y facturación.

## Pruebas

Workflow `Fase 2 - API y seguridad de métricas` ejecuta `node --test tests/*.test.mjs`, ESLint y compilación Vite aislada del prerender remoto. Los tests de reglas y acceso Admin se ejecutan por separado en la suite `appsem-store-admin` con Firebase Emulator. NO se conectan a Firebase real.

**No marcar Fase 2 como completada ni afirmar que se bloquean actualmente los incrementos directos públicos** hasta activar backend y publicar reglas compatibles de forma coordinada.


## Endurecimiento adicional — 14/10/2026

- API: POST exige `Origin` exacto, JSON y un `Content-Length` válido dentro del límite, antes de verificar Turnstile o escribir en Firestore. Estos encabezados no reemplazan Turnstile ni la limitación de cuota.
- Se agregó una ruta **solo para pruebas en Emulator** al módulo del SDK Admin. Requiere simultáneamente `METRICS_EMULATOR_TEST=true`, `FIRESTORE_EMULATOR_HOST` en loopback puerto 8080, `GCLOUD_PROJECT=demo-*` y ausencia de entorno Vercel; jamás permite apuntar al proyecto real.
- Validación de variables de compilación: JSON sintácticamente válido, `project_id=webs-8b1bf`, tipo y estructura de cuenta de servicio correctos, HTTPS. **El chequeo es estructural:** no verifica que la clave sea real, tenga permisos o que el backend de Vercel esté desplegado.
- Pruebas de API HTTP completa y del SDK Admin en Firebase Emulator se administran desde `appsem-store-admin` (CI integrada). Ningún dato real es consultado.
