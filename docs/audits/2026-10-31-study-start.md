# Inicio de repaso · 31 de octubre de 2026

Se observó en los logs de producción una petición `GET /api/decks/{deckId}/study/batch` de 1928 ms (13:09:48 UTC). Esa muestra confirma una espera del servidor; no identifica por sí sola si corresponde a conexión, CPU o consultas. No se han usado credenciales de usuarios para medir sus mazos.

El cliente esperaba a cargar la ruta de estudio antes de solicitar el primer bloque. Además, el centro importaba el visor DOCX y sus dependencias aunque no se abriera. Ahora prepara el módulo de estudio y un único primer bloque del mazo seleccionado desde el centro, en paralelo con los recuentos. El visor se carga solo al abrirlo.

La preparación está separada por cuenta, mazo y orden; caduca a los diez segundos y se consume una sola vez. Ediciones, altas y borrados invalidan los datos preparados. Bloques posteriores, reintentos y deshacer fuerzan lectura nueva. Un fallo de preparación no bloquea el centro ni sustituye el tratamiento normal de errores al entrar.

Prueba controlada local con una latencia API artificial de 400 ms, tres repeticiones: entrada directa 1010/995/1040 ms; entrada tras preparar 64/62/78 ms. Medianas 1010 y 64 ms. Son tiempos sintéticos de navegación local, no una promesa de tiempo en producción. La precarga aprovecha el tiempo que se dedica a elegir el modo; si se entra directamente o se pulsa antes de terminar, continúa siendo necesario esperar al servidor.

Validación: regresiones de preparación, caducidad, invalidación tras edición y recarga después de revisión; suites de frontend y navegador, build, lint y Docker. La consulta del backend y las limitaciones del alojamiento permanecen: esta corrección elimina la espera evitable del flujo de entrada, sin afirmar que haya reducido el tiempo de la consulta.
