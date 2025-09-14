# Firebase Admin SDK Setup

Your Firebase Admin SDK is ready to use! Here are the exact environment variables you need to add to your Vercel project:

## Required Environment Variables

Add these to your Vercel project settings under Environment Variables:

\`\`\`
FIREBASE_PROJECT_ID=singsation-ba9b7
FIREBASE_PRIVATE_KEY_ID=812bf3016161c32fd5d59dd50326f08340023f58
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDVUUUXAwJcTTZ5
5DU/PXDJmS7WRObuWiPtnpH36zAECqDjNrsp4t+lpEYLZkwTU2mN94v3904fIGot
8GDrqnOc+EZw5BMi5bsTAgjEYR7H3Leoo0fApQY7BZHMymi6bmV/dMUhedSoMb+D
/UY/M3lcRGYz3maFpcO1D7FuCAUAUHZc0VcZgvcEoS7YWrvRlGekQ2Z5LzequkSs
/21af06qkobo1VWiAiLauBDrTDBHrxcZSoWPyPeqxkfkREtoRcR27XZvTUPUyE0m
pXKEc+6YBOK10J7MJV7nqjFbG3HKOnqmNOxU4AF0YOszPepGY+kzPidNhouWs6dW
ioJ3sPbvAgMBAAECggEASX6QGr8PK6TwnWtaSxkMiHCt+eXQWJOW6FHnQa72opXU
26OqNWK0ojmoZloO4OOurNp6j2rVsBS3cG9uvRNDdPP3NQLncvEKlKBxS9OYSszJ
PCFRYdaZgHFJS/D6xyys7I5bMs7qTS6iqMN01eaSrA7m1X0M/oPfmzy2aU37ByGQ
qaGhQCbjcid7DqkGdXkC696j81MiTZ6TZWAbgtdPsZXESn3sWXXifpC082khkm/t
R9Sww4l3lHNsPYXER7Nbqo0IB44Z40XHjB4LFKpwjlzvd2O5w6xWTI8RLkpSl8f2
wtZ66kuGQjkjHICqBRJxfvY+5aeFM9PHuQBhS1dJcQ==
-----END PRIVATE KEY-----
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@singsation-ba9b7.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=110838224183936900804
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40singsation-ba9b7.iam.gserviceaccount.com
\`\`\`

## Available Admin API Endpoints

Once you add these environment variables to Vercel, you'll have access to these admin endpoints:

- `GET /api/admin/users` - Get all users with their data
- `DELETE /api/admin/users` - Delete a user (requires UID in request body)
- `GET /api/admin/activities` - Get all activities or activities for a specific user (use ?uid=USER_UID)
- `GET /api/admin/stats` - Get user and activity statistics

## Security Note

These endpoints have admin privileges and can access/modify all user data. Make sure to add proper authentication/authorization before using in production.

## Quick Setup Steps

1. Copy the environment variables above
2. Go to your Vercel project dashboard
3. Navigate to Settings > Environment Variables
4. Add each variable with its corresponding value
5. Redeploy your application

Your Firebase Admin SDK will automatically connect using these credentials!
