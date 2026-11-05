USE retamat;
CREATE TABLE IF NOT EXISTS grupos (
 id VARCHAR(100) PRIMARY KEY,
 docente_id VARCHAR(100) NOT NULL,
 nombre VARCHAR(80) NOT NULL,
 descripcion VARCHAR(1000) NOT NULL DEFAULT '',
 codigo CHAR(12) NOT NULL UNIQUE,
 inscripciones_abiertas BOOLEAN NOT NULL DEFAULT TRUE,
 creada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_grupos_docente (docente_id,creada),
 CONSTRAINT fk_grupos_docente FOREIGN KEY (docente_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS integrantes_grupo (
 grupo_id VARCHAR(100) NOT NULL,
 usuario_id VARCHAR(100) NOT NULL,
 fecha_ingreso TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (grupo_id,usuario_id),
 INDEX idx_integrantes_usuario (usuario_id),
 CONSTRAINT fk_integrantes_grupo FOREIGN KEY (grupo_id) REFERENCES grupos(id),
 CONSTRAINT fk_integrantes_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
