import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { obtenerTipoCambio } from './fuentes/banguat.mjs';
import { obtenerGasolinasMem } from './fuentes/mem.mjs';

const EIA_API_KEY = process.env.EIA_API_KEY?.trim() || 'DEMO_KEY';
const URL_WTI = `https://api.eia.gov/v2/petroleum/pri/spt/data/?api_key=${encodeURIComponent(EIA_API_KEY)}&frequency=daily&data[0]=value&facets[series][]=RWTC&start=2013-01-01&sort[0][column]=period&sort[0][direction]=asc&length=5000`;
const DIRECTORIO_PROYECTO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ARCHIVO_SERIES = resolve(DIRECTORIO_PROYECTO, 'data/series_combustibles.json');
const FECHA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;

async function descargar(url) {
    const respuesta = await fetch(url, {
        headers: { 'User-Agent': 'GasolinaPetro-GitHubActions/1.0' },
        signal: AbortSignal.timeout(60_000)
    });
    if (!respuesta.ok) {
        throw new Error(`No se pudo descargar la fuente (${respuesta.status}).`);
    }
    return respuesta.text();
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

async function obtenerDatosExistentes() {
    try {
        return JSON.parse(await readFile(ARCHIVO_SERIES, 'utf8'));
    } catch (error) {
        if (error.code === 'ENOENT') {
            return null;
        }
        throw new Error(`No se pudo leer el histórico existente: ${error.message}`);
    }
}

function ultimaFecha(serie) {
    return Array.isArray(serie) && serie.length ? serie.at(-1).fecha : null;
}

function elegirSerie(nombre, resultado, nuevaSerie, serieExistente) {
    if (resultado.status === 'rejected') {
        if (!Array.isArray(serieExistente) || !serieExistente.length) {
            throw new Error(`${nombre} falló y no existe una copia anterior: ${String(resultado.reason?.message || resultado.reason)}`);
        }
        console.warn(`::warning::No se pudo actualizar ${nombre}; se conserva la copia del ${ultimaFecha(serieExistente)}. ${String(resultado.reason?.message || resultado.reason)}`);
        return serieExistente;
    }

    if (!Array.isArray(nuevaSerie) || !nuevaSerie.length) {
        if (!Array.isArray(serieExistente) || !serieExistente.length) {
            throw new Error(`${nombre} no devolvió datos válidos y no existe una copia anterior.`);
        }
        console.warn(`::warning::${nombre} no devolvió datos válidos; se conserva la copia del ${ultimaFecha(serieExistente)}.`);
        return serieExistente;
    }

    const fechaNueva = ultimaFecha(nuevaSerie);
    const fechaExistente = ultimaFecha(serieExistente);
    if (fechaExistente && fechaNueva < fechaExistente) {
        console.warn(`::warning::${nombre} devolvió como última fecha ${fechaNueva}, anterior a la copia del ${fechaExistente}; se conservarán también los datos existentes.`);
    }

    const combinada = new Map();
    for (const dato of Array.isArray(serieExistente) ? serieExistente : []) {
        combinada.set(dato.fecha, dato);
    }
    for (const dato of nuevaSerie) {
        combinada.set(dato.fecha, dato);
    }
    return [...combinada.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

try {
    const existente = await obtenerDatosExistentes();
    const [resultadoGasolinas, resultadoPetroleo, resultadoTipoCambio] = await Promise.allSettled([
        obtenerGasolinasMem(),
        obtenerPetroleo(),
        obtenerTipoCambio()
    ]);
    const gasolinasNuevas = resultadoGasolinas.status === 'fulfilled' ? resultadoGasolinas.value : null;
    const petroleoNuevo = resultadoPetroleo.status === 'fulfilled' ? resultadoPetroleo.value : null;
    const tipoCambioNuevo = resultadoTipoCambio.status === 'fulfilled' ? resultadoTipoCambio.value : null;
    const series = {
        Superior: elegirSerie('gasolina Superior', resultadoGasolinas, gasolinasNuevas?.Superior, existente?.series?.Superior),
        Regular: elegirSerie('gasolina Regular', resultadoGasolinas, gasolinasNuevas?.Regular, existente?.series?.Regular)
    };
    const petroleo = elegirSerie('petróleo WTI', resultadoPetroleo, petroleoNuevo, existente?.petroleo);
    const tipoCambio = elegirSerie('tipo de cambio Banguat', resultadoTipoCambio, tipoCambioNuevo, existente?.tipo_cambio);
    const actualizadoGasolina = ultimaFecha(series.Superior);
    const actualizadoWti = ultimaFecha(petroleo);
    const actualizadoTipoCambio = ultimaFecha(tipoCambio);

    const respuesta = {
        series,
        petroleo,
        tipo_cambio: tipoCambio,
        actualizado: [actualizadoGasolina, actualizadoWti].filter(Boolean).sort().at(-1),
        actualizado_gasolina: actualizadoGasolina,
        actualizado_wti: actualizadoWti,
        actualizado_tipo_cambio: actualizadoTipoCambio,
        fuentes: [
            'MEM Guatemala / monitoreo oficial de precios de combustibles',
            'EIA / WTI RWTC',
            'Banco de Guatemala / tipo de cambio de referencia'
        ]
    };
    await mkdir(dirname(ARCHIVO_SERIES), { recursive: true });
    await writeFile(ARCHIVO_SERIES, `${JSON.stringify(respuesta)}\n`, 'utf8');
    console.log(`Histórico generado. Gasolina: ${actualizadoGasolina}; WTI: ${actualizadoWti}; cambio: ${actualizadoTipoCambio}.`);
} catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
}
