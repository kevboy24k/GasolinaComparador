<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Análisis histórico de gasolina y petróleo en Guatemala.">
    <title>Observatorio de Combustibles</title>
    <link rel="preconnect" href="https://cdn.jsdelivr.net">
    <link rel="stylesheet" href="Intranet/css/combustibles.css">
</head>
<body>
    <header class="barra-principal">
        <a class="marca" href="index.php" aria-label="Inicio">OBSERVATORIO <span>COMBUSTIBLES</span></a>
        <button class="opcion-menu" type="button" data-opcion="precios_combustibles">Análisis de precios</button>
    </header>
    <main id="contenido_principal" aria-live="polite">
        <div class="cargando">Cargando el análisis…</div>
    </main>

    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
    <script src="Intranet/js/common.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function () {
            mostrar_opcion('precios_combustibles');
        });
    </script>
</body>
</html>
