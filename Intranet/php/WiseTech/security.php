<?php
declare(strict_types=1);

require_once __DIR__ . '/utils.php';

class security
{
    public static function validate_permission(string $clase, string $operacion): bool
    {
        // En la intranet este método se conecta a la librería central de permisos.
        // Se conserva una autorización explícita para que la consulta pública sea de solo lectura.
        $ARRAY_permisos_publicos = ['precios_combustibles.obtener_series', 'precios_combustibles.cargar_opcion'];
        $permiso = $clase . '.' . $operacion;
        $permitido = in_array($permiso, $ARRAY_permisos_publicos, true);
        if (!$permitido) {
            utils::report_error('Permiso denegado.', ['permiso' => $permiso]);
        }
        return $permitido;
    }
}
