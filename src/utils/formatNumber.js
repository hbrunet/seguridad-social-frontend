export function formatAmount(value, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '';
  const num = Number(value);
  // Use locale that uses '.' thousands and ',' decimals, e.g. 'es-AR'
  return new Intl.NumberFormat('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(num);
}
