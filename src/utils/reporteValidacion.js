/**
 * Genera el contenido HTML para el reporte de validación imprimible
 * @param {Object} uploadDetails - Detalles del archivo cargado
 * @param {Object} validationResults - Resultados de la validación
 * @param {boolean} hasErrors - Indica si hay errores
 * @param {boolean} hasWarnings - Indica si hay advertencias
 * @returns {string} Contenido HTML del reporte
 */
export function generarReporteValidacionHTML(uploadDetails, validationResults, hasErrors, hasWarnings) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Reporte de Validación - ${uploadDetails?.nombre_archivo || 'Archivo'}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          color: #333;
        }
        .header {
          border-bottom: 3px solid #1976d2;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        h1 {
          color: #1976d2;
          margin: 0 0 10px 0;
          font-size: 24px;
        }
        .info-section {
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
        }
        .info-label {
          font-weight: bold;
          color: #555;
        }
        .summary {
          display: flex;
          gap: 15px;
          margin-bottom: 20px;
        }
        .summary-card {
          flex: 1;
          padding: 15px;
          border-radius: 5px;
          text-align: center;
        }
        .summary-card.success {
          background-color: #e8f5e9;
          border: 2px solid #4caf50;
        }
        .summary-card.warning {
          background-color: #fff3e0;
          border: 2px solid #ff9800;
        }
        .summary-card.error {
          background-color: #ffebee;
          border: 2px solid #f44336;
        }
        .summary-number {
          font-size: 32px;
          font-weight: bold;
          margin: 10px 0;
        }
        .summary-label {
          font-size: 14px;
          color: #666;
        }
        .section {
          margin-bottom: 30px;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 15px;
          padding: 10px;
          border-radius: 5px;
        }
        .section-title.error {
          background-color: #ffebee;
          color: #c62828;
        }
        .section-title.warning {
          background-color: #fff3e0;
          color: #ef6c00;
        }
        .item {
          padding: 10px;
          margin-bottom: 10px;
          border-left: 4px solid;
          background-color: #fafafa;
        }
        .item.error {
          border-left-color: #f44336;
        }
        .item.warning {
          border-left-color: #ff9800;
        }
        .item-title {
          font-weight: bold;
          margin-bottom: 5px;
        }
        .item-subtitle {
          font-size: 12px;
          color: #666;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          font-size: 12px;
          color: #999;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📋 Reporte de Validación de Archivo</h1>
        <p><strong>Archivo:</strong> ${uploadDetails?.nombre_archivo || 'N/A'}</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-AR')}</p>
      </div>

      <div class="info-section">
        <h2 style="margin-top: 0; font-size: 16px; color: #1976d2;">Información del Archivo</h2>
        <div class="info-row">
          <span class="info-label">Cantidad de Agentes:</span>
          <span>${uploadDetails?.empleados || uploadDetails?.cantidad_registros || 0}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Remuneración 1:</span>
          <span>${uploadDetails?.rem1 || '0'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Remuneración 2:</span>
          <span>${uploadDetails?.rem2 || '0'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Remuneración 3:</span>
          <span>${uploadDetails?.rem3 || '0'}</span>
        </div>
      </div>

      <div class="summary">
        <div class="summary-card success">
          <div>✓</div>
          <div class="summary-number">${validationResults?.registros_validos || 0}</div>
          <div class="summary-label">Registros Válidos</div>
        </div>
        <div class="summary-card warning">
          <div>⚠</div>
          <div class="summary-number">${validationResults?.registros_advertencias || 0}</div>
          <div class="summary-label">Con Advertencias</div>
        </div>
        <div class="summary-card error">
          <div>✖</div>
          <div class="summary-number">${validationResults?.registros_errores || 0}</div>
          <div class="summary-label">Con Errores</div>
        </div>
      </div>

      ${hasErrors ? `
      <div class="section">
        <div class="section-title error">❌ Errores Encontrados (${validationResults.errores?.length || 0})</div>
        ${validationResults.errores?.map((error, index) => `
          <div class="item error">
            <div class="item-title">${index + 1}. ${error.mensaje || error.message || 'Error desconocido'}</div>
            ${error.linea ? `<div class="item-subtitle">Línea: ${error.linea}${error.columna ? ` | Columna: ${error.columna}` : ''}</div>` : ''}
          </div>
        `).join('')}
      </div>
      ` : ''}

      ${hasWarnings ? `
      <div class="section">
        <div class="section-title warning">⚠ Advertencias (${validationResults.advertencias?.length || 0})</div>
        ${validationResults.advertencias?.map((warning, index) => `
          <div class="item warning">
            <div class="item-title">${index + 1}. ${warning.mensaje || warning.message || 'Advertencia desconocida'}</div>
            ${warning.linea ? `<div class="item-subtitle">Línea: ${warning.linea}${warning.columna ? ` | Columna: ${warning.columna}` : ''}</div>` : ''}
          </div>
        `).join('')}
      </div>
      ` : ''}

      ${!hasErrors && !hasWarnings ? `
      <div class="section">
        <div style="text-align: center; padding: 40px; color: #4caf50;">
          <div style="font-size: 48px;">✓</div>
          <div style="font-size: 24px; font-weight: bold; margin-top: 10px;">Validación Exitosa</div>
          <div style="margin-top: 10px;">No se encontraron errores ni advertencias</div>
        </div>
      </div>
      ` : ''}

      <div class="footer">
        <p>Documento generado automáticamente por el Sistema de Seguridad Social</p>
        <p>Este reporte explica por qué el archivo ${hasErrors ? 'no fue procesado' : 'fue validado correctamente'}</p>
      </div>
    </body>
    </html>
  `;
}
