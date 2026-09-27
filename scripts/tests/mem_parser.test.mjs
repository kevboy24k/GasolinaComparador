import assert from 'node:assert/strict';
import { extraerPreciosMem } from '../fuentes/mem.mjs';

const htmlActual = `
<h4>Modalidad: autoservicio</h4>
<table><tr><th>Producto</th><th>Precios Monitoreados 16/09/2026</th><th>Precios Monitoreados 21/09/2026</th><th>Diferencia</th></tr>
<tr><td>Gasolina Superior</td><td>Q44.66</td><td>Q44.61</td><td>-Q0.05</td></tr>
<tr><td>Gasolina Regular</td><td>Q42.58</td><td>Q42.58</td><td>Q0.00</td></tr></table>
<p>Tipo de cambio del día: Q7.663</p>
<h4>Modalidad: servicio completo</h4>
<table><tr><th>Producto</th><th>Precios Monitoreados 16/09/2026</th><th>Precios Monitoreados 21/09/2026</th></tr>
<tr><td>Gasolina Superior</td><td>Q45.68</td><td>Q45.74</td></tr>
<tr><td>Gasolina Regular</td><td>Q43.57</td><td>Q43.66</td></tr></table>`;

const actual = extraerPreciosMem(htmlActual);
assert.deepEqual(actual, {
    fecha: '2026-09-21',
    precios: { Superior: 44.61, Regular: 42.58 },
    tipo_cambio: 7.663
});

const htmlAnterior = `
<h4>Autoservicio</h4><table>
<tr><th>Producto</th><th>Monitoreo Anterior: 28 de octubre de 2024</th><th>Monitoreo Actual: 4 de noviembre de 2024</th></tr>
<tr><td>Gasolina Superior</td><td>29.98</td><td>29.00</td></tr>
<tr><td>Gasolina Regular</td><td>28.48</td><td>27.49</td></tr>
</table>`;
const anterior = extraerPreciosMem(htmlAnterior);
assert.equal(anterior.fecha, '2024-11-04');
assert.deepEqual(anterior.precios, { Superior: 29, Regular: 27.49 });

console.log('Parser MEM: pruebas superadas.');

