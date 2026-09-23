<?php
declare(strict_types=1);

class bitacora
{
    public static function registrar(string $clase, string $operacion, string $resultado): void
    {
        $registro = json_encode([
            'fecha' => gmdate('c'),
            'clase' => $clase,
            'operacion' => $operacion,
            'resultado' => $resultado,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'cli',
        ], JSON_UNESCAPED_UNICODE) . PHP_EOL;
        file_put_contents(dirname(__DIR__, 2) . '/data/bitacora.log', $registro, FILE_APPEND | LOCK_EX);
    }
}
