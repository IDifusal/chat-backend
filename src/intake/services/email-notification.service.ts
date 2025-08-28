import { Injectable } from '@nestjs/common';

export interface EmailNotificationData {
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  subject?: string;
  message?: string;
  summary: string;
  submissionId: string;
  company: string;
  formType?: string;

  source?: string;
}

@Injectable()
export class EmailNotificationService {
  async sendIntakeNotification(
    adminEmails: string[],
    data: EmailNotificationData,
  ): Promise<boolean> {
    try {
      const htmlContent = this.generateEmailHTML(data);
      const subject = this.generateSubject(data);
      const textContent = this.generatePlainText(data);

      // Mailgun configuration from environment variables
      const mailgunApiKey = process.env.MAILGUN_API_KEY;
      const mailgunDomain = process.env.MAILGUN_DOMAIN;

      if (!mailgunApiKey || !mailgunDomain) {
        throw new Error(
          'Mailgun credentials not configured. Please set MAILGUN_API_KEY and MAILGUN_DOMAIN environment variables.',
        );
      }

      // Send email to each admin using Mailgun API (same as handle-tool-calls.use-case.ts)
      let allEmailsSent = true;

      for (const adminEmail of adminEmails) {
        console.log(`Sending intake notification to: ${adminEmail}`);

        // Mailgun API endpoint
        const mailgunUrl = `https://api.mailgun.net/v3/${mailgunDomain}/messages`;

        // Prepare form data
        const formData = new URLSearchParams();
        formData.append(
          'from',
          `ChatBot Notifications <noreply@${mailgunDomain}>`,
        );
        formData.append('to', adminEmail);
        formData.append('subject', subject);
        formData.append('html', htmlContent);
        formData.append('text', textContent);

        // Make request to Mailgun API
        const response = await fetch(mailgunUrl, {
          method: 'POST',
          headers: {
            Authorization:
              'Basic ' + Buffer.from(`api:${mailgunApiKey}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });

        if (response.ok) {
          const mailgunResponse = await response.json();
          console.log('Intake notification email sent successfully:', {
            id: mailgunResponse.id,
            message: mailgunResponse.message,
            to: adminEmail,
          });
        } else {
          const errorResponse = await response.text();
          console.error('Mailgun API error for intake notification:', {
            status: response.status,
            statusText: response.statusText,
            body: errorResponse,
            to: adminEmail,
          });
          allEmailsSent = false;
        }
      }

      return allEmailsSent;
    } catch (error) {
      console.error('Error sending intake notification emails:', error);
      return false;
    }
  }

  private generateSubject(data: EmailNotificationData): string {
    const typeText = data.formType ? ` - ${data.formType.toUpperCase()}` : '';
    return `📋 Nueva Solicitud de Cliente${typeText} - ${data.company}`;
  }

  private generateEmailHTML(data: EmailNotificationData): string {
    const statusBadge =
      '<span style="background: #e3f2fd; color: #1976d2; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500;">NUEVA SOLICITUD</span>';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nueva Solicitud de Cliente</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f8fafc;
            margin: 0;
            padding: 20px;
            line-height: 1.6;
        }
        .container {
            max-width: 700px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .badges {
            margin-top: 15px;
            display: flex;
            justify-content: center;
            gap: 10px;
            flex-wrap: wrap;
        }
        .content {
            padding: 30px;
        }
        .section {
            margin-bottom: 25px;
        }
        .section-title {
            font-size: 16px;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 12px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 5px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .info-item {
            background: #f7fafc;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        .info-label {
            font-size: 12px;
            font-weight: 600;
            color: #718096;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
        }
        .info-value {
            font-size: 14px;
            color: #2d3748;
            font-weight: 500;
        }
        .summary-box {
            background: #fff5f5;
            border: 1px solid #fed7d7;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .summary-title {
            color: #c53030;
            font-weight: 600;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .summary-content {
            color: #2d3748;
            font-size: 14px;
            line-height: 1.6;
        }
        .message-box {
            background: #f0fff4;
            border: 1px solid #c6f6d5;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .action-buttons {
            text-align: center;
            margin: 30px 0;
        }
        .btn {
            display: inline-block;
            padding: 12px 24px;
            background: #667eea;
            color: white !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 0 10px;
        }
        .footer {
            background: #f7fafc;
            padding: 20px 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        .footer-text {
            color: #718096;
            font-size: 12px;
        }
        @media (max-width: 600px) {
            .container { margin: 10px; }
            .content { padding: 20px; }
            .info-grid { grid-template-columns: 1fr; }
            .badges { justify-content: center; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 Nueva Solicitud de Cliente</h1>
            <div class="badges">
                ${statusBadge}
            </div>
        </div>

        <div class="content">
            <!-- Client Information -->
            <div class="section">
                <div class="section-title">📋 Información del Cliente</div>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Nombre</div>
                        <div class="info-value">${data.clientName}</div>
                    </div>
                    ${
                      data.clientEmail
                        ? `
                    <div class="info-item">
                        <div class="info-label">Email</div>
                        <div class="info-value"><a href="mailto:${data.clientEmail}">${data.clientEmail}</a></div>
                    </div>
                    `
                        : ''
                    }
                    ${
                      data.clientPhone
                        ? `
                    <div class="info-item">
                        <div class="info-label">Teléfono</div>
                        <div class="info-value"><a href="tel:${data.clientPhone}">${data.clientPhone}</a></div>
                    </div>
                    `
                        : ''
                    }
                    <div class="info-item">
                        <div class="info-label">ID de Solicitud</div>
                        <div class="info-value">${data.submissionId}</div>
                    </div>
                </div>
            </div>

            <!-- Request Details -->
            <div class="section">
                <div class="section-title">📝 Detalles de la Solicitud</div>
                <div class="info-grid">
                    ${
                      data.subject
                        ? `
                    <div class="info-item">
                        <div class="info-label">Asunto</div>
                        <div class="info-value">${data.subject}</div>
                    </div>
                    `
                        : ''
                    }
                    ${
                      data.formType
                        ? `
                    <div class="info-item">
                        <div class="info-label">Tipo de Formulario</div>
                        <div class="info-value">${data.formType}</div>
                    </div>
                    `
                        : ''
                    }
                    ${
                      data.source
                        ? `
                    <div class="info-item">
                        <div class="info-label">Origen</div>
                        <div class="info-value">${data.source}</div>
                    </div>
                    `
                        : ''
                    }
                    <div class="info-item">
                        <div class="info-label">Empresa</div>
                        <div class="info-value">${data.company}</div>
                    </div>
                </div>
            </div>

            <!-- AI Summary -->
            <div class="section">
                <div class="section-title">🤖 Resumen Inteligente de la Conversación</div>
                <div class="summary-box">
                    <div class="summary-title">
                        <span>💡</span>
                        Resumen Generado por IA
                    </div>
                    <div class="summary-content">${data.summary}</div>
                </div>
            </div>

            <!-- Original Message -->
            ${
              data.message
                ? `
            <div class="section">
                <div class="section-title">💬 Mensaje Original</div>
                <div class="message-box">
                    <div class="summary-content">${data.message.replace(/\n/g, '<br>')}</div>
                </div>
            </div>
            `
                : ''
            }

            <!-- Action Buttons -->
            <div class="action-buttons">
                <a href="mailto:${data.clientEmail}" style="color: white !important;" class="btn">📧 Responder por Email</a>
                ${data.clientPhone ? `<a href="tel:${data.clientPhone}" style="color: white !important;" class="btn">📞 Llamar Cliente</a>` : ''}
            </div>
        </div>

        <div class="footer">
            <div class="footer-text">
                Esta notificación fue generada automáticamente por el sistema de ChatBot de Espanglishmarketing <br>
                Fecha: ${new Date().toLocaleString('es-ES', { timeZone: 'America/Mexico_City' })}
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  private generatePlainText(data: EmailNotificationData): string {
    return `
Nueva Solicitud de Cliente - ${data.company}

INFORMACIÓN DEL CLIENTE:
- Nombre: ${data.clientName}
${data.clientEmail ? `- Email: ${data.clientEmail}` : ''}
${data.clientPhone ? `- Teléfono: ${data.clientPhone}` : ''}
- ID de Solicitud: ${data.submissionId}

DETALLES DE LA SOLICITUD:
${data.subject ? `- Asunto: ${data.subject}` : ''}
${data.formType ? `- Tipo: ${data.formType}` : ''}
${data.source ? `- Origen: ${data.source}` : ''}

RESUMEN INTELIGENTE:
${data.summary}

${
  data.message
    ? `
MENSAJE ORIGINAL:
${data.message}
`
    : ''
}

---
Generado automáticamente el ${new Date().toLocaleString('es-ES')}
    `;
  }
}
