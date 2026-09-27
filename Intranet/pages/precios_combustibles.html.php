<section class="observatorio" aria-labelledby="titulo_observatorio">
    <input type="hidden" id="jsid" value="precios_combustibles">
    <input type="hidden" id="series_combustibles" value="">

    <div class="encabezado-observatorio">
        <div>
            <p class="eyebrow">Guatemala · precios promedio nacionales</p>
            <h1 id="titulo_observatorio">¿La gasolina sube por el petróleo?</h1>
            <p class="introduccion">Compare datos oficiales, conozca qué integra el precio y fiscalice sus cambios sin confundir una estimación con evidencia de abuso.</p>
        </div>
        <div class="estado-datos" id="estado_datos">Conectando con las fuentes…</div>
    </div>

    <section class="controles" aria-label="Controles de la gráfica">
        <label>Gasolina
            <select id="combustible">
                <option value="Superior">Superior</option>
                <option value="Regular">Regular</option>
            </select>
        </label>
        <label>Período
            <select id="periodo">
                <option value="365">Último año</option>
                <option value="1095">Últimos 3 años</option>
                <option value="0">Todo el histórico</option>
            </select>
        </label>
        <label>Desfase petróleo → gasolina
            <select id="desfase">
                <option value="0">Sin desfase</option>
                <option value="7">7 días</option>
                <option value="14">14 días</option>
                <option value="21">21 días</option>
            </select>
        </label>
    </section>

    <section class="indicadores" aria-label="Indicadores del período">
        <article><span>Variación gasolina</span><strong id="variacion_gasolina">—</strong><small id="rango_gasolina">—</small></article>
        <article><span>Variación WTI</span><strong id="variacion_petroleo">—</strong><small>USD por barril</small></article>
        <article><span>Correlación</span><strong id="correlacion">—</strong><small id="texto_correlacion">—</small></article>
        <article><span>Ahorro fiscal estimado</span><strong id="ahorro_impuesto">—</strong><small>por galón, último dato</small></article>
    </section>

    <section class="panel-grafica" aria-labelledby="titulo_grafica_total">
        <div class="titulo-panel"><div><p class="eyebrow">Precio final al consumidor</p><h2 id="titulo_grafica_total">Gasolina y petróleo</h2></div><span class="leyenda">Escalas normalizadas (inicio = 100)</span></div>
        <div class="contenedor-canvas"><canvas id="grafica_total"></canvas></div>
        <p class="nota-grafica">La normalización permite comparar la dirección y magnitud de las variaciones aunque las unidades sean distintas: quetzales/galón vs. USD/barril.</p>
    </section>

    <section class="panel-grafica" aria-labelledby="titulo_grafica_estructura">
        <div class="titulo-panel"><div><p class="eyebrow">Estimación proporcional · Ciudad de Guatemala</p><h2 id="titulo_grafica_estructura">Estructura estimada del precio actual</h2></div><span class="leyenda" id="vigencia_estructura" role="status" aria-live="polite">Calculando con la estructura del MEM…</span></div>
        <div class="contenedor-canvas contenedor-canvas-estructura"><canvas id="grafica_estructura" role="img" aria-describedby="nota_estructura"></canvas></div>
        <div class="tabla-contenedor"><table class="tabla-estructura"><thead><tr><th>Componente</th><th>Participación base</th><th>Estimado actual</th></tr></thead><tbody id="tabla_estructura"></tbody><tfoot><tr><th>Precio observado actual</th><th>100%</th><th id="total_estructura">—</th></tr></tfoot></table></div>
        <p class="nota-grafica" id="nota_estructura">Estimación orientativa: distribuye el último precio observado usando las participaciones de la última estructura oficial validada. No representa un desglose contable vigente ni demuestra por sí sola sobreprecio, abuso o fraude.</p>
        <a class="enlace-fuente" id="fuente_estructura" href="https://mem.gob.gt/que-hacemos/hidrocarburos/comercializacion-downstream/precios-combustible-nacionales/" target="_blank" rel="noopener noreferrer">Consultar documento oficial del MEM</a>
    </section>

    <section class="panel-grafica" aria-labelledby="titulo_grafica_neta">
        <div class="titulo-panel"><div><p class="eyebrow">Escenario sin impuestos</p><h2 id="titulo_grafica_neta">Gasolina sin IVA ni IDP y petróleo</h2></div><span class="leyenda">Escalas normalizadas (inicio = 100)</span></div>
        <div class="contenedor-canvas"><canvas id="grafica_sin_impuestos"></canvas></div>
        <p class="nota-grafica">Gasolina sin impuestos = precio publicado − IDP − IVA. El IVA se despeja al 12% sobre el precio antes de IVA y sin IDP.</p>
    </section>

    <section class="metodologia">
        <div><h2>Cómo leer el resultado</h2><p>Una correlación cercana a 1 indica que ambas series se mueven juntas; cercana a 0 señala una relación lineal débil. No demuestra causalidad ni fraude: el precio local también responde a derivados refinados, tipo de cambio, fletes, inventarios, impuestos y márgenes.</p></div>
        <div><h2>Fuentes y cálculo</h2><p>Gasolina y estructura: publicaciones oficiales del MEM consultadas directamente por este proyecto. Petróleo: WTI diario de EIA. Tipo de cambio: Banco de Guatemala. El sitio diferencia datos oficiales de cálculos propios y conserva la fecha de vigencia de cada fuente.</p></div>
    </section>
</section>
