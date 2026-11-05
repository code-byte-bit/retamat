-- Consulta de datos de RETAMAT. No crea, modifica ni elimina registros.
USE retamat;
SHOW TABLES;

SELECT 'roles' AS tabla, COUNT(*) AS registros FROM roles
UNION ALL
SELECT 'usuarios', COUNT(*) FROM usuarios
UNION ALL
SELECT 'diagnosticos', COUNT(*) FROM diagnosticos
UNION ALL
SELECT 'practicas', COUNT(*) FROM practicas
UNION ALL
SELECT 'grupos', COUNT(*) FROM grupos
UNION ALL
SELECT 'integrantes_grupo', COUNT(*) FROM integrantes_grupo
UNION ALL
SELECT 'asignaciones', COUNT(*) FROM asignaciones
UNION ALL
SELECT 'entregas', COUNT(*) FROM entregas
UNION ALL
SELECT 'auditoria', COUNT(*) FROM auditoria
UNION ALL SELECT 'espacio_control', COUNT(*) FROM espacio_control
UNION ALL SELECT 'espacio_registros', COUNT(*) FROM espacio_registros
UNION ALL SELECT 'espacio_comandos', COUNT(*) FROM espacio_comandos
UNION ALL SELECT 'archivos', COUNT(*) FROM archivos
UNION ALL SELECT 'recuperaciones', COUNT(*) FROM recuperaciones;

SELECT nombre,correo,rol,activo FROM usuarios ORDER BY nombre;

SELECT u.nombre,d.estado,d.aciertos,d.creada FROM diagnosticos d JOIN usuarios u ON u.id=d.usuario_id ORDER BY d.creada DESC LIMIT 50;

SELECT u.nombre,p.leccion_id,p.estado,p.aciertos,p.creada FROM practicas p JOIN usuarios u ON u.id=p.usuario_id ORDER BY p.creada DESC LIMIT 50;

SELECT nombre,codigo,inscripciones_abiertas FROM grupos ORDER BY nombre;

SELECT g.nombre AS grupo,u.nombre AS estudiante,i.fecha_ingreso FROM integrantes_grupo i JOIN grupos g ON g.id=i.grupo_id JOIN usuarios u ON u.id=i.usuario_id;

SELECT g.nombre AS grupo,a.titulo,a.tipo,a.duracion_min FROM asignaciones a JOIN grupos g ON g.id=a.grupo_id;

SELECT u.nombre,a.titulo,e.estado,e.aciertos FROM entregas e JOIN usuarios u ON u.id=e.usuario_id JOIN asignaciones a ON a.id=e.asignacion_id;

SELECT a.accion,u.nombre AS usuario,a.fecha FROM auditoria a JOIN usuarios u ON u.id=a.usuario_id ORDER BY a.fecha DESC LIMIT 100;

-- Contenido integrado: no muestra contraseñas ni respuestas de exámenes.
SELECT coleccion, COUNT(*) AS registros FROM espacio_registros GROUP BY coleccion;
SELECT revision, importado FROM espacio_control WHERE id=1;
-- Las lecciones, apuntes, salas y preferencias están en espacio_registros.
-- No edites ni vacíes estas tablas manualmente: usa la interfaz de RETAMAT.

-- Solo metadatos de los archivos; evita volcar su contenido binario.
SELECT nombre,mime,tamano,creada FROM archivos ORDER BY creada DESC LIMIT 50;
