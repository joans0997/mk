# MerkoMAX NIMAR

Tienda estática compatible con GitHub Pages. Pedidos por WhatsApp. No procesa pagos ni confirma stock.

## Ejecutar y comprobar

```sh
python -m http.server 8000
node --test tests/catalog.test.cjs
node --check assets/js/store.js
node --check assets/js/admin.js
```

Abrir http://localhost:8000. Administración: `/admin.html`.

## Estructura

- `index.html`: tienda y checkout existente.
- `assets/css/store.css`: estilos existentes extraídos.
- `assets/css/catalog.css`: mejoras del catálogo y accesibilidad.
- `assets/js/store.js`: navegación, búsqueda, carrito y pedido.
- `assets/js/catalog.js`: fuente de datos, validación y salida HTML segura.
- `assets/js/config.js`: configuración pública.
- `admin.html`, `assets/js/admin.js`: panel autenticado para crear/editar productos y subir fotos.
- `supabase/migrations`: esquema y permisos PostgreSQL.

## Estado de integración

La tienda sigue usando SheetDB hasta completar y verificar la migración. El esquema SQL y el panel están preparados, pero **no equivalen a una base de datos desplegada**. Requiere conectar un proyecto Supabase. No se han importado ni inventado productos.

## Activación de Supabase

1. Crear o seleccionar el proyecto correcto en la cuenta del propietario.
2. Aplicar `supabase/migrations/202610260001_catalog.sql` una sola vez mediante migraciones.
3. Crear mediante Storage API o dashboard el bucket público `product-images`, con límite de 5 MB y tipos permitidos `image/jpeg`, `image/png`, `image/webp`. Las fotos son públicas; las escrituras requieren administrador.
4. Crear/invitar la cuenta administradora en Authentication y asignar **desde servidor/administración** `app_metadata.role = catalog_admin`. No se debe usar `user_metadata`. Ningún visitante se puede otorgar este rol.
5. Añadir URL del proyecto y clave **publishable** (o anon pública) a `assets/js/config.js`. Nunca publicar contraseñas, secret keys ni service_role. El panel mantiene el token de sesión solo en memoria; tras recargar se vuelve a iniciar sesión.
6. Importar el catálogo real de SheetDB (ver script abajo), manteniendo IDs para compatibilidad con carritos. Mapear `isOffer` → `is_offer`, `isBestSeller` → `is_best_seller`, `image` → `image_url`. Ajustar la secuencia después de importar IDs explícitos:
   `select setval(pg_get_serial_sequence('public.products','id'), coalesce((select max(id) from public.products),1), exists(select 1 from public.products));`
7. Verificar lectura pública de activos, acceso denegado a escrituras anónimas y de usuarios normales, y CRUD/subidas del administrador. Probar foto inválida, sesión vencida y error de red.
8. Cambiar `provider` a `supabase` solo después de comparar conteos y precios y probar tienda/panel contra la base real.

El catálogo admite aproximadamente 100 productos sin paginación (límite de lectura 1000). Cada producto tiene una foto principal; el archivo se guarda en Storage y la URL/ruta en PostgreSQL. El reemplazo de fotos conserva el archivo anterior para evitar romper productos importados que compartan imagen; revisar objetos sin referencias antes de eliminarlos mediante Storage API. Las fotos pendientes muestran un marcador neutral.

## Exportar catálogo existente

`node scripts/export-catalog.cjs > catalog-import.json`

Revisar los datos antes de importar. El script no escribe a Supabase ni cambia la fuente activa. Para cargar el JSON utilizar una herramienta administrativa autenticada o transformar a CSV para Table Editor. No subir claves secretas al repositorio.

## Alcance y verificaciones pendientes

Se conserva el checkout original y sus dependencias Tailwind/Lucide por CDN. La separación de archivos es una primera refactorización; todavía existen manejadores inline y estilos heredados. Un siguiente paso puede reemplazar el CDN de Tailwind por un build versionado. Validar horario comercial (actualmente 07–20 en America/Bogota), disponibilidad y entrega con el propietario.

La base de datos necesita pruebas reales de políticas/auth/storage después de conectar Supabase. Las pruebas unitarias no sustituyen esta validación. No cambiar la fuente de producción antes de completarla.
