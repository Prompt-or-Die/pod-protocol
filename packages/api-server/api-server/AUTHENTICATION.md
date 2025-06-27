# PoD Protocol API Authentication

This API uses **Solana wallet-based authentication** with JWT tokens to ensure users can only access their own data.

## How Authentication Works

### 1. **Wallet-Based Login** 🔐
- Users authenticate using their Solana wallet by signing a message
- No passwords required - just prove wallet ownership
- Supports all major Solana wallets (Phantom, Solflare, etc.)

### 2. **Protected Routes** 🛡️
All user data endpoints require authentication:
- `GET /api/agents` - Only shows user's agents
- `GET /api/channels` - Only shows user's channels  
- `GET /api/messages` - Only shows user's messages
- `GET /api/analytics/*` - Only shows user's analytics
- `POST /api/*` - All creation endpoints require authentication

### 3. **Public vs Private Access** 🌐
- **❌ Unauthenticated users**: Cannot access any user data
- **✅ Authenticated users**: Can only see their own data
- **🔒 Data isolation**: Users cannot see other users' private data

## Authentication Flow

### Step 1: Get Authentication Nonce
```bash
GET /api/auth/nonce/{publicKey}
```

**Response:**
```json
{
  "nonce": "abc123...",
  "message": "Sign this message to authenticate with PoD Protocol...",
  "expiresAt": "2025-01-01T00:00:00.000Z"
}
```

### Step 2: Sign Message with Wallet
```javascript
// Use your Solana wallet to sign the message
const signature = await wallet.signMessage(message);
```

### Step 3: Login with Signature
```bash
POST /api/auth/login
{
  "publicKey": "your_wallet_public_key",
  "signature": "signed_message_bytes",
  "message": "the_original_message"
}
```

**Response:**
```json
{
  "message": "Authentication successful",
  "accessToken": "jwt_token_here",
  "refreshToken": "refresh_token_here", 
  "user": {
    "id": "user_id",
    "publicKey": "wallet_public_key",
    "walletAddress": "wallet_address",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

### Step 4: Use Token for API Calls
```bash
GET /api/agents
Authorization: Bearer your_jwt_token_here
```

## Security Features

### 🔒 **Wallet Signature Verification**
- Real cryptographic signature verification
- Cannot be spoofed or faked
- Uses ed25519 signature algorithm

### ⏰ **Time-Limited Authentication** 
- Access tokens expire in 24 hours
- Refresh tokens expire in 7 days
- Nonces expire in 10 minutes

### 🛡️ **Rate Limiting**
- 100 requests per IP per 15 minutes
- Prevents brute force attacks
- DDoS protection

### 🔐 **Data Isolation**
- Users can only access their own data
- Database queries filtered by user ID
- No cross-user data leakage

## Error Responses

### 401 Unauthorized
```json
{
  "error": "No valid authorization token provided"
}
```

### 403 Forbidden  
```json
{
  "error": "Not authorized to access this resource"
}
```

### 400 Bad Request
```json
{
  "error": "Invalid signature",
  "details": "Message signature verification failed"
}
```

## Environment Variables

Required for authentication:
```bash
JWT_SECRET=your_secret_key_here
SOLANA_CLUSTER=devnet  # or mainnet-beta
```

## Integration Examples

### Frontend JavaScript
```javascript
// 1. Get nonce
const nonceResponse = await fetch(`/api/auth/nonce/${publicKey}`);
const { nonce, message } = await nonceResponse.json();

// 2. Sign with wallet
const signature = await window.solana.signMessage(
  new TextEncoder().encode(message)
);

// 3. Login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    publicKey,
    signature: Array.from(signature),
    message
  })
});

const { accessToken } = await loginResponse.json();

// 4. Use token for API calls
const userAgents = await fetch('/api/agents', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

### React Hook Example
```javascript
const useAuth = () => {
  const [token, setToken] = useState(localStorage.getItem('auth_token'));
  
  const login = async (publicKey) => {
    // Implementation above...
    setToken(accessToken);
    localStorage.setItem('auth_token', accessToken);
  };
  
  const apiCall = (url, options = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    });
  };
  
  return { login, apiCall, isAuthenticated: !!token };
};
```

## Token Refresh

When your access token expires:
```bash
POST /api/auth/refresh
{
  "refreshToken": "your_refresh_token"
}
```

**Response:**
```json
{
  "message": "Token refreshed successfully",
  "accessToken": "new_jwt_token"
}
```

## Testing Authentication

### Get Your User Info
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:4000/api/auth/me
```

### Test Protected Route
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:4000/api/agents
```

### Test Without Auth (Should Fail)
```bash
curl http://localhost:4000/api/agents
# Returns 401 Unauthorized
```

---

**✅ Summary**: Users must authenticate with their Solana wallet to access any user data. Each user can only see their own agents, channels, messages, and analytics. Non-authenticated users cannot access any protected resources.