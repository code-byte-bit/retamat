USE retamat;
CREATE TABLE IF NOT EXISTS practicas (
 id VARCHAR(100) PRIMARY KEY,
 usuario_id VARCHAR(100) NOT NULL,
 leccion_id VARCHAR(60) NOT NULL,
 estado VARCHAR(16) NOT NULL DEFAULT 'pendiente',
 preguntas LONGTEXT NOT NULL,
 respuestas LONGTEXT NOT NULL,
 revision INT UNSIGNED NOT NULL DEFAULT 0,
 aciertos TINYINT UNSIGNED NULL,
 creada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 actualizada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_practicas_usuario_leccion (usuario_id,leccion_id,estado,creada),
 CONSTRAINT fk_practicas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
