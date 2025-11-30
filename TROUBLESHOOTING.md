# Troubleshooting Guide

## Common Issues and Solutions

### 1. "Missing Firebase environment variables" Error

**Solution**: Make sure your `.env.local` file has all the Firebase config values filled in (not placeholders).

Check by running:
```bash
grep "your_" .env.local
```
If you see any results, those values still need to be replaced with your actual Firebase config.

### 2. "Firebase: Error (auth/unauthorized-domain)" 

**Solution**: Add your domain to Firebase authorized domains:
- Go to Firebase Console → Authentication → Settings → Authorized domains
- Add `localhost` if not already there

### 3. "Firestore permission denied" Error

**Solution**: Set up Firestore security rules:
- Go to Firebase Console → Firestore Database → Rules
- Use these rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 4. "Cannot read properties of undefined" or Auth Errors

**Check**:
- Is Email/Password authentication enabled in Firebase Console?
- Go to Authentication → Sign-in method → Enable Email/Password

### 5. App Shows Login Screen But Can't Sign In

**Check**:
1. Firebase Authentication is enabled
2. Email/Password provider is enabled
3. Try creating a new account first (sign up)

### 6. Data Not Saving

**Check**:
1. Firestore database is created
2. Security rules are set correctly (see #3)
3. Browser console for specific error messages

### 7. Dev Server Not Starting

**Solution**: Use the helper script:
```bash
./npm-helper.sh run dev
```

Or add Node.js to PATH (see README_NPM.md)

## Quick Diagnostic Steps

1. **Check browser console** (F12 → Console tab) for errors
2. **Check Firebase Console** - is your project active?
3. **Verify .env.local** - all values should be real, not placeholders
4. **Check Firestore** - database should be created
5. **Check Authentication** - Email/Password should be enabled

## Getting Help

If you're still stuck, check:
- Browser console errors (F12)
- Terminal output from dev server
- Firebase Console for any error messages



