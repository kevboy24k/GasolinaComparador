"use strict";

let grafica_total = null;
let grafica_sin_impuestos = null;
const URL_SERIES_COMBUSTIBLES = 'data/series_combustibles.json';

function iniciar_opcion() {
    const estado_datos = document.getElementById('estado_datos');
    fetch(URL_SERIES_COMBUSTIBLES, { cache: 'no-cache' })
        .then(function (respuesta) {
            if (!respuesta.ok) {
                throw new Error('No se pudo descargar el histórico de combustibles.');
            }
            return respuesta.json();
        })
        .then(function (data) {
            if (!data.series || !data.petroleo) {
                throw new Error('El histórico de combustibles no tiene el formato esperado.');
            }
        estado_datos.textContent = 'Actualizado: ' + (data.actualizado || 'sin fecha disponible');
        configurar_controles(data);
        dibujar_analisis(data);
        })
        .catch(function (error) {
        estado_datos.classList.add('error-texto');
        estado_datos.textContent = error.message;
        });
}

function configurar_controles(data) {
    ['combustible', 'periodo', 'desfase'].forEach(function (id) {
        document.getElementById(id).addEventListener('change', function () { dibujar_analisis(data); });
    });
}

function dibujar_analisis(data) {
    const combustible = document.getElementById('combustible').value;
    const dias = Number(document.getElementById('periodo').value);
    const desfase = Number(document.getElementById('desfase').value);
    const series = alinear_series(data.series[combustible] || [], data.petroleo || [], dias, desfase);
    actualizar_indicadores(series);
    construir_grafica('grafica_total', 'gasolina', series, combustible);
    construir_grafica('grafica_sin_impuestos', 'sin_impuestos', series, combustible);
}

function alinear_series(gasolina, petroleo, dias, desfase) {
    const petroleo_por_fecha = new Map(petroleo.map(function (dato) { return [dato.fecha, Number(dato.precio)]; }));
    const fechas_petroleo = petroleo.map(function (dato) { return dato.fecha; });
    const resultado = gasolina.map(function (dato) {
        const fecha_objeto = new Date(dato.fecha + 'T12:00:00');
        fecha_objeto.setDate(fecha_objeto.getDate() - desfase);
        const fecha_petroleo = fecha_objeto.toISOString().slice(0, 10);
        let precio_petroleo = petroleo_por_fecha.get(fecha_petroleo);
        if (precio_petroleo === undefined) {
            const anterior = fechas_petroleo.filter(function (fecha) { return fecha <= fecha_petroleo; }).pop();
            precio_petroleo = anterior ? petroleo_por_fecha.get(anterior) : undefined;
        }
        return { fecha: dato.fecha, gasolina: Number(dato.precio), sin_impuestos: Number(dato.sin_impuestos), petroleo: precio_petroleo };
    }).filter(function (dato) { return Number.isFinite(dato.petroleo); });
    return dias ? resultado.slice(-dias) : resultado;
}

function normalizar(valores) {
    const base = valores.find(function (valor) { return Number.isFinite(valor) && valor !== 0; });
    return valores.map(function (valor) { return base ? Number((valor / base * 100).toFixed(2)) : null; });
}

function construir_grafica(id, campo, series, combustible) {
    const canvas = document.getElementById(id);
    const datos_gasolina = series.map(function (dato) { return dato[campo]; });
    const datos_petroleo = series.map(function (dato) { return dato.petroleo; });
    const datasets = [
        { label: campo === 'sin_impuestos' ? 'Gasolina ' + combustible + ' sin IVA e IDP' : 'Gasolina ' + combustible, data: normalizar(datos_gasolina), borderColor: '#ffb703', backgroundColor: 'rgba(255,183,3,.13)', borderWidth: 3, pointRadius: 0, tension: .22, fill: true },
        { label: 'Petróleo WTI', data: normalizar(datos_petroleo), borderColor: '#34d399', backgroundColor: 'transparent', borderWidth: 3, pointRadius: 0, tension: .22 }
    ];
    const configuracion = { type: 'line', data: { labels: series.map(function (dato) { return dato.fecha; }), datasets: datasets }, options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { labels: { color: '#cbd5e1', usePointStyle: true, padding: 24 } }, tooltip: { callbacks: { label: function (contexto) { const dato = series[contexto.dataIndex]; const valor_real = contexto.datasetIndex === 0 ? dato[campo] : dato.petroleo; const unidad = contexto.datasetIndex === 0 ? 'Q/gal' : 'USD/barril'; return contexto.dataset.label + ': ' + valor_real.toFixed(2) + ' ' + unidad + ' · índice ' + contexto.parsed.y.toFixed(1); } } } }, scales: { x: { ticks: { color: '#94a3b8', maxTicksLimit: 8 }, grid: { color: 'rgba(148,163,184,.10)' } }, y: { title: { display: true, text: 'Índice base 100', color: '#94a3b8' }, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,.10)' } } } } };
    if (id === 'grafica_total' && grafica_total) grafica_total.destroy();
    if (id === 'grafica_sin_impuestos' && grafica_sin_impuestos) grafica_sin_impuestos.destroy();
    const grafica = new Chart(canvas, configuracion);
    if (id === 'grafica_total') grafica_total = grafica;
    else grafica_sin_impuestos = grafica;
}

function actualizar_indicadores(series) {
    if (series.length < 2) return;
    const primero = series[0];
    const ultimo = series[series.length - 1];
    const variacion = function (inicial, final) { return (final - inicial) / inicial * 100; };
    const gas = variacion(primero.gasolina, ultimo.gasolina);
    const oil = variacion(primero.petroleo, ultimo.petroleo);
    const correlacion = correlacion_pearson(series.map(function (dato) { return dato.gasolina; }), series.map(function (dato) { return dato.petroleo; }));
    document.getElementById('variacion_gasolina').textContent = formato_variacion(gas);
    document.getElementById('rango_gasolina').textContent = 'Q' + primero.gasolina.toFixed(2) + ' → Q' + ultimo.gasolina.toFixed(2) + ' por galón';
    document.getElementById('variacion_petroleo').textContent = formato_variacion(oil);
    document.getElementById('correlacion').textContent = correlacion.toFixed(2);
    document.getElementById('texto_correlacion').textContent = etiqueta_correlacion(correlacion);
    document.getElementById('ahorro_impuesto').textContent = 'Q' + (ultimo.gasolina - ultimo.sin_impuestos).toFixed(2);
}

function correlacion_pearson(a, b) {
    const promedio = function (valores) { return valores.reduce(function (suma, valor) { return suma + valor; }, 0) / valores.length; };
    const promedio_a = promedio(a), promedio_b = promedio(b);
    let numerador = 0, suma_a = 0, suma_b = 0;
    for (let i = 0; i < a.length; i += 1) { const da = a[i] - promedio_a, db = b[i] - promedio_b; numerador += da * db; suma_a += da * da; suma_b += db * db; }
    return suma_a && suma_b ? numerador / Math.sqrt(suma_a * suma_b) : 0;
}

function formato_variacion(valor) { return (valor >= 0 ? '+' : '') + valor.toFixed(1) + '%'; }
function etiqueta_correlacion(valor) { const absoluto = Math.abs(valor); return absoluto >= .7 ? 'relación lineal fuerte' : absoluto >= .4 ? 'relación lineal moderada' : 'relación lineal débil'; }
