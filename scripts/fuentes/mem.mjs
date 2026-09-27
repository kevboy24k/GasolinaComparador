const URL_API_MEM = 'https://mem.gob.gt/wp-json/wp/v2/pages/45428';
const URL_PAGINA_MEM = 'https://mem.gob.gt/que-hacemos/hidrocarburos/comercializacion-downstream/precios-combustible-nacionales/';
const MESES = {
    enero: 1,
    febrero: 2,
    marzo: 3,
    abril: 4,
    mayo: 5,
    junio: 6,
    julio: 7,
    agosto: 8,
    septiembre: 9,
    setiembre: 9,
    octubre: 10,
    noviembre: 11,
    diciembre: 12
};

function normalizar(texto) {
    return String(texto)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\u00a0/g, ' ')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

function decodificarHtml(texto) {
    const entidades = {
        '&nbsp;': ' ', '&#160;': ' ', '&amp;': '&', '&quot;': '"', '&#34;': '"',
        '&#39;': "'", '&apos;': "'", '&lt;': '<', '&gt;': '>', '&times;': '×'
    };
    return String(texto)
        .replace(/&(?:nbsp|amp|quot|apos|lt|gt|times);|&#(?:34|39|160);/gi, entidad => entidades[entidad.toLowerCase()] || entidad)
        .replace(/&#(\d+);/g, (_, codigo) => String.fromCodePoint(Number(codigo)))
        .replace(/&#x([0-9a-f]+);/gi, (_, codigo) => String.fromCodePoint(parseInt(codigo, 16)));
}

function textoPlano(html) {
    return decodificarHtml(String(html))
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function fechaIso(anio, mes, dia) {
    const fecha = new Date(Date.UTC(Number(anio), Number(mes) - 1, Number(dia)));
    if (fecha.getUTCFullYear() !== Number(anio) || fecha.getUTCMonth() !== Number(mes) - 1 || fecha.getUTCDate() !== Number(dia)) {
        return null;
    }
    return fecha.toISOString().slice(0, 10);
}

function extraerFechas(texto) {
    const fechas = [];
    const limpio = normalizar(texto);
    for (const coincidencia of limpio.matchAll(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/g)) {
        const fecha = fechaIso(coincidencia[3], coincidencia[2], coincidencia[1]);
        if (fecha) fechas.push(fecha);
    }
    for (const coincidencia of limpio.matchAll(/\b(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})\b/g)) {
        const mes = MESES[coincidencia[2]];
        const fecha = mes ? fechaIso(coincidencia[3], mes, coincidencia[1]) : null;
        if (fecha) fechas.push(fecha);
    }
    return fechas;
}

function extraerNumero(texto) {
    const coincidencia = String(texto).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    const numero = coincidencia ? Number(coincidencia[0]) : NaN;
    return Number.isFinite(numero) ? numero : null;
}

function extraerFilas(tablaHtml) {
    return [...String(tablaHtml).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(fila =>
        [...fila[1].matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map(celda => textoPlano(celda[1]))
    ).filter(fila => fila.length);
}

function buscarCandidato(tablaHtml, contexto) {
    const filas = extraerFilas(tablaHtml);
    let columnaPrecio = null;
    let fecha = null;

    for (const fila of filas) {
        fila.forEach((celda, indice) => {
            for (const candidata of extraerFechas(celda)) {
                if (!fecha || candidata > fecha) {
                    fecha = candidata;
                    columnaPrecio = indice;
                }
            }
        });
    }
    if (!fecha || columnaPrecio === null) return null;

    const precios = {};
    for (const fila of filas) {
        const combustible = normalizar(fila[0] || '');
        const tipo = combustible.includes('superior') ? 'Superior' : combustible.includes('regular') ? 'Regular' : null;
        if (!tipo || columnaPrecio >= fila.length) continue;
        const precio = extraerNumero(fila[columnaPrecio]);
        if (precio !== null && precio > 0) precios[tipo] = precio;
    }
    if (!precios.Superior || !precios.Regular) return null;

    const contextoNormalizado = normalizar(contexto);
    let puntaje = 0;
    if (contextoNormalizado.includes('auto servicio') || contextoNormalizado.includes('autoservicio')) puntaje += 100;
    if (contextoNormalizado.includes('servicio completo')) puntaje -= 50;
    return { fecha, precios, puntaje };
}

export function extraerPreciosMem(html) {
    const tablas = [...String(html).matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)];
    const candidatos = tablas.map(coincidencia => {
        const inicio = coincidencia.index || 0;
        const contexto = String(html).slice(Math.max(0, inicio - 700), inicio);
        return buscarCandidato(coincidencia[0], contexto);
    }).filter(Boolean);
    if (!candidatos.length) {
        throw new Error('El MEM respondió, pero no se encontró la tabla de precios de autoservicio.');
    }
    candidatos.sort((a, b) => b.puntaje - a.puntaje || b.fecha.localeCompare(a.fecha));
    const elegido = candidatos[0];
    const cambio = normalizar(textoPlano(html)).match(/tipo de cambio[^q\d]{0,80}q?\s*(\d+(?:\.\d+)?)/);
    return {
        fecha: elegido.fecha,
        precios: elegido.precios,
        tipo_cambio: cambio ? Number(cambio[1]) : null
    };
}

function urlProxy(urlObjetivo, proxy) {
    if (!proxy) return null;
    if (proxy.includes('{url}')) return proxy.replace('{url}', encodeURIComponent(urlObjetivo));
    const separador = proxy.includes('?') ? '&' : '?';
    return `${proxy}${separador}url=${encodeURIComponent(urlObjetivo)}`;
}

async function solicitar(url, proxy) {
    const opciones = {
        headers: { 'User-Agent': 'GasolinaComparador-Comunidad/1.0', Accept: 'application/json,text/html;q=0.9' },
        signal: AbortSignal.timeout(60_000)
    };
    const intentos = [url, urlProxy(url, proxy)].filter(Boolean);
    const errores = [];
    for (const intento of intentos) {
        try {
            const respuesta = await fetch(intento, opciones);
            if (!respuesta.ok) {
                errores.push(`HTTP ${respuesta.status}`);
                continue;
            }
            return respuesta.text();
        } catch (error) {
            errores.push(error.message);
        }
    }
    throw new Error(`No se pudo consultar el MEM (${errores.join('; ')}). Configure MEM_PROXY_URL si el sitio bloquea GitHub Actions.`);
}

function crearDato(fecha, precio, combustible, tipoCambio) {
    const idp = combustible === 'Superior' ? 4.70 : 4.60;
    const iva = (precio - idp) * 12 / 112;
    return {
        fecha,
        precio: Number(precio.toFixed(4)),
        sin_impuestos: Number((precio - idp - iva).toFixed(4)),
        idp,
        iva: Number(iva.toFixed(4)),
        ...(Number.isFinite(tipoCambio) ? { tipo_cambio: Number(tipoCambio.toFixed(5)) } : {})
    };
}

export async function obtenerGasolinasMem() {
    const proxy = process.env.MEM_PROXY_URL?.trim() || '';
    const errores = [];
    for (const url of [URL_API_MEM, URL_PAGINA_MEM]) {
        try {
            const contenido = await solicitar(url, proxy);
            let html = contenido;
            if (url === URL_API_MEM) {
                const json = JSON.parse(contenido);
                html = json?.content?.rendered || '';
            }
            const dato = extraerPreciosMem(html);
            return {
                Superior: [crearDato(dato.fecha, dato.precios.Superior, 'Superior', dato.tipo_cambio)],
                Regular: [crearDato(dato.fecha, dato.precios.Regular, 'Regular', dato.tipo_cambio)]
            };
        } catch (error) {
            errores.push(`${url}: ${error.message}`);
        }
    }
    throw new Error(errores.join(' | '));
}

