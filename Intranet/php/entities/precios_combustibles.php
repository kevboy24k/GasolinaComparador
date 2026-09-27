<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/WiseTech/utils.php';

class precios_combustibles
{
    public function cargar_opcion(string $fields = ''): string
    {
        return (string) file_get_contents(dirname(__DIR__, 2) . '/pages/precios_combustibles.html.php');
    }

    public function obtener_series(string $fields = ''): array
    {
        $archivo = dirname(__DIR__, 3) . '/data/series_combustibles.json';
        $contenido = is_file($archivo) ? file_get_contents($archivo) : false;
        $ARRAY_respuesta = is_string($contenido) ? json_decode($contenido, true) : null;
        if (!is_array($ARRAY_respuesta)) {
            utils::report_error('No se encontró el histórico consolidado de combustibles o contiene JSON inválido.');
            throw new RuntimeException('El histórico de combustibles no está disponible.');
        }
        return $ARRAY_respuesta;
    }
}
