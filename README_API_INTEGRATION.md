# SmartSlip API Integration Guide

This guide explains how to use the SmartSlip API integration in your Next.js project.

## Setup

### 1. Environment Configuration

The `.env.local` file has been created with the following variables:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_API_KEY=super-secret-api-key-12345
```

**For Production:**
```env
NEXT_PUBLIC_API_BASE_URL=https://smart-slip-api.vercel.app
NEXT_PUBLIC_API_KEY=your-actual-api-key
```

### 2. Project Structure

New files created:

```
src/
├── lib/
│   └── apiClient.ts          # API client utilities
├── hooks/
│   └── useReceipts.ts        # React hook for receipts
└── components/
    └── ReceiptUploader.tsx   # Example uploader component
```

## API Client (`src/lib/apiClient.ts`)

The API client provides functions to interact with the SmartSlip_API backend:

### Available Functions

#### Extract Receipt from Image
```typescript
import { extractReceiptFromImage } from '@/lib/apiClient';

const { data, error, success } = await extractReceiptFromImage(file);

if (success && data) {
  console.log('Amount:', data.amount);         // 1500.50
  console.log('Receiver:', data.receiver);     // Restaurant name
  console.log('Confidence:', data.confidence);  // 'high', 'medium', 'low'
  console.log('Date:', data.date);              // '2026-03-17'
}
```

#### Create Receipt
```typescript
import { createReceipt } from '@/lib/apiClient';

const { data, error, success } = await createReceipt(
  'Restaurant Name',
  1500.50,
  'user123'
);
```

#### Get All Receipts
```typescript
import { getReceipts } from '@/lib/apiClient';

// Get all receipts
const { data: allReceipts } = await getReceipts();

// Get receipts for specific user
const { data: userReceipts } = await getReceipts('user123');
```

#### Get Receipt by ID
```typescript
import { getReceiptById } from '@/lib/apiClient';

const { data } = await getReceiptById('receipt-id-123');
```

#### Update Receipt
```typescript
import { updateReceipt } from '@/lib/apiClient';

const { data } = await updateReceipt('receipt-id-123', {
  storeName: 'New Name',
  totalAmount: 2000,
});
```

#### Delete Receipt
```typescript
import { deleteReceipt } from '@/lib/apiClient';

const { success } = await deleteReceipt('receipt-id-123');
```

#### Check API Health
```typescript
import { checkApiHealth } from '@/lib/apiClient';

const isHealthy = await checkApiHealth();
```

## React Hook (`src/hooks/useReceipts.ts`)

The `useReceipts` hook provides an easy way to manage receipts in React components:

```typescript
'use client';

import { useReceipts } from '@/hooks/useReceipts';

export function MyComponent() {
  const {
    receipts,      // Array of receipts
    loading,       // Loading state
    error,         // Error message
    fetchReceipts,     // Function to fetch receipts
    uploadReceipt,     // Function to upload new receipt
    extractFromImage,  // Function to extract from image
    removeReceipt,     // Function to delete receipt
  } = useReceipts();

  // Fetch receipts on mount
  useEffect(() => {
    fetchReceipts('user123');
  }, []);

  // Handle image upload
  const handleFileChange = async (file: File) => {
    const extractedData = await extractFromImage(file);
    if (extractedData) {
      console.log('Extracted:', extractedData);
    }
  };

  return (
    <div>
      {error && <p>Error: {error}</p>}
      {loading && <p>Loading...</p>}
      {receipts.map((receipt) => (
        <div key={receipt.id}>
          <h3>{receipt.storeName}</h3>
          <p>฿{receipt.totalAmount}</p>
          <button onClick={() => removeReceipt(receipt.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

## Example Component (`src/components/ReceiptUploader.tsx`)

A ready-to-use component for uploading and extracting receipts:

```typescript
import { ReceiptUploader } from '@/components/ReceiptUploader';

export default function Page() {
  return <ReceiptUploader />;
}
```

Features:
- Image upload with preview
- Automatic data extraction
- Confidence level display
- Error handling
- Thai language support

## Response Types

### ReceiptData
```typescript
interface ReceiptData {
  amount: number;           // Extracted amount
  sender?: string;          // Sender name
  receiver: string;         // Receiver/shop name
  date: string;            // Date in format YYYY-MM-DD
  confidence?: 'high' | 'medium' | 'low';  // Confidence level
  method?: string;         // Extraction method used
}
```

### Receipt
```typescript
interface Receipt {
  id: string;              // Unique receipt ID
  userId: string;          // User who uploaded
  storeName: string;       // Store/shop name
  totalAmount: number;     // Amount in THB
  imageUrl?: string;       // URL to receipt image
  extractedData?: ReceiptData;  // Extracted data
  createdAt: string;       // Creation timestamp
  updatedAt: string;       // Last update timestamp
}
```

### ApiResponse
```typescript
interface ApiResponse<T> {
  success: boolean;        // Whether request succeeded
  data?: T;               // Response data
  error?: string;         // Error message if failed
  status?: number;        // HTTP status code
}
```

## Authentication

All API requests are authenticated using the `x-api-key` header. The API key is automatically included from `.env.local`:

```
x-api-key: super-secret-api-key-12345
```

## Error Handling

All functions return an `ApiResponse` object. Always check the `success` property:

```typescript
const response = await getReceipts();

if (response.success) {
  console.log(response.data);
} else {
  console.error(response.error);
  console.error('Status:', response.status);
}
```

## Rate Limiting

The API has rate limiting (100 requests per minute by default). Responses include headers:
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - When limit resets
- `Retry-After` - Seconds until retry

## Backend API Documentation

For more details about the backend API, refer to the official SmartSlip_API repository:
https://github.com/suppachai0/SmartSlip_API

Key endpoints:
- `POST /api/receipts/extract` - Extract receipt from image
- `POST /api/receipts` - Create receipt
- `GET /api/receipts` - Get all receipts
- `GET /api/receipts/:id` - Get receipt by ID
- `PUT /api/receipts/:id` - Update receipt
- `DELETE /api/receipts/:id` - Delete receipt
- `POST /api/line` - LINE webhook

## Tips

1. **Image Size**: Smaller images process faster. Recommended: < 2MB
2. **Image Quality**: Clear images give higher confidence levels
3. **Error Handling**: Always handle the error case in your UI
4. **Loading State**: Show loading indicator while `loading` is true
5. **Confidence Levels**:
   - `high`: > 75% confidence, data is reliable
   - `medium`: 40-75% confidence, verify before use
   - `low`: < 40% confidence, manual review needed

## Troubleshooting

### API Not Responding
- Check `.env.local` has correct `NEXT_PUBLIC_API_BASE_URL`
- Ensure backend API is running
- Run `checkApiHealth()` to verify

### Authentication Failed
- Check API key in `.env.local`
- Ensure `x-api-key` header is being sent
- Verify API key matches backend configuration

### Rate Limit Exceeded
- Wait for `retryAfter` seconds before retrying
- Consider implementing exponential backoff
- Contact API administrator for higher limits

### Extraction Failed
- Try with clearer image
- Check image format (JPEG, PNG)
- Verify image is not corrupted
- Check confidence level in response

## Next Steps

1. Update `.env.local` with your API endpoint URL
2. Import and use `useReceipts` hook in your components
3. Add `<ReceiptUploader />` to your dashboard
4. Implement receipt management UI
5. Test with sample receipt images
