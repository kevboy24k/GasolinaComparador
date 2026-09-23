<?php
declare(strict_types=1);

class utils
{
    public static function report_error(string $mensaje, array $ARRAY_contexto = []): void
    {
        $registro = [
            'fecha' => gmdate('c'),
            'mensaje' => $mensaje,
            'contexto' => $ARRAY_contexto,
        ];
        error_log(json_encode($registro, JSON_UNESCAPED_UNICODE));
    }
}
