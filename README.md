# MerkoMAX NIMAR

Tienda estática compatible con GitHub Pages, con catálogo en Supabase y pedidos por WhatsApp. No procesa pagos ni reserva inventario.

## Estado actual

- Proyecto Supabase: `merkomax` (`zdfvasdecacaixfarqmw`), organización `joans0997's Org`, región `us-east-1`.
- Se importaron los 100 productos de SheetDB manteniendo IDs, nombres, categorías, precios y enlaces de imágenes. Suma de precios al importar: COP 1.134.700. Hay 12 URLs de imagen distintas; varias fotos son genéricas y deben revisarse con el propietario.
- Tabla `public.products` creada con RLS y permisos explícitos. Lectura pública solo de activos. Escritura restringida a `app_metadata.role = catalog_admin`.
- Bucket público `product-images` creado: JPG, PNG y WebP, máximo 5 MB. Escritura restringida al administrador. Las imágenes de productos están destinadas a ser públicas.
- `assets/js/config.js` usa Supabase y contiene únicamente la clave publishable pública. No publicar claves secretas, service_role, contraseñas ni tokens de sesión.
- La cuenta administradora designada por el propietario está creada en Supabase Auth con el rol catalog_admin, pendiente de aceptar su enlace privado y establecer contraseña. No existe una contraseña predeterminada ni se guardan credenciales en este repositorio.
- Los cambios de la web se preparan en la propuesta de GitHub; la existencia del proyecto Supabase no implica que `main` o GitHub Pages ya se hayan actualizado.

## Ejecutar y comprobar

```sh
python -m http.server 8000
npm ci
npm test
node --check assets/js/store.js
node --check assets/js/admin.js
```

Abrir http://localhost:8000. Panel: `/admin.html`.

## Estructura

- `index.html`: tienda y checkout.
- `assets/css/store.css`: estilos heredados extraídos.
- `assets/css/catalog.css`: mejoras de catálogo, móvil y accesibilidad.
- `assets/js/store.js`: navegación, búsqueda, carrito y pedido.
- `assets/js/catalog.js`: acceso a datos, validación y escape HTML.
- `assets/js/config.js`: configuración pública.
- `admin.html`, `assets/js/admin.js`: editor autenticado y subida de imágenes.
- `supabase/migrations`: historial aplicado en el proyecto remoto. Versiones alineadas con el servidor.
- `scripts/export-catalog.cjs`: exportación de la fuente anterior, sin modificaciones remotas.

## Cuenta administradora

La cuenta se aprovisionó mediante la API administrativa de Supabase. El enlace privado se entrega al propietario en la conversación, nunca se guarda en GitHub. Abrir ese enlace muestra el formulario para establecer una contraseña de al menos 12 caracteres. La credencial se elimina del historial de la URL al abrir la página y solo se usa al enviar el formulario. Después se cierra la sesión de activación y se inicia normalmente con correo y contraseña.

El enlace es personal, de un solo uso y tiene vencimiento. Si vence, el propietario debe solicitar un enlace nuevo por el canal administrativo. No hay registro público ni autoasignación de permisos. El acceso depende de app_metadata controlado por el servidor.

La función temporal `catalog-owner-setup` fue reemplazada inmediatamente por una respuesta 410 sin privilegios y con verificación JWT activada. El código conservado en el repositorio es únicamente esa versión deshabilitada.

El panel mantiene la sesión solo en memoria: al recargar pide iniciar sesión nuevamente. Para cargar una foto: abrir el producto, elegir archivo y guardar. Se conserva la imagen anterior si no se selecciona otra. Una foto reemplazada se conserva en Storage hasta revisar que ningún producto la use.

## Datos y fotos

Cada producto tiene ID, nombre, categoría, precio COP, una foto principal (URL y ruta), banderas de oferta/destacado, visibilidad y fechas. Los archivos nuevos se guardan en Storage y las referencias en PostgreSQL. Las fotos importadas siguen apuntando al proveedor original; no se afirma que esos archivos ya se hayan copiado a Storage.

El catálogo está preparado para unos 100 productos (lectura máxima 1000). Si crece más, implementar paginación. No hay control de stock. La disponibilidad y el importe final se confirman por WhatsApp.

## Verificación de base de datos

- Comparación REST de los 100 registros con la exportación: todos los campos importados coinciden.
- Escritura de productos y subida de fotos sin sesión: rechazadas.
- Pruebas transaccionales con roles: lectura pública excluye ocultos; usuario común no puede escribir; `user_metadata` no otorga privilegios; administrador puede editar ocultos. Filas de prueba revertidas.
- Asesor de seguridad: sin hallazgos. Se corrigieron avisos de rendimiento en políticas. El índice de categoría puede figurar sin uso en un catálogo recién creado; se conserva para crecimiento.
- Chromium: catálogo real con 100 productos, carrito y ordenación; capturas revisadas en computador y móvil de 390 px, sin errores JavaScript ni desbordamiento horizontal.
- Activación comprobada con API simulada: contraseña repetida, credencial inválida/vencida, actualización correcta y reintento tras error de red sin consumir el enlace dos veces.
- Pendiente del propietario: aceptar su enlace, iniciar sesión con la contraseña elegida y comprobar la primera subida de una foto real.

Se conserva el checkout y Tailwind/Lucide por CDN. La separación de archivos es una primera refactorización; aún existen manejadores inline y estilos heredados. Confirmar con el propietario el horario comercial (07–20, America/Bogota), las condiciones de entrega y las fotos.
