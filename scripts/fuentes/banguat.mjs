const URL_TIPO_CAMBIO = 'https://www.banguat.gob.gt/variables/ws/TipoCambio.asmx';

function formatoBanguat(fecha) {
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio}`;
}

function fechaIso(fecha) {
    const coincidencia = String(fecha).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!coincidencia) return null;
    return `${coincidencia[3]}-${coincidencia[2].padStart(2, '0')}-${coincidencia[1].padStart(2, '0')}`;
}

export async function obtenerTipoCambio(fechaInicial = '2013-01-01', fechaFinal = new Date().toISOString().slice(0, 10)) {
    const cuerpo = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body><TipoCambioRango xmlns="http://www.banguat.gob.gt/variables/ws/"><fechainit>${formatoBanguat(fechaInicial)}</fechainit><fechafin>${formatoBanguat(fechaFinal)}</fechafin></TipoCambioRango></soap:Body>
</soap:Envelope>`;
    const respuesta = await fetch(URL_TIPO_CAMBIO, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            SOAPAction: 'http://www.banguat.gob.gt/variables/ws/TipoCambioRango',
            'User-Agent': 'GasolinaComparador-Comunidad/1.0'
        },
        body: cuerpo,
        signal: AbortSignal.timeout(60_000)
    });
    if (!respuesta.ok) throw new Error(`Banco de Guatemala respondió HTTP ${respuesta.status}.`);
    const xml = await respuesta.text();
    const datos = [...xml.matchAll(/<Var>\s*<moneda>2<\/moneda>\s*<fecha>([^<]+)<\/fecha>\s*<venta>([^<]+)<\/venta>[\s\S]*?<\/Var>/gi)]
        .map(coincidencia => ({ fecha: fechaIso(coincidencia[1]), valor: Number(coincidencia[2]) }))
        .filter(dato => dato.fecha && Number.isFinite(dato.valor) && dato.valor > 0)
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
    if (!datos.length) throw new Error('Banco de Guatemala no devolvió tipos de cambio válidos.');
    return datos;
}

