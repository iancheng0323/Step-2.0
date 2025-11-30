# Firebase Setup Guide

This application uses Firebase for authentication and data storage. Follow these steps to set up Firebase:

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard

## 2. Enable Authentication

1. In your Firebase project, go to **Authentication** > **Sign-in method**
2. Enable **Email/Password** authentication
3. Save the changes

## 3. Create Firestore Database

1. Go to **Firestore Database** in your Firebase project
2. Click "Create database"
3. Start in **test mode** (for development) or **production mode** (for production)
4. Select a location for your database

## 4. Get Firebase Configuration

1. Go to **Project Settings** (gear icon) > **General**
2. Scroll down to "Your apps" section
3. Click the web icon (`</>`) to add a web app
4. Register your app and copy the Firebase configuration object

## 5. Set Environment Variables

Create a `.env.local` file in the root of your project with the following variables:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

Replace the placeholder values with your actual Firebase configuration values.

## 6. Set Firestore Security Rules (Important!)

Go to **Firestore Database** > **Rules** and update them to:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

This ensures users can only access their own data.

## 7. Install Dependencies

Run:
```bash
npm install
```

## 8. Start the Application

```bash
npm run dev
```

## Data Structure

The app stores data in the following Firestore structure:

```
users/
  {userId}/
    todos/
      {todoId}/
        - id, text, done, color, category, createdAt, order
    goals/
      {goalId}/
        - id, name, description, status, category, createdAt
    data/
      brief/
        - intro, whoYouAre, whatYouWant
```

## Features

- **Authentication**: Email/password authentication
- **Real-time Sync**: Data syncs in real-time across devices
- **User-specific Data**: Each user's data is isolated and secure
- **Offline Support**: Firebase handles offline data persistence automatically

