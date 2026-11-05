USE retamat;
CREATE TABLE IF NOT EXISTS auditoria (
 id VARCHAR(100) PRIMARY KEY,
 actor_id VARCHAR(100) NULL,
 usuario_id VARCHAR(100) NOT NULL,
 accion VARCHAR(40) NOT NULL,
 datos LONGTEXT NOT NULL,
 fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_auditoria_fecha (fecha,id),
 CONSTRAINT fk_auditoria_actor FOREIGN KEY (actor_id) REFERENCES usuarios(id),
 CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;;
