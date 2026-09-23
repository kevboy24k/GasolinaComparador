# Observatorio de Combustibles

Sitio estático para comparar el precio promedio nacional de gasolina en Guatemala con el WTI. Puede publicarse directamente desde GitHub Pages; no requiere PHP, MySQL ni un servidor de aplicaciones.

## Publicar en GitHub Pages

1. Cree un repositorio en GitHub y suba el contenido de este proyecto.
2. En **Settings → Pages**, seleccione **Deploy from a branch**, elija la rama principal y la carpeta **/(root)**.
3. GitHub publicará `index.html`. Si el repositorio se llama `GasolinaPetro`, la URL será `https://USUARIO.github.io/GasolinaPetro/`.

## Datos históricos

La página carga `data/series_combustibles.json`, que contiene la serie de gasolina Superior y Regular, junto con el WTI. Es un archivo público y versionado: el sitio no consulta PHP, base de datos ni APIs desde el navegador.

El flujo `.github/workflows/actualizar-historico.yml` se ejecuta diariamente a las 08:17 UTC, descarga las fuentes, regenera el JSON y confirma un cambio solo si hay datos nuevos. También puede ejecutarse manualmente desde la pestaña **Actions** de GitHub.

Para actualizarlo localmente, se necesita Node.js 20 o posterior:

```sh
node scripts/actualizar_series.mjs
```

## Fuentes
- Petróleo: serie diaria WTI RWTC de EIA.
