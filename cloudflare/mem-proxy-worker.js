const HOSTS_MEM = new Set(['mem.gob.gt', 'www.mem.gob.gt', 'site.mem.gob.gt']);

export default {
    async fetch(request) {
        const solicitud = new URL(request.url);
        const destinoTexto = solicitud.searchParams.get('url');
        if (!destinoTexto) return new Response('Falta el parámetro url.', { status: 400 });

        let destino;
        try {
            destino = new URL(destinoTexto);
        } catch {
            return new Response('URL inválida.', { status: 400 });
        }
        if (destino.protocol !== 'https:' || !HOSTS_MEM.has(destino.hostname)) {
            return new Response('Destino no permitido.', { status: 403 });
        }

        const respuesta = await fetch(destino, {
            headers: {
                Accept: request.headers.get('Accept') || 'application/json,text/html,*/*',
                'User-Agent': 'Mozilla/5.0 (compatible; GasolinaComparador-Comunidad/1.0)'
            },
            cf: { cacheTtl: 300, cacheEverything: true }
        });
        const cabeceras = new Headers(respuesta.headers);
        cabeceras.delete('set-cookie');
        cabeceras.set('Cache-Control', 'public, max-age=300');
        return new Response(respuesta.body, { status: respuesta.status, headers: cabeceras });
    }
};

