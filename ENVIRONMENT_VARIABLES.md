# Environment Variables Configuration

This document lists all the required environment variables for the chat backend application.

## Required Variables

### OpenAI Configuration
```
OPEN_API_KEY_API=sk-proj-your_actual_openai_key_here
```

### Database Configuration
```
DATABASE_URL=mongodb://localhost:27017/your_database_name
```

### Twilio SMS Configuration
```
TWILIO_ACCOUNT_SID=AC_your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_FROM_NUMBER=+1234567890
```

### Mailgun Email Configuration
```
MAILGUN_API_KEY=key-your_mailgun_api_key_here
MAILGUN_DOMAIN=your_domain.mailgun.org
ADMIN_EMAIL=admin@yourdomain.com
```

### Application Configuration
```
PORT=3000
NODE_ENV=development
```

## How to Configure

1. **Create `.env` file** in the `chat-backend` directory
2. **Copy the variables** from above and replace with your actual values
3. **Get Twilio credentials** from your Twilio Console:
   - Account SID: Found on your Twilio Console Dashboard
   - Auth Token: Found on your Twilio Console Dashboard  
   - From Number: A phone number purchased from Twilio
4. **Get Mailgun credentials** from your Mailgun Dashboard:
   - API Key: Found in your Mailgun Dashboard → API Keys
   - Domain: A domain you've added to Mailgun (can be sandbox for testing)
   - Admin Email: Where you want to receive appointment notifications

## Twilio Setup Instructions

1. **Sign up** at [twilio.com](https://www.twilio.com)
2. **Verify your account** and add your personal phone number
3. **Purchase a phone number** for sending SMS
4. **Get your credentials** from the Console Dashboard:
   - Account SID (starts with "AC...")
   - Auth Token (keep this secret!)
   - Phone number (format: +1234567890)

## Mailgun Setup Instructions

1. **Sign up** at [mailgun.com](https://www.mailgun.com)
2. **Verify your account** and add your domain (or use sandbox for testing)
3. **Get your API credentials** from Dashboard → API Keys:
   - Private API Key (starts with "key-...")
   - Domain name (e.g., "sandbox123.mailgun.org" or "yourdomain.com")
4. **Set admin email** where you want to receive appointment notifications

## Example .env file
```
OPEN_API_KEY_API=sk-proj-your_actual_openai_key_here
DATABASE_URL=mongodb://localhost:27017/chatapp
TWILIO_ACCOUNT_SID=AC_your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_FROM_NUMBER=+1234567890
MAILGUN_API_KEY=key-your_mailgun_api_key_here
MAILGUN_DOMAIN=sandbox123.mailgun.org
ADMIN_EMAIL=admin@yourdomain.com
PORT=3000
NODE_ENV=development
```

## Security Notes

- ⚠️ **Never commit** `.env` files to version control
- 🔒 **Keep Auth Token secret** - treat it like a password
- 🌐 **Use different credentials** for development vs production
- 📱 **Test with your own number first** before going live

## Testing SMS & Email Functionality

The system will automatically:
1. **Format phone numbers** based on country detection
2. **Send personalized SMS messages** in the appropriate language
3. **Send detailed email notifications** to admins with styled HTML
4. **Log detailed information** about phone formatting and delivery
5. **Handle errors gracefully** with proper error messages

### Email Features:
- 📧 **Beautiful HTML emails** with professional styling
- 📱 **Phone number validation** details included
- 🌍 **Country detection** information displayed
- 📋 **Action items** for follow-up included
- 📄 **Plain text fallback** for compatibility

Supported countries:
- 🇺🇸 USA/Canada (+1)
- 🇵🇪 Peru (+51)  
- 🇲🇽 Mexico (+52)
- 🇨🇴 Colombia (+57)
- 🇪🇸 Spain (+34) 