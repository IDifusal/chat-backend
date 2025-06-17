# Multi-Assistant System Documentation

This document outlines the changes made to implement a multi-assistant system that supports different companies and their respective assistants.

## Overview

The backend has been modified to support multiple companies and their assistants through a configuration-based system. Each company can have multiple assistants, with one designated as the default. The system also includes WordPress integration and validation for API requests.

## Key Features

1. **Company-based Configuration**: Companies and their assistants are defined in a central configuration file
2. **Default Assistant Selection**: Each company has a default assistant that's used automatically
3. **Company-based WordPress Integration**: Different WordPress endpoindots for different companies
4. **Query Parameter Validation**: Validation for company query parameters
5. **Database Storage**: Enhanced database schema to track company and assistant

## Implementation Details

### 1. Configuration System

A new configuration file has been created at `src/config/assistants.config.ts` that defines:

- Companies and their details
- Assistants for each company
- Default assistant for each company
- WordPress integration settings (endpoint and readiness)

```typescript
// Sample configuration structure
export const assistantsConfig = {
  default: {
    name: 'Default Company',
    assistants: {
      main: {
        id: 'asst_sqBNPQPw6UUymJGZr4SFslm7',
        name: 'Main Assistant',
      },
    },
    defaultAssistant: 'main',
    wordpress: {
      isReady: true,
      endpoint: 'https://centromedicolatino.com/wp-json/custom/v1/thread/'
    }
  },
  
  company1: {
    name: 'Company 1',
    assistants: {
      espanglish: {
        id: 'asst_espanglish_id_goes_here',
        name: 'Espanglish Assistant',
        description: 'Assistant that helps with Spanish-English translation',
      },
      support: {
        id: 'asst_support_id_goes_here',
        name: 'Support Assistant',
        description: 'Customer support assistant',
      },
    },
    defaultAssistant: 'espanglish',
    wordpress: {
      isReady: false,
      endpoint: 'https://company1.com/wp-json/custom/v1/thread/'
    }
  },
}
```

### 2. API Changes

The API endpoints have been updated to accept a `company` query parameter, which is used to select the appropriate assistant configuration:

```
POST /gpt/create-thread?company=company1
POST /gpt/user-question?company=company1
POST /gpt/stream-question?company=company1
```

### 3. Database Schema

The Question schema has been updated to store company and assistant information:

```typescript
@Schema({ timestamps: true })
export class Question {
  @Prop({ required: true })
  threadId: string;

  @Prop({ required: true })
  question: string;

  @Prop({ default: 'default' })
  company: string;

  @Prop({ default: null })
  assistant: string;
}
```

### 4. WordPress Integration

The WordPress integration has been enhanced to:
- Support different WordPress endpoints for different companies
- Only send data to WordPress if a company has `isReady: true`
- Include company and assistant information in requests

### 5. Error Handling

Validation has been added to check if a requested company exists, with appropriate error responses:
- For regular endpoints: Returns a 400 Bad Request with an error message
- For streaming endpoints: Returns an SSE message with error details

## How to Use

### 1. Adding a New Company

To add a new company with its assistants:

1. Edit `src/config/assistants.config.ts`
2. Add a new entry to the `assistantsConfig` object with the company's details
3. Define assistants for the company
4. Specify WordPress integration settings

Example:
```typescript
newCompany: {
  name: 'New Company',
  assistants: {
    main: {
      id: 'asst_new_company_assistant_id',
      name: 'New Company Assistant',
    },
  },
  defaultAssistant: 'main',
  wordpress: {
    isReady: false,
    endpoint: 'https://newcompany.com/wp-json/custom/v1/thread/'
  }
}
```

### 2. Calling the API

To use a specific company's assistant, add the `company` query parameter:

```
POST /gpt/stream-question?company=newCompany
```

The backend will:
1. Validate the company parameter
2. Use the default assistant for that company
3. Use company-specific settings (API key, WordPress endpoint)
4. Store company and assistant information in the database

### 3. Enabling WordPress Integration

To enable WordPress integration for a company:

1. Update the company configuration to set `wordpress.isReady` to `true`
2. Ensure the WordPress endpoint is correctly configured

## Technical Notes

1. **Configuration Helpers**: 
   - `getCompanyConfig(company)`: Returns the configuration for a company
   - `getAssistantConfig(company)`: Returns the default assistant config for a company
   - `companyExists(company)`: Checks if a company exists in configuration

2. **OpenAI Client**:
   - Each assistant can have its own API key
   - If not provided, falls back to the default API key

3. **Validation Pipeline**:
   - Added validation pipe to validate DTOs
   - Added class-validator decorators to DTOs

## Package Dependencies

Added the following dependencies:
- `class-validator`: For request validation
- `class-transformer`: For request transformation

To install these dependencies:
```
npm install class-validator class-transformer --save
```

## Future Enhancements

Potential future enhancements to consider:

1. Admin API to manage companies and assistants without code changes
2. Specific logging per company
3. Rate limiting per company
4. Analytics integration for usage tracking by company
5. Custom prompt templates per assistant/company