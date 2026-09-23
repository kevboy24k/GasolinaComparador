<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/utils.php';
require_once __DIR__ . '/security.php';
require_once __DIR__ . '/bitacora.php';

$clase = isset($_POST['table']) ? trim((string) $_POST['table']) : '';
$operacion = isset($_POST['operation']) ? trim((string) $_POST['operation']) : '';
$fields = isset($_POST['fields']) ? trim((string) $_POST['fields']) : '';

try {
    if (!preg_match('/^[a-z_]+$/', $clase) || !preg_match('/^[a-z_]+$/', $operacion)) {
        utils::report_error('Solicitud AJAX con clase u operación inválida.', ['clase' => $clase, 'operacion' => $operacion]);
        throw new RuntimeException('Solicitud inválida.');
    }
    if (!security::validate_permission($clase, $operacion)) {
        throw new RuntimeException('No tiene permiso para realizar esta operación.');
    }

    $archivo_clase = dirname(__DIR__) . '/entities/' . $clase . '.php';
    if (!is_file($archivo_clase)) {
        utils::report_error('No se encontró la entidad solicitada.', ['clase' => $clase]);
        throw new RuntimeException('La opción solicitada no está disponible.');
    }
    require_once $archivo_clase;
    if (!class_exists($clase)) {
        utils::report_error('La clase de entidad no existe.', ['clase' => $clase]);
        throw new RuntimeException('La configuración de la opción no es válida.');
    }

    $_CLASE = new $clase();
    if (!method_exists($_CLASE, $operacion)) {
        utils::report_error('La operación no existe en la entidad.', ['clase' => $clase, 'operacion' => $operacion]);
        throw new RuntimeException('La operación solicitada no está disponible.');
    }
    $data = $_CLASE->$operacion($fields);
    bitacora::registrar($clase, $operacion, 'exito');
    echo json_encode(['ok' => true, 'data' => $data], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $error) {
    utils::report_error('Error en crud.', ['mensaje' => $error->getMessage(), 'clase' => $clase, 'operacion' => $operacion]);
    bitacora::registrar($clase ?: 'desconocida', $operacion ?: 'desconocida', 'error');
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => $error->getMessage()], JSON_UNESCAPED_UNICODE);
}
