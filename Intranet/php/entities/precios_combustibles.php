<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/WiseTech/utils.php';

class precios_combustibles
{
    private const URL_HISTORICO_GASOLINA = 'https://raw.githubusercontent.com/peterargueta/Precios_combustibles_GT/main/precios_historicos.csv';
    private const URL_WTI = 'https://api.eia.gov/v2/petroleum/pri/spt/data/?api_key=DEMO_KEY&frequency=daily&data[0]=value&facets[series][]=RWTC&start=2013-01-01&sort[0][column]=period&sort[0][direction]=asc';
    private const SEGUNDOS_CACHE = 21600;

    public function cargar_opcion(string $fields = ''): string
    {
        return (string) file_get_contents(dirname(__DIR__, 2) . '/pages/precios_combustibles.html.php');
    }

    public function obtener_series(string $fields = ''): array
    {
        $archivo_cache = dirname(__DIR__, 2) . '/data/series_combustibles.json';
        if (is_file($archivo_cache) && (time() - filemtime($archivo_cache)) < self::SEGUNDOS_CACHE) {
            $contenido_cache = file_get_contents($archivo_cache);
            $ARRAY_cache = json_decode((string) $contenido_cache, true);
            if (is_array($ARRAY_cache)) {
                return $ARRAY_cache;
            }
            utils::report_error('El caché de combustibles contiene JSON inválido.');
        }

        $ARRAY_series = $this->obtener_gasolinas();
        $ARRAY_petroleo = $this->obtener_petroleo();
        if (empty($ARRAY_series['Superior']) || empty($ARRAY_petroleo)) {
            utils::report_error('No se pudo generar la serie de combustibles.', ['gasolina' => count($ARRAY_series['Superior'] ?? []), 'petroleo' => count($ARRAY_petroleo)]);
            throw new RuntimeException('Las fuentes externas no devolvieron suficientes datos.');
        }

        $ultimo_dato = end($ARRAY_series['Superior']);
        $ARRAY_respuesta = [
            'series' => $ARRAY_series,
            'petroleo' => $ARRAY_petroleo,
            'actualizado' => $ultimo_dato['fecha'] ?? null,
            'fuentes' => ['MEM / Precios_combustibles_GT', 'EIA / WTI RWTC'],
        ];
        file_put_contents($archivo_cache, json_encode($ARRAY_respuesta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
        return $ARRAY_respuesta;
    }

    private function obtener_gasolinas(): array
    {
        $csv = $this->descargar(self::URL_HISTORICO_GASOLINA);
        $ARRAY_series = ['Superior' => [], 'Regular' => []];
        $ARRAY_idp = ['Superior' => 4.70, 'Regular' => 4.60];
        $ARRAY_lineas = preg_split('/\r\n|\r|\n/', trim($csv));
        if (!$ARRAY_lineas || count($ARRAY_lineas) < 2) {
            throw new RuntimeException('El histórico de gasolina tiene un formato inválido.');
        }
        array_shift($ARRAY_lineas);
        foreach ($ARRAY_lineas as $linea) {
            $ARRAY_fila = str_getcsv($linea, ',', '"', '\\');
            if (count($ARRAY_fila) < 3 || !isset($ARRAY_idp[$ARRAY_fila[1]])) {
                continue;
            }
            $fecha = trim($ARRAY_fila[0]);
            $combustible = trim($ARRAY_fila[1]);
            $precio = (float) $ARRAY_fila[2];
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha) || $precio <= 0) {
                utils::report_error('Fila inválida en histórico de gasolina.', ['fecha' => $fecha, 'combustible' => $combustible]);
                continue;
            }
            $idp = $ARRAY_idp[$combustible];
            // IVA incluido = (precio - IDP) * 12 / 112; el IDP no integra la base del IVA.
            $iva = ($precio - $idp) * 12 / 112;
            $ARRAY_series[$combustible][] = [
                'fecha' => $fecha,
                'precio' => round($precio, 4),
                'sin_impuestos' => round($precio - $idp - $iva, 4),
                'idp' => $idp,
                'iva' => round($iva, 4),
            ];
        }
        return $ARRAY_series;
    }

    private function obtener_petroleo(): array
    {
        $json = $this->descargar(self::URL_WTI);
        $ARRAY_api = json_decode($json, true);
        $ARRAY_datos = $ARRAY_api['response']['data'] ?? [];
        if (!is_array($ARRAY_datos)) {
            throw new RuntimeException('La respuesta de WTI no contiene datos válidos.');
        }
        $ARRAY_petroleo = [];
        foreach ($ARRAY_datos as $ARRAY_fila) {
            $fecha = $ARRAY_fila['period'] ?? '';
            $precio = isset($ARRAY_fila['value']) ? (float) $ARRAY_fila['value'] : 0;
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha) || $precio <= 0) {
                utils::report_error('Fila inválida en histórico WTI.', ['fecha' => $fecha]);
                continue;
            }
            $ARRAY_petroleo[] = ['fecha' => $fecha, 'precio' => round($precio, 4)];
        }
        usort($ARRAY_petroleo, static fn(array $a, array $b): int => strcmp($a['fecha'], $b['fecha']));
        return $ARRAY_petroleo;
    }

    private function descargar(string $url): string
    {
        $curl = curl_init($url);
        if ($curl === false) {
            utils::report_error('No se pudo iniciar cURL.', ['url' => $url]);
            throw new RuntimeException('No se pudo iniciar la conexión con la fuente de datos.');
        }
        curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => 45,
            CURLOPT_USERAGENT => 'GasolinaPetro/1.0',
        ]);
        $respuesta = curl_exec($curl);
        $codigo_http = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $error = curl_error($curl);
        curl_close($curl);
        if (!is_string($respuesta) || $codigo_http < 200 || $codigo_http >= 300) {
            utils::report_error('Error descargando fuente externa.', ['url' => $url, 'http' => $codigo_http, 'error' => $error]);
            throw new RuntimeException('No se pudo actualizar una fuente de datos.');
        }
        return $respuesta;
    }
}
