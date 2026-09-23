"use strict";

function solicitud_common(fields, table, operation, callback, callback_error) {
    const request = new XMLHttpRequest();
    request.open('POST', 'Intranet/php/WiseTech/crud.php', true);
    request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
    request.onload = function () {
        if (request.status >= 200 && request.status < 300) {
            try {
                const respuesta = JSON.parse(request.responseText);
                if (respuesta.ok) {
                    callback(respuesta.data);
                    return;
                }
                throw new Error(respuesta.error || 'No fue posible completar la operación.');
            } catch (error) {
                if (callback_error) callback_error(error);
            }
        } else if (callback_error) {
            callback_error(new Error('Error de comunicación con el servidor.'));
        }
    };
    request.onerror = function () {
        if (callback_error) callback_error(new Error('No se pudo conectar con el servidor.'));
    };
    request.send('fields=' + encodeURIComponent(fields || '') + '&table=' + encodeURIComponent(table) + '&operation=' + encodeURIComponent(operation));
}

function download_select_options(fields, table, operation, destiny, callback = null, callback_error = null) {
    solicitud_common(fields, table, operation, function (data) {
        document.getElementById(destiny).innerHTML = data;
        if (callback) callback(data);
    }, callback_error);
}

function download_input_value(fields, table, operation, destiny, callback = null, callback_error = null) {
    solicitud_common(fields, table, operation, function (data) {
        document.getElementById(destiny).value = typeof data === 'string' ? data : JSON.stringify(data);
        if (callback) callback(data);
    }, callback_error);
}

function download_div_content(fields, table, operation, destiny, callback = null, do_activate_switch = true, callback_error = null) {
    solicitud_common(fields, table, operation, function (data) {
        document.getElementById(destiny).innerHTML = data;
        if (callback) callback(data);
    }, callback_error);
}

function mostrar_opcion(opcion) {
    download_div_content('', opcion, 'cargar_opcion', 'contenido_principal', function () {
        const jsid = document.getElementById('jsid');
        if (!jsid || !jsid.value) return;
        const script = document.createElement('script');
        script.src = 'Intranet/js/' + jsid.value + '.js';
        script.onload = function () {
            if (typeof window.iniciar_opcion === 'function') window.iniciar_opcion();
        };
        document.body.appendChild(script);
    }, true, function () {
        document.getElementById('contenido_principal').innerHTML = '<p class="error">No se pudo cargar la opción solicitada.</p>';
    });
}

document.addEventListener('click', function (event) {
    const control = event.target.closest('[data-opcion]');
    if (control) mostrar_opcion(control.dataset.opcion);
});
