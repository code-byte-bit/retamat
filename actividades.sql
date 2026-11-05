USE retamat;
CREATE TABLE IF NOT EXISTS asignaciones (
 id VARCHAR(100) PRIMARY KEY,
 grupo_id VARCHAR(100) NOT NULL,
 leccion_id VARCHAR(60) NOT NULL,
 titulo VARCHAR(100) NOT NULL,
 instrucciones VARCHAR(2000) NOT NULL DEFAULT '',
 tipo VARCHAR(10) NOT NULL,
 duracion_min SMALLINT UNSIGNED NULL,
 vence_ms BIGINT UNSIGNED NULL,
 preguntas LONGTEXT NOT NULL,
 creada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_asignaciones_grupo (grupo_id,creada),
 CONSTRAINT fk_asignaciones_grupo FOREIGN KEY (grupo_id) REFERENCES grupos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS entregas (
 id VARCHAR(100) PRIMARY KEY,
 asignacion_id VARCHAR(100) NOT NULL,
 usuario_id VARCHAR(100) NOT NULL,
 estado VARCHAR(16) NOT NULL DEFAULT 'pendiente',
 respuestas LONGTEXT NOT NULL,
 revision INT UNSIGNED NOT NULL DEFAULT 0,
 aciertos TINYINT UNSIGNED NULL,
 inicio_ms BIGINT UNSIGNED NOT NULL,
 limite_ms BIGINT UNSIGNED NULL,
 fin_ms BIGINT UNSIGNED NULL,
 UNIQUE KEY uq_entrega_asignacion_usuario (asignacion_id,usuario_id),
 INDEX idx_entregas_usuario (usuario_id),
 CONSTRAINT fk_entregas_asignacion FOREIGN KEY (asignacion_id) REFERENCES asignaciones(id),
 CONSTRAINT fk_entregas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
