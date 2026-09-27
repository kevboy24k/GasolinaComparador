# Observatorio de Combustibles

Sitio estático para comparar el precio promedio nacional de gasolina en Guatemala con el WTI. Puede publicarse directamente desde GitHub Pages; no requiere PHP, MySQL ni un servidor de aplicaciones.

## Publicar en GitHub Pages

1. Cree un repositorio en GitHub y suba el contenido de este proyecto.
2. En **Settings → Pages**, seleccione **Deploy from a branch**, elija la rama principal y la carpeta **/(root)**.
3. GitHub publicará `index.html`. Si el repositorio se llama `GasolinaPetro`, la URL será `https://USUARIO.github.io/GasolinaPetro/`.

## Datos históricos

La página carga `data/series_combustibles.json`, que contiene las series de gasolina Superior y Regular, WTI y tipo de cambio, y `data/estructura_precios.json`, con el último desglose oficial validado disponible. Son archivos públicos y versionados: el navegador no depende de APIs externas para dibujar las gráficas.

El flujo `.github/workflows/actualizar-historico.yml` se ejecuta diariamente a las 22:17 UTC, después de la ventana habitual de publicación del MEM. Descarga las fuentes de forma independiente, regenera el JSON y confirma un cambio si gasolina, WTI o tipo de cambio tienen datos nuevos. Si una fuente falla temporalmente, conserva su última copia válida y permite que las demás continúen actualizándose. También puede ejecutarse manualmente desde la pestaña **Actions** de GitHub.

El recolector de gasolina es propio del proyecto (`scripts/fuentes/mem.mjs`) y consulta directamente la página y API oficial del MEM. No descarga datos de repositorios de terceros. Detecta tanto el encabezado actual `Precios Monitoreados DD/MM/AAAA` como el formato anterior `Monitoreo Actual`, agrega las nuevas observaciones al histórico versionado y conserva la última copia válida si la fuente falla.

El JSON publica `actualizado_gasolina`, `actualizado_wti` y `actualizado_tipo_cambio` por separado. Para evitar los límites de la llave de demostración de EIA, se recomienda crear el secreto de Actions `EIA_API_KEY`; el script mantiene `DEMO_KEY` como respaldo.

## Acceso automatizado al MEM

El MEM puede responder con un desafío de Cloudflare a los servidores de GitHub Actions. El recolector intenta primero el acceso directo. Si el MEM bloquea al runner, despliegue el collector restringido incluido en `cloudflare/` dentro de una cuenta propia y registre su URL como secreto `MEM_PROXY_URL`:

```sh
npx wrangler deploy --config cloudflare/wrangler.toml
```

El proxy incluido solo admite HTTPS hacia dominios del MEM. Si Cloudflare también desafía la salida del Worker, utilice un runner autoalojado o un collector propio con navegador y caché; el workflow seguirá actualizando WTI y tipo de cambio sin borrar el último precio válido de gasolina.

Para actualizarlo localmente, se necesita Node.js 20 o posterior:

```sh
node scripts/actualizar_series.mjs
```

## Fuentes

- Gasolina: monitoreo oficial de autoservicio del Ministerio de Energía y Minas de Guatemala.
- Estructura de referencia: publicación oficial del MEM; la vigencia se muestra junto a la gráfica y nunca se arrastra silenciosamente a otras fechas.
- Petróleo: serie diaria WTI RWTC de EIA.
- Tipo de cambio: Web Service del Banco de Guatemala.
