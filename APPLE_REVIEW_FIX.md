# Apple App Store Review Fix - Guideline 5.1.1

## Issue
App Store Review rejection due to requiring users to provide personal information (ID/username) that is not directly relevant to the app's core functionality.

**Rejection Guideline:** 5.1.1 - Legal - Privacy - Data Collection and Storage

## Changes Made

### 1. LoginScreen.js
- **Removed:** Username/ID input field requirement
- **Added:** Standard email input field
- **Updated:** Input validation to check for valid email format instead of username format
- **Updated:** Error messages to reference email instead of ID
- **Updated:** Registration rules to show email requirements instead of ID requirements

**Before:**
- Required: Nickname, ID (4-16 characters), Password
- ID field used custom validation for alphanumeric characters

**After:**
- Required: Nickname, Email, Password
- Email field uses standard email validation (RFC 5322 format)

### 2. AuthContext.js
- **Updated:** `signup()` function to accept email instead of username
- **Removed:** Username duplication check from Firestore
- **Updated:** Firebase Authentication to use real email addresses instead of converting username to `username@user.app` format
- **Updated:** `login()` function to authenticate with email instead of username
- **Updated:** User profile schema in Firestore to store email instead of username

**Before:**
```javascript
const signup = async (username, password, displayName, language) => {
  const email = `${username}@user.app`; // Artificial email
  // ...
}
```

**After:**
```javascript
const signup = async (email, password, displayName, language) => {
  // Uses real user email directly
  // ...
}
```

### 3. Firestore User Schema
**Before:**
```javascript
{
  uid: string,
  username: string,  // Custom ID field
  displayName: string,
  language: string,
  // ...
}
```

**After:**
```javascript
{
  uid: string,
  email: string,  // Real email address
  displayName: string,
  language: string,
  // ...
}
```

### 4. ProfileScreen.js
- No changes needed - already displaying email field correctly

### 5. Documentation
- Updated `USER_GUIDE.md` to reflect email-based authentication
- Clarified registration requirements

## Compliance with Apple Guidelines

✅ **Email is essential** - Email is necessary for:
- User account recovery
- Password reset functionality
- Account verification
- Communication about account security

✅ **Nickname is optional for display** - The nickname is used for:
- Display name in chat interface
- User identification within the app
- Not used for authentication (making it truly optional from a login perspective)

✅ **Removed non-essential personal data** - Username/ID field removed because:
- Not required for app functionality
- Email serves the same authentication purpose
- Reduces unnecessary data collection

## Testing Recommendations

Before resubmitting to App Store:

1. **Test Email Authentication:**
   - Sign up with a valid email address
   - Log in with email and password
   - Verify email validation works correctly

2. **Test Profile Display:**
   - Verify email is displayed in Settings/Profile screen
   - Check that all user-facing text refers to "email" not "ID"

3. **Test Error Messages:**
   - Invalid email format
   - Email already in use
   - Incorrect email or password

4. **Verify Data Collection:**
   - Confirm app only requests: Email, Nickname, Password
   - Verify terms of service mention data collection

## Migration Notes

**Existing Users:** 
- Users created with the old username system (`username@user.app`) can still log in using that email format
- No data migration needed for existing users
- New users will use real email addresses

## App Store Resubmission Checklist

- [x] Removed username/ID field requirement
- [x] Implemented email-based authentication
- [x] Updated all user-facing text
- [x] Updated error messages
- [x] Updated documentation
- [ ] Test complete registration flow
- [ ] Test complete login flow
- [ ] Verify error handling
- [ ] Update app screenshots if they show the old ID field
- [ ] Submit new build to App Store Connect
- [ ] Respond to Apple's review notes explaining the changes

## Version Update

Consider updating `app.json`:
```json
{
  "version": "1.0.3",
  "ios": {
    "buildNumber": "3"
  }
}
```

## Response to Apple

When resubmitting, include this message:

---

**Response to App Review:**

Thank you for your feedback regarding Guideline 5.1.1. We have updated our app to remove the requirement for users to provide a custom ID/username.

**Changes made in version 1.0.3:**
- Removed the custom "ID" field from registration
- Implemented standard email-based authentication
- Email is now the only identifier required for login
- Email is essential for account recovery, password reset, and security communications

Users now only need to provide:
1. Email address (essential for authentication and account security)
2. Nickname (for display purposes in chat)
3. Password (for account security)

All non-essential personal information requests have been removed from the app.

---

## Contact

If you have questions about these changes:
- Email: jihun.jo@yahoo.com
- Review the code changes in LoginScreen.js and AuthContext.js
