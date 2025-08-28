# 📋 Endpoint de Intake con Resumen IA y Notificaciones

## Descripción

El nuevo endpoint `/intake/submit` permite procesar formularios de contacto/intake, generar resúmenes inteligentes de las conversaciones usando IA, y enviar notificaciones por email a los administradores con un formato atractivo y profesional.

## 🚀 Características

- ✅ **Resumen automático con IA**: Utiliza nuestro use case `summarizeConversationUseCase` 
- ✅ **Notificaciones por email**: Emails HTML responsivos y atractivos
- ✅ **Soporte multi-empresa**: Configuración por empresa
- ✅ **Validaciones robustas**: Validación de datos de entrada
- ✅ **Manejo de errores**: Respuestas consistentes
- ✅ **Endpoint de prueba**: Para verificar configuración

## 📍 Endpoints

### POST `/intake/submit`

Procesa un formulario de intake y envía notificaciones.

**Query Parameters:**
- `company` (opcional): Identificador de la empresa

**Body (JSON):**
```typescript
{
  // Información requerida del cliente
  "clientName": "Juan Pérez",                    // ✅ Requerido
  "clientEmail": "juan@example.com",             // ⚠️ Email o teléfono requerido
  "clientPhone": "+1234567890",                  // ⚠️ Email o teléfono requerido
  
  // Contenido de la solicitud (al menos uno requerido)
  "subject": "Consulta sobre servicios",         // ⚠️ Opcional
  "message": "Necesito más información...",      // ⚠️ Opcional
  "conversation": [                              // ⚠️ Opcional
    {
      "role": "user",
      "content": "Hola, necesito ayuda",
      "timestamp": "2024-01-15T10:30:00Z"
    },
    {
      "role": "assistant", 
      "content": "¡Hola! Estaré encantado de ayudarte..."
    }
  ],
  
  // Metadatos opcionales
  "company": "laTorreLaw",                       // ➡️ Opcional
  "formType": "consultation",                    // ➡️ Opcional
  "priority": "high",                           // ➡️ Opcional: low, medium, high, urgent
  "source": "website",                          // ➡️ Opcional
  "threadId": "thread_abc123"                   // ➡️ Opcional
}
```

**Respuesta exitosa:**
```json
{
  "status": "success",
  "data": {
    "success": true,
    "submissionId": "uuid-generated-id",
    "message": "Solicitud enviada exitosamente. El equipo será notificado.",
    "summary": {
      "summary": "El usuario Juan Pérez solicita información sobre servicios de consultoría...",
      "wordCount": 45,
      "language": "es",
      "timestamp": "2024-01-15T10:30:00.000Z"
    },
    "notificationSent": true
  }
}
```

### POST `/intake/test-notification`

Endpoint para probar las notificaciones por email.

**Query Parameters:**
- `company` (opcional): Empresa para la prueba

## ⚙️ Configuración

### 1. Variables de Entorno

Configura las siguientes variables en tu `.env`:

```bash
# Mailgun (Recomendado)
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_mailgun_domain

# O Gmail/SMTP alternativo
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=noreply@yourcompany.com
```

### 2. Configuración de Empresa

En `src/config/assistants.config.ts`, agrega la propiedad `notification`:

```typescript
export const assistantsConfig: { [key: string]: CompanyConfig } = {
  default: {
    name: 'Default Company',
    assistant: { /* ... */ },
    wordpress: { /* ... */ },
    notification: {
      email: ['admin@company.com', 'support@company.com'] // ✅ Emails de notificación
    },
  },
  
  laTorreLaw: {
    name: 'La Torre Law',
    assistant: { /* ... */ },
    wordpress: { /* ... */ },
    notification: {
      email: ['legal@latorrellaw.com', 'admin@latorrellaw.com']
    },
  }
};
```

## 📧 Formato del Email

El email incluye:

- **Header atractivo** con gradiente y badges de estado/prioridad
- **Información del cliente** en grid responsivo
- **Resumen inteligente** generado por IA en caja destacada
- **Mensaje original** si está disponible
- **Botones de acción** (responder por email, llamar)
- **Footer informativo** con timestamp

### Prioridades y Badges

- 🚨 **URGENTE** (urgent) - Rojo
- 🔴 **ALTA** (high) - Naranja  
- 🟡 **MEDIA** (medium) - Amarillo
- 🟢 **BAJA** (low) - Verde

## 🔧 Uso desde Frontend

```typescript
// Ejemplo usando el código del frontend proporcionado
export const submitIntakeUseCase = async (
  submission: IntakeSubmission,
  companySlug?: string,
  backendUrl?: string
): Promise<IntakeSubmissionResponse> => {
  try {
    const baseUrl = backendUrl || environment.backendUrl;
    const url = companySlug ? 
      `${baseUrl}/intake/submit?company=${companySlug}` : 
      `${baseUrl}/intake/submit`;
      
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submission),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as IntakeSubmissionResponse;
    return data;
  } catch (error) {
    console.error('Error submitting intake:', error);
    throw new Error('Error submitting intake form');
  }
};
```

## 🧪 Pruebas

### 1. Probar el endpoint básico:

```bash
curl -X POST http://localhost:3000/intake/submit \
  -H "Content-Type: application/json" \
  -d '{
    "clientName": "Test User",
    "clientEmail": "test@example.com",
    "message": "This is a test message",
    "company": "default"
  }'
```

### 2. Probar notificaciones:

```bash
curl -X POST http://localhost:3000/intake/test-notification?company=default
```

## ❗ Validaciones

### Campos requeridos:
- `clientName`: No puede estar vacío
- Email O teléfono: Al menos uno debe estar presente
- Contenido: `conversation`, `message`, o `subject` (al menos uno)

### Validaciones de empresa:
- Si se especifica `company`, debe existir en la configuración
- Si no se especifica, se usa 'default'

## 🔍 Monitoreo y Logs

El sistema registra:
- ✅ Submissions exitosos con ID único
- ❌ Errores de validación
- 📧 Estado de envío de emails
- 🤖 Errores en generación de resúmenes

Los logs aparecen en consola con prefijos identificativos.

## 🚨 Manejo de Errores

- **400 Bad Request**: Validaciones fallidas, datos faltantes
- **500 Internal Server Error**: Errores de procesamiento
- Respuestas consistentes con `status` y `message`
- Graceful degradation: Si falla el email, el submission sigue exitoso

## 📱 Responsive Design

Los emails están optimizados para:
- ✅ Desktop
- ✅ Tablet  
- ✅ Mobile
- ✅ Clientes de email diversos (Gmail, Outlook, etc.)
