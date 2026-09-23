-- Historial local opcional para desacoplar el tablero de las fuentes externas.
-- La carga puede ejecutarse desde la entidad precios_combustibles en una implementación con BD.
CREATE TABLE IF NOT EXISTS historial_combustibles (
    fecha DATE NOT NULL,
    combustible VARCHAR(25) NOT NULL,
    precio DECIMAL(10,4) NOT NULL,
    idp DECIMAL(10,4) NOT NULL,
    iva DECIMAL(10,4) NOT NULL,
    precio_sin_impuestos DECIMAL(10,4) NOT NULL,
    fuente VARCHAR(100) NOT NULL,
    fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (fecha, combustible)
);

CREATE TABLE IF NOT EXISTS historial_petroleo (
    fecha DATE NOT NULL PRIMARY KEY,
    precio_wti_usd DECIMAL(10,4) NOT NULL,
    fuente VARCHAR(100) NOT NULL,
    fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
