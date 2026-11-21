// Pinta el fondo claro antes de que cargue la app si el usuario eligió el tema claro, o si llega
// sin sesión a la portada o a /login, que son de papel claro.
try {
  const publicPage =
    !localStorage.getItem('loopdeck_jwt_token') && !location.pathname.startsWith('/demo');
  if (localStorage.getItem('loopdeck_theme') === 'light' || publicPage) {
    document.documentElement.classList.add('boot-light');
  }
} catch {
  /* almacenamiento no disponible: se queda el fondo oscuro */
}
