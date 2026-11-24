// Pinta el fondo de papel antes de que cargue la app: es el tema por defecto, igual que la
// portada y la demo. Solo se queda oscuro si el usuario eligió el tema oscuro en Configuración.
try {
  if (localStorage.getItem('loopdeck_theme') !== 'dark') {
    document.documentElement.classList.add('boot-light');
  }
} catch {
  document.documentElement.classList.add('boot-light');
}
