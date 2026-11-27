# Política de Seguridad (Security Policy)

## Modelos Soportados
Actualmente solo se proporciona soporte de seguridad a la rama main de este repositorio.

## Reporte de Vulnerabilidades

Si descubres un problema de seguridad en este proyecto, por favor **NO** crees un issue público.
En su lugar, envía un correo electrónico directamente a:

**Email de contacto:** [raclosdev@gmail.com](mailto:raclosdev@gmail.com)

Intentaremos responder a tu informe en un plazo de 48 horas con una evaluación del problema y, si es necesario, los pasos para su mitigación.

## Modelo de Autenticación

Loopdeck implementa un flujo de seguridad estricto que funciona de la siguiente manera:
1. El usuario se autentica de forma segura y el backend encripta las contraseñas usando BCrypt.
2. El backend emite un JSON Web Token (JWT) firmado en HS256 y un Refresh Token.
3. El JWT de acceso se envía en la respuesta para uso temporal en memoria del cliente.
4. El Refresh Token se guarda hasheado en la base de datos y viaja en una cookie HttpOnly, Secure y SameSite=Lax limitada a `/api/auth`. El Refresh Token rota en cada uso y pertenece a una familia: si se vuelve a presentar uno ya rotado (fuera de una gracia de 30 s para dos pestañas a la vez, con un máximo de 3 sucesores), se revoca toda la familia y responde 401. La sesión se desliza con el uso (30 días sin abrir la app) y nunca supera 60 días desde el inicio de sesión; un job diario borra las caducadas. Cambiar la contraseña, cerrar todas las sesiones o recuperarla por correo revocan todas las familias. `/api/auth/refresh` y `/api/auth/logout` rechazan peticiones de orígenes que no estén en la lista de CORS.
5. Los identificadores de objetos (Decks, Cards) validan siempre la autoría del token para prevenir ataques IDOR.
6. Autenticación e IA tienen límite de peticiones por IP. La IP sale del salto que añade el proxy de confianza (`RATE_LIMIT_TRUSTED_PROXY_HOPS`, 1 por defecto), nunca del primer valor de `X-Forwarded-For`, y la conexión real tiene un tope propio para frenar direcciones falsificadas.
7. Recuperar la contraseña (`/api/auth/password-reset/*`): la petición responde siempre 202 y el envío es asíncrono, así que no revela qué correos existen. El token es aleatorio de 256 bits, de un solo uso, caduca a los 30 minutos y se guarda hasheado; pedir uno nuevo anula los anteriores. Hay límite por IP y por correo. Las cuentas que solo entran con Google no reciben enlace, sino un aviso de que entren con Google.
8. Los cuerpos JSON tienen un tamaño máximo (2 MB; 16 MB en importaciones) y responden 413 si lo superan.

Cualquier vulnerabilidad reportada en relación con el bypass de este flujo, escalada de privilegios (IDOR) o fugas de tokens en logs será tratada con máxima prioridad.
