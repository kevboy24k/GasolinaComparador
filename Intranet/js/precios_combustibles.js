(function (global) {
    "use strict";

    const URL_SERIES_COMBUSTIBLES = 'data/series_combustibles.json';
    const URL_ESTRUCTURA_PRECIOS = 'data/estructura_precios.json';
    const graficas = new Map();

    function descargar_json(url) {
        return fetch(url, { cache: 'no-cache' }).then(function (respuesta) {
            if (!respuesta.ok) throw new Error('No se pudo descargar ' + url + '.');
            return respuesta.json();
        });
    }

    function iniciar_opcion() {
        const estado_datos = document.getElementById('estado_datos');
        Promise.all([
            descargar_json(URL_SERIES_COMBUSTIBLES),
            descargar_json(URL_ESTRUCTURA_PRECIOS).catch(function () { return null; })
        ]).then(function (resultados) {
            const data = resultados[0];
            const estructura = resultados[1];
            if (!data.series || !data.petroleo) {
                throw new Error('El histórico de combustibles no tiene el formato esperado.');
            }
            const fecha_gasolina = data.actualizado_gasolina || data.actualizado || 'sin fecha disponible';
            const fecha_wti = data.actualizado_wti || obtener_ultima_fecha(data.petroleo) || 'sin fecha disponible';
            estado_datos.textContent = 'Gasolina: ' + fecha_gasolina + ' · WTI: ' + fecha_wti;
            configurar_controles(data, estructura);
            dibujar_analisis(data, estructura);
        }).catch(function (error) {
            estado_datos.classList.add('error-texto');
            estado_datos.textContent = error.message;
        });
    }

    function obtener_ultima_fecha(serie) {
        return Array.isArray(serie) && serie.length ? serie[serie.length - 1].fecha : null;
    }

    function configurar_controles(data, estructura) {
        document.getElementById('combustible').addEventListener('change', function () {
            dibujar_analisis(data, estructura);
        });
        ['periodo', 'desfase'].forEach(function (id) {
            document.getElementById(id).addEventListener('change', function () {
                dibujar_historico(data);
            });
        });
    }

    function dibujar_analisis(data, estructura) {
        dibujar_historico(data);
        const combustible = document.getElementById('combustible').value;
        const serie = Array.isArray(data.series[combustible]) ? data.series[combustible] : [];
        const dato_actual = serie.slice().sort(function (a, b) { return a.fecha.localeCompare(b.fecha); }).at(-1) || null;
        construir_grafica_estructura(estructura, combustible, dato_actual);
    }

    function dibujar_historico(data) {
        const combustible = document.getElementById('combustible').value;
        const dias = Number(document.getElementById('periodo').value);
        const desfase = Number(document.getElementById('desfase').value);
        const series = alinear_series(data.series[combustible] || [], data.petroleo || [], dias, desfase);
        actualizar_indicadores(series);
        construir_grafica_linea('grafica_total', 'gasolina', series, combustible);
        construir_grafica_linea('grafica_sin_impuestos', 'sin_impuestos', series, combustible);
    }

    function mover_dias(fecha, dias) {
        const partes = fecha.split('-').map(Number);
        const valor = Date.UTC(partes[0], partes[1] - 1, partes[2]);
        return new Date(valor + dias * 86400000).toISOString().slice(0, 10);
    }

    function valor_en_o_antes(serie, fecha, campo) {
        let inicio = 0;
        let fin = serie.length - 1;
        let encontrado = null;
        while (inicio <= fin) {
            const medio = Math.floor((inicio + fin) / 2);
            if (serie[medio].fecha <= fecha) {
                encontrado = serie[medio];
                inicio = medio + 1;
            } else {
                fin = medio - 1;
            }
        }
        return encontrado ? Number(encontrado[campo]) : undefined;
    }

    function alinear_series(gasolina, petroleo, dias, desfase) {
        const gasolina_ordenada = gasolina.slice().sort(function (a, b) { return a.fecha.localeCompare(b.fecha); });
        const petroleo_ordenado = petroleo.slice().sort(function (a, b) { return a.fecha.localeCompare(b.fecha); });
        const ultima_fecha = obtener_ultima_fecha(gasolina_ordenada);
        const fecha_minima = dias && ultima_fecha ? mover_dias(ultima_fecha, -dias) : null;
        return gasolina_ordenada.filter(function (dato) {
            return !fecha_minima || dato.fecha >= fecha_minima;
        }).map(function (dato) {
            const fecha_petroleo = mover_dias(dato.fecha, -desfase);
            return {
                fecha: dato.fecha,
                gasolina: Number(dato.precio),
                sin_impuestos: Number(dato.sin_impuestos),
                idp: Number(dato.idp),
                iva: Number(dato.iva),
                petroleo: valor_en_o_antes(petroleo_ordenado, fecha_petroleo, 'precio')
            };
        }).filter(function (dato) { return Number.isFinite(dato.petroleo); });
    }

    function normalizar(valores) {
        const base = valores.find(function (valor) { return Number.isFinite(valor) && valor !== 0; });
        return valores.map(function (valor) { return base ? Number((valor / base * 100).toFixed(2)) : null; });
    }

    function reemplazar_grafica(id, configuracion) {
        const anterior = graficas.get(id);
        if (anterior) anterior.destroy();
        const canvas = document.getElementById(id);
        if (!canvas) return;
        graficas.set(id, new Chart(canvas, configuracion));
    }

    function construir_grafica_linea(id, campo, series, combustible) {
        const datos_gasolina = series.map(function (dato) { return dato[campo]; });
        const datos_petroleo = series.map(function (dato) { return dato.petroleo; });
        const datasets = [
            { label: campo === 'sin_impuestos' ? 'Gasolina ' + combustible + ' sin IVA e IDP' : 'Gasolina ' + combustible, data: normalizar(datos_gasolina), borderColor: '#ffb703', backgroundColor: 'rgba(255,183,3,.13)', borderWidth: 3, pointRadius: 0, tension: .22, fill: true },
            { label: 'Petróleo WTI', data: normalizar(datos_petroleo), borderColor: '#34d399', backgroundColor: 'transparent', borderWidth: 3, pointRadius: 0, tension: .22 }
        ];
        reemplazar_grafica(id, {
            type: 'line',
            data: { labels: series.map(function (dato) { return dato.fecha; }), datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { labels: { color: '#cbd5e1', usePointStyle: true, padding: 24 } },
                    tooltip: { callbacks: { label: function (contexto) {
                        const dato = series[contexto.dataIndex];
                        const valor_real = contexto.datasetIndex === 0 ? dato[campo] : dato.petroleo;
                        const unidad = contexto.datasetIndex === 0 ? 'Q/gal' : 'USD/barril';
                        return contexto.dataset.label + ': ' + valor_real.toFixed(2) + ' ' + unidad + ' · índice ' + contexto.parsed.y.toFixed(1);
                    } } }
                },
                scales: {
                    x: { ticks: { color: '#94a3b8', maxTicksLimit: 8 }, grid: { color: 'rgba(148,163,184,.10)' } },
                    y: { title: { display: true, text: 'Índice base 100', color: '#94a3b8' }, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,.10)' } }
                }
            }
        });
    }

    function construir_grafica_estructura(estructura, combustible, dato_actual) {
        const vigencia = document.getElementById('vigencia_estructura');
        const tabla = document.getElementById('tabla_estructura');
        const totalElemento = document.getElementById('total_estructura');
        const enlace = document.getElementById('fuente_estructura');
        const nota = document.getElementById('nota_estructura');
        if (!vigencia || !tabla || !totalElemento || !enlace || !nota) return;

        const detalle = estructura && estructura.combustibles ? estructura.combustibles[combustible] : null;
        const precio_actual = Number(dato_actual && dato_actual.precio);
        if (!detalle || !Array.isArray(detalle.componentes) || !Number.isFinite(precio_actual) || precio_actual <= 0 || !dato_actual.fecha) {
            vigencia.textContent = 'Estructura oficial no disponible';
            tabla.innerHTML = '<tr><td colspan="3">No hay información suficiente para calcular esta estimación; las gráficas históricas continúan funcionando.</td></tr>';
            totalElemento.textContent = '—';
            const anterior = graficas.get('grafica_estructura');
            if (anterior) anterior.destroy();
            graficas.delete('grafica_estructura');
            return;
        }

        const total = Number(detalle.total);
        const componentes_validos = detalle.componentes.length > 0 && detalle.componentes.every(function (componente) {
            return typeof componente.nombre === 'string' && componente.nombre.trim() && Number.isFinite(Number(componente.valor)) && Number(componente.valor) >= 0;
        });
        const suma = componentes_validos
            ? detalle.componentes.reduce(function (acumulado, componente) { return acumulado + Number(componente.valor); }, 0)
            : NaN;
        if (!componentes_validos || !Number.isFinite(total) || total <= 0 || !Number.isFinite(suma) || Math.abs(suma - total) > 0.05) {
            vigencia.textContent = 'Estructura oficial inválida';
            tabla.innerHTML = '<tr><td colspan="3">La suma del desglose no coincide con el total publicado y no se mostrará.</td></tr>';
            totalElemento.textContent = '—';
            const anterior = graficas.get('grafica_estructura');
            if (anterior) anterior.destroy();
            graficas.delete('grafica_estructura');
            return;
        }

        const precio_actual_redondeado = Number(precio_actual.toFixed(2));
        const componentes_estimados = detalle.componentes.map(function (componente) {
            const participacion = Number(componente.valor) / suma;
            return {
                nombre: componente.nombre,
                participacion: participacion,
                valor: Number((precio_actual_redondeado * participacion).toFixed(2))
            };
        });
        const suma_estimada = componentes_estimados.reduce(function (acumulado, componente) { return acumulado + componente.valor; }, 0);
        const ajuste_redondeo = Number((precio_actual_redondeado - suma_estimada).toFixed(2));
        if (ajuste_redondeo) {
            const indice_mayor = componentes_estimados.reduce(function (mejor, componente, indice, componentes) {
                return componente.valor > componentes[mejor].valor ? indice : mejor;
            }, 0);
            componentes_estimados[indice_mayor].valor = Number((componentes_estimados[indice_mayor].valor + ajuste_redondeo).toFixed(2));
        }

        vigencia.textContent = 'Precio observado MEM: ' + dato_actual.fecha + ' · Porcentajes base: ' + estructura.vigente_desde + ' a ' + estructura.vigente_hasta;
        enlace.href = String(estructura.fuente_url || '').startsWith('https://mem.gob.gt/')
            ? estructura.fuente_url
            : 'https://mem.gob.gt/que-hacemos/hidrocarburos/comercializacion-downstream/precios-combustible-nacionales/';
        tabla.textContent = '';
        componentes_estimados.forEach(function (componente) {
            const fila = document.createElement('tr');
            const nombre = document.createElement('td');
            const porcentaje = document.createElement('td');
            const valor = document.createElement('td');
            nombre.textContent = componente.nombre;
            porcentaje.textContent = (componente.participacion * 100).toFixed(1) + '%';
            valor.textContent = 'Q' + componente.valor.toFixed(2) + '/galón';
            fila.append(nombre, porcentaje, valor);
            tabla.appendChild(fila);
        });
        totalElemento.textContent = 'Q' + precio_actual_redondeado.toFixed(2) + '/galón';
        nota.textContent = 'Estimación proporcional: distribuye el precio promedio observado de Q' + precio_actual_redondeado.toFixed(2) + '/galón del ' + dato_actual.fecha + ' usando las participaciones del desglose oficial que totalizaba Q' + total.toFixed(2) + '/galón (' + estructura.vigente_desde + ' a ' + estructura.vigente_hasta + '). Los costos, impuestos y márgenes reales pueden no variar en la misma proporción; no es un desglose contable vigente ni prueba por sí sola sobreprecio, abuso o fraude.';

        const colores = ['#38bdf8', '#818cf8', '#c084fc', '#fb7185', '#fbbf24', '#2dd4bf', '#a3e635'];
        const datasets = componentes_estimados.map(function (componente, indice) {
            return {
                label: componente.nombre,
                data: [componente.valor],
                participacionBase: componente.participacion,
                backgroundColor: colores[indice % colores.length],
                borderWidth: 0,
                barThickness: 54
            };
        });
        reemplazar_grafica('grafica_estructura', {
            type: 'bar',
            data: { labels: ['Gasolina ' + combustible + ' · Q' + precio_actual_redondeado.toFixed(2)], datasets: datasets },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#cbd5e1', usePointStyle: true, boxWidth: 10, padding: 16 } },
                    tooltip: { callbacks: { label: function (contexto) {
                        const valor = Number(contexto.raw);
                        return contexto.dataset.label + ' estimado: Q' + valor.toFixed(2) + '/galón · ' + (contexto.dataset.participacionBase * 100).toFixed(1) + '% base';
                    } } }
                },
                scales: {
                    x: { stacked: true, beginAtZero: true, title: { display: true, text: 'Quetzales estimados por galón', color: '#94a3b8' }, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,.10)' } },
                    y: { stacked: true, ticks: { color: '#cbd5e1' }, grid: { display: false } }
                }
            }
        });
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
        for (let i = 0; i < a.length; i += 1) {
            const da = a[i] - promedio_a, db = b[i] - promedio_b;
            numerador += da * db;
            suma_a += da * da;
            suma_b += db * db;
        }
        return suma_a && suma_b ? numerador / Math.sqrt(suma_a * suma_b) : 0;
    }

    function formato_variacion(valor) { return (valor >= 0 ? '+' : '') + valor.toFixed(1) + '%'; }
    function etiqueta_correlacion(valor) {
        const absoluto = Math.abs(valor);
        return absoluto >= .7 ? 'relación lineal fuerte' : absoluto >= .4 ? 'relación lineal moderada' : 'relación lineal débil';
    }

    global.iniciar_opcion = iniciar_opcion;
}(window));
