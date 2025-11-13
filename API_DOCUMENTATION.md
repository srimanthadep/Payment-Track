# API Documentation

This document describes the APIs available in Payment-Track.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Base URLs](#base-urls)
- [REST API Endpoints](#rest-api-endpoints)
- [Edge Functions](#edge-functions)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Examples](#examples)

## Overview

Payment-Track uses Supabase as its backend, which provides:
- **Auto-generated REST API** for database tables
- **Edge Functions** for serverless operations
- **Real-time subscriptions** for live data updates
- **Row Level Security (RLS)** for data access control

## Authentication

All API requests require authentication using Supabase JWT tokens.

### Getting an Auth Token

#### Email/Password Login
```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
})
const token = data.session?.access_token
```

#### Phone OTP Login
```javascript
// Step 1: Request OTP
const { error } = await supabase.auth.signInWithOtp({
  phone: '+1234567890'
})

// Step 2: Verify OTP
const { data, error } = await supabase.auth.verifyOtp({
  phone: '+1234567890',
  token: '123456',
  type: 'sms'
})
const token = data.session?.access_token
```

### Using the Token

Include the token in the `Authorization` header:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## Base URLs

- **REST API**: `https://YOUR_PROJECT_REF.supabase.co/rest/v1/`
- **Edge Functions**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/`
- **Realtime**: `wss://YOUR_PROJECT_REF.supabase.co/realtime/v1/`

Replace `YOUR_PROJECT_REF` with your actual Supabase project reference.

## REST API Endpoints

Supabase automatically generates REST endpoints for all database tables.

### Transactions

#### Get All Transactions
```http
GET /rest/v1/transactions
```

**Query Parameters:**
- `select` - Columns to return (default: `*`)
- `order` - Sort order (e.g., `transaction_date.desc`)
- `limit` - Maximum number of records
- `offset` - Number of records to skip
- `user_id` - Filter by user ID (e.g., `user_id=eq.USER_ID`)

**Example:**
```bash
curl -X GET 'https://YOUR_PROJECT_REF.supabase.co/rest/v1/transactions?select=*&order=transaction_date.desc&limit=10' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "portal_id": "uuid",
    "transaction_type": "withdrawal",
    "amount": 10000.00,
    "commission": 200.00,
    "site_fee": 50.00,
    "reference_number": "TXN123456",
    "status": "completed",
    "transaction_date": "2024-11-13T10:00:00Z",
    "card_type": "normal_upi",
    "created_at": "2024-11-13T10:00:00Z"
  }
]
```

#### Get Single Transaction
```http
GET /rest/v1/transactions?id=eq.TRANSACTION_ID&select=*
```

#### Create Transaction
```http
POST /rest/v1/transactions
Content-Type: application/json
```

**Request Body:**
```json
{
  "portal_id": "uuid",
  "transaction_type": "withdrawal",
  "amount": 10000.00,
  "commission": 200.00,
  "site_fee": 50.00,
  "reference_number": "TXN123456",
  "status": "completed",
  "transaction_date": "2024-11-13T10:00:00Z",
  "card_type": "normal_upi"
}
```

#### Update Transaction
```http
PATCH /rest/v1/transactions?id=eq.TRANSACTION_ID
Content-Type: application/json
```

**Request Body:**
```json
{
  "amount": 12000.00,
  "commission": 240.00,
  "status": "completed"
}
```

#### Delete Transaction
```http
DELETE /rest/v1/transactions?id=eq.TRANSACTION_ID
```

### Portals

#### Get All Portals
```http
GET /rest/v1/portals?select=*
```

#### Get Active Portals
```http
GET /rest/v1/portals?is_active=eq.true&select=*
```

#### Create Portal
```http
POST /rest/v1/portals
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "PayMama",
  "default_commission_rate": 2.0,
  "default_site_fee": 50.0,
  "is_active": true
}
```

#### Update Portal
```http
PATCH /rest/v1/portals?id=eq.PORTAL_ID
Content-Type: application/json
```

#### Delete Portal
```http
DELETE /rest/v1/portals?id=eq.PORTAL_ID
```

### User Profiles

#### Get User Profile
```http
GET /rest/v1/profiles?id=eq.USER_ID&select=*
```

#### Update User Profile
```http
PATCH /rest/v1/profiles?id=eq.USER_ID
Content-Type: application/json
```

**Request Body:**
```json
{
  "full_name": "John Doe",
  "phone": "+1234567890"
}
```

### User Roles

#### Get User Role
```http
GET /rest/v1/user_roles?user_id=eq.USER_ID&select=*
```

#### Check if User is Admin
```http
GET /rest/v1/user_roles?user_id=eq.USER_ID&is_admin=eq.true&select=*
```

### Scraping Configs

#### Get Scraping Configs
```http
GET /rest/v1/scraping_configs?user_id=eq.USER_ID&select=*
```

#### Create Scraping Config
```http
POST /rest/v1/scraping_configs
Content-Type: application/json
```

**Request Body:**
```json
{
  "portal_id": "uuid",
  "url": "https://example.com/transactions",
  "extraction_rules": {
    "amount": "\\d+\\.\\d{2}",
    "reference": "REF\\d+"
  },
  "is_active": true
}
```

## Edge Functions

### Scrape Website

Scrapes a website for transaction data and automatically creates transactions.

**Endpoint:** `POST /functions/v1/scrape-website`

**Request Body:**
```json
{
  "configId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transactions created successfully",
  "transactions": [
    {
      "amount": 10000,
      "reference": "TXN123",
      "commission": 200,
      "site_fee": 50
    }
  ]
}
```

**Errors:**
```json
{
  "error": "Config not found or not active"
}
```

### Admin Create User

Creates a new user account (admin only).

**Endpoint:** `POST /functions/v1/admin-create-user`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "full_name": "John Doe",
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

## Error Handling

### HTTP Status Codes

- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `204 No Content` - Request succeeded with no response body
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate)
- `422 Unprocessable Entity` - Validation error
- `500 Internal Server Error` - Server error

### Error Response Format

```json
{
  "error": "Error message",
  "details": "Detailed error information",
  "code": "ERROR_CODE",
  "hint": "Suggestion to fix the error"
}
```

### Common Errors

#### Authentication Error
```json
{
  "error": "JWT expired",
  "code": "PGRST301"
}
```

**Solution:** Refresh your authentication token.

#### Permission Error
```json
{
  "error": "new row violates row-level security policy",
  "code": "42501"
}
```

**Solution:** Check your user permissions and RLS policies.

#### Validation Error
```json
{
  "error": "invalid input syntax for type uuid",
  "hint": "Check the format of your UUID"
}
```

## Rate Limiting

Supabase has the following rate limits:

- **Free Tier**: 500 requests per second
- **Pro Tier**: 2000 requests per second
- **Enterprise**: Custom limits

Rate limit headers:
```
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 499
X-RateLimit-Reset: 1699876800
```

## Examples

### JavaScript/TypeScript (Supabase Client)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://YOUR_PROJECT_REF.supabase.co',
  'YOUR_ANON_KEY'
)

// Get transactions
const { data, error } = await supabase
  .from('transactions')
  .select('*')
  .order('transaction_date', { ascending: false })
  .limit(10)

// Create transaction
const { data, error } = await supabase
  .from('transactions')
  .insert({
    portal_id: 'uuid',
    transaction_type: 'withdrawal',
    amount: 10000,
    commission: 200,
    site_fee: 50
  })

// Update transaction
const { data, error } = await supabase
  .from('transactions')
  .update({ status: 'completed' })
  .eq('id', 'transaction-id')

// Delete transaction
const { data, error } = await supabase
  .from('transactions')
  .delete()
  .eq('id', 'transaction-id')

// Call Edge Function
const { data, error } = await supabase.functions.invoke('scrape-website', {
  body: { configId: 'config-id' }
})
```

### Python

```python
import requests

# Setup
base_url = "https://YOUR_PROJECT_REF.supabase.co/rest/v1"
headers = {
    "apikey": "YOUR_ANON_KEY",
    "Authorization": "Bearer YOUR_ACCESS_TOKEN",
    "Content-Type": "application/json"
}

# Get transactions
response = requests.get(
    f"{base_url}/transactions",
    headers=headers,
    params={"order": "transaction_date.desc", "limit": 10}
)
transactions = response.json()

# Create transaction
payload = {
    "portal_id": "uuid",
    "transaction_type": "withdrawal",
    "amount": 10000,
    "commission": 200
}
response = requests.post(
    f"{base_url}/transactions",
    headers=headers,
    json=payload
)
```

### cURL

```bash
# Get transactions
curl -X GET 'https://YOUR_PROJECT_REF.supabase.co/rest/v1/transactions?order=transaction_date.desc&limit=10' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Create transaction
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/rest/v1/transactions' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "portal_id": "uuid",
    "transaction_type": "withdrawal",
    "amount": 10000,
    "commission": 200
  }'

# Call Edge Function
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/scrape-website' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"configId": "config-id"}'
```

## Real-time Subscriptions

Subscribe to database changes in real-time:

```typescript
// Subscribe to new transactions
const channel = supabase
  .channel('transactions-changes')
  .on('postgres_changes', 
    { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'transactions',
      filter: `user_id=eq.${userId}`
    }, 
    (payload) => {
      console.log('New transaction:', payload.new)
    }
  )
  .subscribe()

// Unsubscribe
channel.unsubscribe()
```

## Best Practices

1. **Always use environment variables** for API keys and URLs
2. **Implement error handling** for all API calls
3. **Use proper authentication** - never expose service role keys
4. **Implement retry logic** for failed requests
5. **Cache responses** when appropriate
6. **Use Row Level Security** to protect data
7. **Validate input data** before sending to API
8. **Monitor rate limits** to avoid throttling
9. **Use TypeScript** for better type safety
10. **Log errors** for debugging

## Support

For API issues or questions:
- Check [Supabase Documentation](https://supabase.com/docs)
- Open an [issue on GitHub](https://github.com/srimanthadep/Payment-Track/issues)
- Contact the maintainers

## Version

Current API Version: **v1**

Last Updated: November 2024
