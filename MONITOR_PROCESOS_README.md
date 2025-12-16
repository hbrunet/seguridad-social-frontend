# Monitor de Procesos - Integración con Backend

## 📋 Descripción

El Monitor de Procesos ahora está integrado con los endpoints reales del backend para testing de procesos asíncronos de fusión de datos.

## 🚀 Configuración

### Variables de Entorno

Crear o actualizar el archivo `.env` en la raíz del proyecto:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### Backend Requerido

El backend debe estar corriendo en `http://localhost:5000` con los siguientes endpoints disponibles:

## 🔧 Tipos de Procesos Disponibles

### 1. Test Fusión Rápido (Síncrono)
- **Duración**: 30 segundos
- **Tipo**: Síncrono (responde inmediatamente al completar)
- **Endpoint**: `POST /api/novedades/test/fusion-quick`
- **Uso**: Verificar funcionamiento básico sin esperar mucho

### 2. Test Fusión Rápido (Asíncrono)
- **Duración**: 30 segundos
- **Tipo**: Asíncrono con progreso
- **Endpoint**: `POST /api/novedades/test/fusion-quick-async`
- **Uso**: Verificar sistema de progreso y polling
- **Polling**: Cada 2 segundos a `GET /api/jobs/{job_id}`

### 3. Test Fusión Lento (Asíncrono)
- **Duración**: 2 minutos
- **Tipo**: Asíncrono con progreso
- **Endpoint**: `POST /api/novedades/test/fusion-slow-async`
- **Uso**: Simular proceso real más largo

### 4. Test Error (Asíncrono)
- **Duración**: Variable (falla al 50%)
- **Tipo**: Asíncrono con error intencional
- **Endpoint**: `POST /api/novedades/test/fusion-error-async`
- **Uso**: Verificar manejo de errores

## 📊 Características Implementadas

### En el Frontend

1. **Selector de Tipo de Proceso**: Dropdown con todos los tipos disponibles (simulados + reales)

2. **Campo de Período**: Input para especificar el período del proceso
   - Formato: `YYYY-MM-DD` (ej: `2024-01-01`)
   - Se convierte automáticamente a ISO format para el backend

3. **Tabla de Procesos**: Muestra información en tiempo real
   - ID local del proceso
   - Nombre y tipo
   - Estado (Ejecutando, Completado, Error, etc.)
   - Barra de progreso
   - Tiempo transcurrido
   - Job ID (cuando es un proceso del backend)
   - CPU y Memoria (simulado para procesos locales)
   - Fecha de inicio
   - Acciones disponibles

4. **Polling Automático**: 
   - Los procesos asíncronos consultan su estado cada 2 segundos
   - Se actualiza automáticamente el progreso y estado
   - Se detiene al completar o fallar

5. **Auto-Refresh**: 
   - Actualización automática de la lista cada 3 segundos (configurable)
   - Se puede activar/desactivar con el switch

6. **Dialog de Detalles**:
   - Ver información completa del proceso
   - Job ID del backend
   - Logs en tiempo real
   - Parámetros enviados
   - Mensajes de error (si aplica)

## 🎯 Cómo Usar

1. **Iniciar el Backend**:
   ```bash
   # Asegurarse que el backend esté corriendo en localhost:5000
   ```

2. **Iniciar el Frontend**:
   ```bash
   npm run dev
   ```

3. **Acceder al Monitor**:
   - Navegar a la ruta del Monitor de Procesos en la aplicación

4. **Iniciar un Proceso de Test**:
   - Seleccionar uno de los tipos de test en el dropdown
   - (Opcional) Modificar el período si es necesario
   - Hacer clic en "Iniciar Proceso"
   - El proceso aparecerá en la tabla

5. **Monitorear el Progreso**:
   - La tabla se actualiza automáticamente
   - Para procesos asíncronos, verás el Job ID del backend
   - El progreso se actualiza en tiempo real
   - Los logs muestran cada actualización

6. **Ver Detalles**:
   - Hacer clic en el menú de acciones (tres puntos)
   - Seleccionar "Detalles"
   - Ver información completa incluyendo logs

## 🔍 Estados de Proceso

- **Ejecutando** (azul): Proceso en curso
- **Completado** (verde): Proceso finalizado exitosamente
- **Error** (rojo): Proceso falló
- **Pausado** (amarillo): Proceso pausado (solo para simulados)
- **Detenido** (gris): Proceso detenido manualmente

## 📡 Estructura de Request/Response

### Request a Backend (POST)
```json
{
  "periodo": "2024-01-01T00:00:00"
}
```

### Response Síncrono (200 OK)
```json
{
  "periodo": "2024-01-01T00:00:00",
  "estado": "COMPLETADO",
  "duracion_segundos": 30.5,
  "mensaje": "Test rápido completado para periodo 2024-01"
}
```

### Response Asíncrono (202 Accepted)
```json
{
  "job_id": "guid-generado",
  "message": "Test de fusión iniciado"
}
```

### Polling Response (GET /api/jobs/{job_id})
```json
{
  "job_id": "guid-generado",
  "status": "running",
  "progress": 45,
  "mensaje": "Procesando datos...",
  "estado": "PROCESANDO"
}
```

### Polling Response - Completado
```json
{
  "job_id": "guid-generado",
  "status": "completed",
  "progress": 100,
  "estado": "COMPLETADO",
  "mensaje": "Proceso completado exitosamente"
}
```

### Polling Response - Error
```json
{
  "job_id": "guid-generado",
  "status": "failed",
  "estado": "ERROR",
  "error": "Error simulado al 50%",
  "mensaje": "Proceso falló"
}
```

## 🐛 Troubleshooting

### Error: "Error al llamar al backend"
- Verificar que el backend esté corriendo
- Verificar la URL en `.env` (`VITE_API_BASE_URL`)
- Verificar CORS en el backend

### Error: "Error al consultar estado"
- El polling no puede conectarse al backend
- Verificar que el endpoint `/api/jobs/{job_id}` esté disponible

### El proceso queda en "Ejecutando" indefinidamente
- El backend puede no estar respondiendo al polling
- Verificar logs del backend
- Refrescar la página para limpiar el estado

### No aparecen los tipos de test
- Verificar que la configuración en `procesos.js` incluya los nuevos tipos
- Recargar la página

## 📝 Notas Técnicas

- Los procesos simulados (Importación, Validación, etc.) siguen funcionando localmente
- Los procesos de test (fusion-*) llaman al backend real
- El polling se limpia automáticamente al completar o fallar
- Múltiples procesos pueden ejecutarse simultáneamente
- El estado se mantiene en memoria (se pierde al recargar)

## 🔄 Flujo de Ejecución

```
Usuario → Selecciona Tipo + Período → Clic "Iniciar"
    ↓
Frontend crea proceso local
    ↓
¿Es proceso real?
    ↓ Sí
Frontend → POST al backend
    ↓
¿Es asíncrono?
    ↓ Sí
Inicia polling cada 2s
    ↓
GET /api/jobs/{job_id}
    ↓
Actualiza progreso y estado
    ↓
¿Completado o Error?
    ↓ Sí
Detiene polling
    ↓
Muestra resultado final
```

## 🎨 Mejoras Futuras

- [ ] Persistencia de procesos en localStorage
- [ ] Exportar logs a archivo
- [ ] Filtros avanzados en la tabla
- [ ] Gráficos de rendimiento
- [ ] Notificaciones desktop al completar
- [ ] Cancelar procesos en ejecución (backend)
- [ ] Reintentar procesos fallidos
- [ ] Historial de ejecuciones
