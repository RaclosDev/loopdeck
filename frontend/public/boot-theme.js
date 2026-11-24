// Pinta el fondo de papel antes de que cargue la app: es el tema por defecto, igual que la
// portada. Solo se queda oscuro si el usuario eligió el tema oscuro en Configuración.
// La demo arranca siempre en oscuro.
if (!/^\/demo(\/|$)/.test(location.pathname)) {
  try {
    if (localStorage.getItem('loopdeck_theme') !== 'dark') {
      document.documentElement.classList.add('boot-light');
    }
  } catch {
    document.documentElement.classList.add('boot-light');
  }
}
