import OpenAI from 'openai';

interface ToolCallOptions {
  threadId: string;
  runId: string;
  toolCalls: any[];
}

interface PhoneInfo {
  formatted: string;
  countryCode: string;
  nationalNumber: string;
  isValid: boolean;
  country: string;
}

// Phone number validation and formatting
function formatPhoneNumber(phone: string): PhoneInfo {
  if (!phone) {
    return {
      formatted: '',
      countryCode: '',
      nationalNumber: '',
      isValid: false,
      country: 'unknown',
    };
  }

  // Clean the phone number: remove all non-numeric characters except +
  let cleanPhone = phone.replace(/[^\d+]/g, '');

  // Remove leading + if present for processing
  const hasPlus = cleanPhone.startsWith('+');
  if (hasPlus) {
    cleanPhone = cleanPhone.substring(1);
  }

  // Define country patterns and rules
  const countryRules = [
    // USA/Canada (+1)
    {
      codes: ['1'],
      minLength: 11, // 1 + 10 digits
      maxLength: 11,
      country: 'USA/Canada',
      format: (num: string) => `+1${num.substring(1)}`,
    },
    // Peru (+51)
    {
      codes: ['51'],
      minLength: 11, // 51 + 9 digits
      maxLength: 11,
      country: 'Peru',
      format: (num: string) => `+51${num.substring(2)}`,
    },
    // Mexico (+52)
    {
      codes: ['52'],
      minLength: 12, // 52 + 10 digits
      maxLength: 13, // 52 + 11 digits (with area code)
      country: 'Mexico',
      format: (num: string) => `+52${num.substring(2)}`,
    },
    // Colombia (+57)
    {
      codes: ['57'],
      minLength: 12, // 57 + 10 digits
      maxLength: 12,
      country: 'Colombia',
      format: (num: string) => `+57${num.substring(2)}`,
    },
    // Spain (+34)
    {
      codes: ['34'],
      minLength: 11, // 34 + 9 digits
      maxLength: 11,
      country: 'Spain',
      format: (num: string) => `+34${num.substring(2)}`,
    },
  ];

  // Try to match with existing country code
  for (const rule of countryRules) {
    for (const code of rule.codes) {
      if (
        cleanPhone.startsWith(code) &&
        cleanPhone.length >= rule.minLength &&
        cleanPhone.length <= rule.maxLength
      ) {
        return {
          formatted: rule.format(cleanPhone),
          countryCode: `+${code}`,
          nationalNumber: cleanPhone.substring(code.length),
          isValid: true,
          country: rule.country,
        };
      }
    }
  }

  // If no country code detected, try to infer by length
  const lengthRules = [
    // 10 digits - likely USA without country code
    {
      length: 10,
      defaultCountry: 'USA',
      format: (num: string) => `+1${num}`,
    },
    // 9 digits - likely Peru without country code
    {
      length: 9,
      defaultCountry: 'Peru',
      format: (num: string) => `+51${num}`,
    },
    // 11 digits - could be USA with 1 prefix
    {
      length: 11,
      defaultCountry: 'USA',
      format: (num: string) => (num.startsWith('1') ? `+${num}` : `+1${num}`),
    },
  ];

  for (const rule of lengthRules) {
    if (cleanPhone.length === rule.length) {
      return {
        formatted: rule.format(cleanPhone),
        countryCode: rule
          .format(cleanPhone)
          .substring(0, rule.format(cleanPhone).length - cleanPhone.length),
        nationalNumber: cleanPhone,
        isValid: true,
        country: rule.defaultCountry,
      };
    }
  }

  // If nothing matches, default to USA format if it looks reasonable
  if (cleanPhone.length >= 10) {
    return {
      formatted: `+1${cleanPhone}`,
      countryCode: '+1',
      nationalNumber: cleanPhone,
      isValid: false, // Mark as potentially invalid
      country: 'USA (assumed)',
    };
  }

  // Invalid phone number
  return {
    formatted: cleanPhone,
    countryCode: '',
    nationalNumber: cleanPhone,
    isValid: false,
    country: 'unknown',
  };
}

// Function to send SMS with proper phone formatting using Twilio API
async function sendSMS(
  phone: string,
  message: string,
): Promise<{ success: boolean; phoneInfo: PhoneInfo; error?: string }> {
  try {
    const phoneInfo = formatPhoneNumber(phone);

    if (!phoneInfo.isValid) {
      console.warn(
        `Phone number validation warning: ${phone} -> ${phoneInfo.formatted} (${phoneInfo.country})`,
      );
    }

    // Twilio configuration from environment variables
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFromNumber = process.env.TWILIO_FROM_NUMBER;

    if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
      throw new Error(
        'Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER environment variables.',
      );
    }

    console.log(
      `Sending SMS to ${phoneInfo.formatted} (${phoneInfo.country}): ${message}`,
    );
    console.log(`Phone details:`, {
      original: phone,
      formatted: phoneInfo.formatted,
      country: phoneInfo.country,
      countryCode: phoneInfo.countryCode,
      nationalNumber: phoneInfo.nationalNumber,
      isValid: phoneInfo.isValid,
    });

    // Twilio API endpoint
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;

    // Prepare request body
    const formData = new URLSearchParams();
    formData.append('To', phoneInfo.formatted);
    formData.append('From', twilioFromNumber);
    formData.append('Body', message);

    // Make request to Twilio API
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Basic ' +
          Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString(
            'base64',
          ),
      },
      body: formData.toString(),
    });

    if (response.status === 201) {
      const twilioResponse = await response.json();
      console.log('SMS sent successfully:', {
        sid: twilioResponse.sid,
        to: twilioResponse.to,
        status: twilioResponse.status,
      });

      return {
        success: true,
        phoneInfo,
      };
    } else {
      const errorResponse = await response.text();
      console.error('Twilio API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorResponse,
      });

      return {
        success: false,
        phoneInfo,
        error: `Twilio API error: ${response.status} ${response.statusText}`,
      };
    }
  } catch (error) {
    console.error('SMS sending failed:', error);
    return {
      success: false,
      phoneInfo: formatPhoneNumber(phone),
      error: error.message,
    };
  }
}

// Function to send email using Mailgun API
async function sendEmail(args: any): Promise<boolean> {
  try {
    const { name, client_phone, company_name } = args;
    const phoneInfo = formatPhoneNumber(client_phone);

    // Mailgun configuration from environment variables
    const mailgunApiKey = process.env.MAILGUN_API_KEY;
    const mailgunDomain = process.env.MAILGUN_DOMAIN;
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@yourdomain.com';

    if (!mailgunApiKey || !mailgunDomain) {
      throw new Error(
        'Mailgun credentials not configured. Please set MAILGUN_API_KEY and MAILGUN_DOMAIN environment variables.',
      );
    }

    // Format phone number for display
    const formattedPhone = phoneInfo.formatted.replace(
      /^(\+?\d{1,3})(\d{3})(\d{3})(\d{4})$/,
      '$1 $2 $3 $4',
    );

    // Email subject and HTML content
    const subject = `📅 New Client Appointment Request - ${company_name || 'ChatBot'}`;

    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, sans-serif;
            background-color: #f5f5f5;
            margin: 20px;
        }
        .card {
            background: white;
            border-radius: 10px;
            padding: 25px;
            max-width: 600px;
            margin: 0 auto;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            margin: 0 0 20px 0;
            padding-bottom: 10px;
            border-bottom: 2px solid #3498db;
        }
        .info-item {
            margin: 15px 0;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .label {
            color: #7f8c8d;
            font-weight: 600;
            display: block;
            margin-bottom: 5px;
        }
        .value {
            color: #2c3e50;
            font-size: 16px;
        }
        .company {
            background: #3498db;
            color: white;
            padding: 8px 15px;
            border-radius: 20px;
            display: inline-block;
            margin-top: 10px;
        }
        .phone-info {
            background: #e8f5e8;
            border-left: 4px solid #10B981;
        }
        .country-badge {
            background: #10B981;
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            margin-left: 10px;
        }
    </style>
</head>
<body>
    <div class="card">
        <h1>📅 New Appointment Request</h1>
        
        <div class="info-item">
            <span class="label">Client Name</span>
            <span class="value">${name || 'Not provided'}</span>
        </div>
        
        <div class="info-item phone-info">
            <span class="label">Contact Phone</span>
            <span class="value">
                📱 ${formattedPhone}
                <span class="country-badge">${phoneInfo.country}</span>
            </span>
            <div style="font-size: 12px; color: #666; margin-top: 5px;">
                Original: ${client_phone} → Formatted: ${phoneInfo.formatted}
            </div>
        </div>`;

    if (company_name) {
      htmlContent += `
        <div class="info-item">
            <span class="label">Company</span>
            <span class="company">🏢 ${company_name}</span>
        </div>`;
    }

    htmlContent += `
        <div class="info-item">
            <span class="label">Request Details</span>
            <div class="value">
                <strong>Phone Status:</strong> ${phoneInfo.isValid ? '✅ Valid' : '⚠️ Needs verification'}<br>
                <strong>Country Code:</strong> ${phoneInfo.countryCode}<br>
                <strong>Source:</strong> ChatBot Assistant
            </div>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
            <strong>⏰ Next Steps:</strong>
            <ol style="margin: 10px 0 0 0;">
                <li>Contact the client at ${formattedPhone}</li>
                <li>Confirm appointment details</li>
                <li>Schedule in your calendar system</li>
            </ol>
        </div>
    </div>
</body>
</html>`;

    console.log(`Sending email notification for appointment request:`, {
      name,
      phone: client_phone,
      formattedPhone: phoneInfo.formatted,
      phoneCountry: phoneInfo.country,
      company: company_name,
      to: adminEmail,
    });

    // Mailgun API endpoint
    const mailgunUrl = `https://api.mailgun.net/v3/${mailgunDomain}/messages`;

    // Prepare form data
    const formData = new URLSearchParams();
    formData.append('from', `ChatBot Notifications <noreply@${mailgunDomain}>`);
    formData.append('to', adminEmail);
    formData.append('subject', subject);
    formData.append('html', htmlContent);

    // Also send plain text version
    const textContent = `
New Appointment Request

Client Name: ${name || 'Not provided'}
Contact Phone: ${formattedPhone} (${phoneInfo.country})
Company: ${company_name || 'Not specified'}

Phone Details:
- Original: ${client_phone}
- Formatted: ${phoneInfo.formatted}
- Country: ${phoneInfo.country}
- Valid: ${phoneInfo.isValid ? 'Yes' : 'No'}

Please contact the client to confirm appointment details.
`;
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
      console.log('Email sent successfully:', {
        id: mailgunResponse.id,
        message: mailgunResponse.message,
      });
      return true;
    } else {
      const errorResponse = await response.text();
      console.error('Mailgun API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorResponse,
      });
      return false;
    }
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
}

export const handleToolCallsUseCase = async (
  openai: OpenAI,
  options: ToolCallOptions,
): Promise<void> => {
  const { threadId, runId, toolCalls } = options;

  const toolOutputs = [];

  for (const toolCall of toolCalls) {
    try {
      const args = JSON.parse(toolCall.function.arguments);

      // Handle different function types
      if (
        toolCall.function.name === 'send_confirmation_sms' ||
        toolCall.function.name === 'book_appointment' ||
        toolCall.function.name === 'schedule_appointment'
      ) {
        // Get phone number from args
        const phoneNumber = args.client_phone || args.phone || args.phoneNumber;

        if (!phoneNumber) {
          throw new Error('No phone number provided in tool call arguments');
        }

        // Format phone number and create personalized SMS message
        const phoneInfo = formatPhoneNumber(phoneNumber);
        const customerName = args.name || 'valued customer';

        // Customize message based on country
        let smsMessage: string;
        const baseMessage = `${customerName}! Gracias por usar nuestro ChatBot.`;

        if (phoneInfo.country.includes('Peru')) {
          smsMessage = `¡Hola ${baseMessage} Nos pondremos en contacto contigo pronto.`;
        } else if (phoneInfo.country.includes('Mexico')) {
          smsMessage = `¡Hola ${baseMessage} Te contactaremos pronto.`;
        } else if (phoneInfo.country.includes('Spain')) {
          smsMessage = `¡Hola ${baseMessage} Te contactaremos en breve.`;
        } else {
          // Default English for USA/Canada or unknown
          smsMessage = `Hello ${customerName}! Thank you for using our ChatBot. We will get in touch with you soon.`;
        }

        // Send SMS with formatted phone number
        const smsResult = await sendSMS(phoneInfo.formatted, smsMessage);

        // Send admin email notification
        const emailSuccess = await sendEmail({
          ...args,
          client_phone: phoneInfo.formatted, // Use formatted phone in email
          phone_info: phoneInfo, // Include phone info for admin
        });

        toolOutputs.push({
          tool_call_id: toolCall.id,
          output: JSON.stringify({
            sms_delivered: smsResult.success,
            email_sent: emailSuccess,
            phone_formatted: phoneInfo.formatted,
            phone_country: phoneInfo.country,
            phone_valid: phoneInfo.isValid,
            original_phone: phoneNumber,
            message: smsResult.success
              ? 'Appointment request processed successfully'
              : `SMS failed: ${smsResult.error}`,
          }),
        });
      } else {
        // Handle other tool types
        toolOutputs.push({
          tool_call_id: toolCall.id,
          output: JSON.stringify({
            success: true,
            message: `Function ${toolCall.function.name} executed`,
          }),
        });
      }
    } catch (error) {
      console.error(`Error processing tool call ${toolCall.id}:`, error);
      toolOutputs.push({
        tool_call_id: toolCall.id,
        output: JSON.stringify({
          success: false,
          error: error.message,
        }),
      });
    }
  }

  // Submit tool outputs to OpenAI
  await openai.beta.threads.runs.submitToolOutputs(threadId, runId, {
    tool_outputs: toolOutputs,
  });
};
