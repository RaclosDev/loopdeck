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
4. El Refresh Token se almacena en una cookie HttpOnly, y con prefijo __Host- cuando es posible, para mitigar ataques XSS.
5. Los identificadores de objetos (Decks, Cards) validan siempre la autoría del token para prevenir ataques IDOR.

Cualquier vulnerabilidad reportada en relación con el bypass de este flujo, escalada de privilegios (IDOR) o fugas de tokens en logs será tratada con máxima prioridad.
