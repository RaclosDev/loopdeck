// Pinta el fondo claro antes de que cargue la app si el usuario eligió el tema claro.
try {
  if (localStorage.getItem('loopdeck_theme') === 'light') {
    document.documentElement.classList.add('boot-light');
  }
} catch {
  /* almacenamiento no disponible: se queda el fondo oscuro */
}
