import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const URL_HISTORICO_GASOLINA = 'https://raw.githubusercontent.com/peterargueta/Precios_combustibles_GT/main/precios_historicos.csv';
const URL_WTI = 'https://api.eia.gov/v2/petroleum/pri/spt/data/?api_key=DEMO_KEY&frequency=daily&data[0]=value&facets[series][]=RWTC&start=2013-01-01&sort[0][column]=period&sort[0][direction]=asc';
const DIRECTORIO_PROYECTO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ARCHIVO_SERIES = resolve(DIRECTORIO_PROYECTO, 'data/series_combustibles.json');
const FECHA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;

async function descargar(url) {
    const respuesta = await fetch(url, {
        headers: { 'User-Agent': 'GasolinaPetro-GitHubActions/1.0' }
    });
    if (!respuesta.ok) {
        throw new Error(`No se pudo descargar la fuente (${respuesta.status}).`);
    }
    return respuesta.text();
}

async function obtenerGasolinas() {
    const idpPorCombustible = { Superior: 4.70, Regular: 4.60 };
    const series = { Superior: [], Regular: [] };
    const lineas = (await descargar(URL_HISTORICO_GASOLINA)).trim().split(/\r\n|\r|\n/);
    if (lineas.length < 2) {
        throw new Error('El histórico de gasolina tiene un formato inválido.');
    }

    for (const linea of lineas.slice(1)) {
        const [fecha = '', combustible = '', precioTexto = ''] = linea.split(',');
        const precio = Number(precioTexto);
        if (!(combustible in idpPorCombustible) || !FECHA_VALIDA.test(fecha) || !Number.isFinite(precio) || precio <= 0) {
            continue;
        }

        const idp = idpPorCombustible[combustible];
        const iva = (precio - idp) * 12 / 112;
        series[combustible].push({
            fecha,
            precio: redondear(precio),
            sin_impuestos: redondear(precio - idp - iva),
            idp,
            iva: redondear(iva)
        });
    }

    for (const serie of Object.values(series)) {
        serie.sort((a, b) => a.fecha.localeCompare(b.fecha));
    }
    return series;
}

async function obtenerPetroleo() {
    const respuesta = JSON.parse(await descargar(URL_WTI));
    const datos = respuesta.response?.data;
    if (!Array.isArray(datos)) {
        throw new Error('La respuesta de WTI no contiene datos válidos.');
    }

    return datos
        .map(({ period: fecha = '', value }) => ({ fecha, precio: Number(value) }))
        .filter(({ fecha, precio }) => FECHA_VALIDA.test(fecha) && Number.isFinite(precio) && precio > 0)
        .map(({ fecha, precio }) => ({ fecha, precio: redondear(precio) }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function redondear(valor) {
    return Number(valor.toFixed(4));
}

try {
    const [series, petroleo] = await Promise.all([obtenerGasolinas(), obtenerPetroleo()]);
    if (!series.Superior.length || !series.Regular.length || !petroleo.length) {
        throw new Error('Las fuentes no devolvieron suficientes datos.');
    }

    const respuesta = {
        series,
        petroleo,
        actualizado: series.Superior.at(-1).fecha,
        fuentes: ['MEM / Precios_combustibles_GT', 'EIA / WTI RWTC']
    };
    await mkdir(dirname(ARCHIVO_SERIES), { recursive: true });
    await writeFile(ARCHIVO_SERIES, `${JSON.stringify(respuesta)}\n`, 'utf8');
    console.log(`Histórico actualizado: ${respuesta.actualizado}`);
} catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
}
