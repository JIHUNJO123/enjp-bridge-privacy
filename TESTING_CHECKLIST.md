# Pre-Submission Testing Checklist

Complete these tests before resubmitting to Apple App Store:

## ✅ Registration Flow

- [ ] Open app and tap "Sign Up" / "会員登録"
- [ ] Enter valid nickname (2-10 characters, English/Japanese/numbers)
- [ ] Enter valid email address (e.g., test@example.com)
- [ ] Enter valid password (6-20 characters, letters + numbers)
- [ ] Confirm password matches
- [ ] Select language (English or 日本語)
- [ ] Check "I agree to Terms of Service" checkbox
- [ ] Tap "Sign Up" button
- [ ] Verify successful registration
- [ ] Verify automatic login after registration

## ✅ Login Flow

- [ ] Logout from current account
- [ ] Enter registered email address
- [ ] Enter correct password
- [ ] Tap "Login" button
- [ ] Verify successful login

## ✅ Error Handling

### Email Validation
- [ ] Try to register with empty email → Should show "Please enter your email"
- [ ] Try to register with invalid email (e.g., "notanemail") → Should show "Please enter a valid email address"
- [ ] Try to register with duplicate email → Should show "This email is already in use"

### Password Validation
- [ ] Try password less than 6 characters → Should show error
- [ ] Try password without numbers → Should show "Password must contain both letters and numbers"
- [ ] Try password without letters → Should show "Password must contain both letters and numbers"
- [ ] Try mismatched passwords → Should show "Passwords do not match"

### Nickname Validation
- [ ] Try nickname less than 2 characters → Should show error
- [ ] Try nickname more than 10 characters → Should show error
- [ ] Try nickname with special characters → Should show error

### Login Errors
- [ ] Try login with non-existent email → Should show "Email not found"
- [ ] Try login with wrong password → Should show "Incorrect email or password"

## ✅ Profile Screen

- [ ] Navigate to Settings/Profile
- [ ] Verify email is displayed correctly
- [ ] Verify nickname is displayed correctly
- [ ] Verify no "ID" or "Username" field is shown

## ✅ Language Support

- [ ] Test registration in English
- [ ] Test registration in Japanese (日本語)
- [ ] Verify all error messages appear in selected language
- [ ] Verify UI text changes with language selection

## ✅ Chat Functionality

- [ ] Create account and login
- [ ] Start a new chat with another user
- [ ] Send messages
- [ ] Receive messages
- [ ] Verify translation works correctly
- [ ] Verify profile still shows email (not username/ID)

## ✅ UI/UX Review

- [ ] Verify no references to "ID" in English UI
- [ ] Verify no references to "ID" in Japanese UI
- [ ] Check that all input fields have appropriate placeholders
- [ ] Check that registration rules show email requirements (not ID requirements)
- [ ] Verify terms of service checkbox works
- [ ] Verify language switcher works on login screen

## ✅ Build & Version

- [ ] Update version in `app.json` to "1.0.3"
- [ ] Update iOS buildNumber to "3"
- [ ] Create new build with EAS Build: `eas build --platform ios`
- [ ] Test the new build before submission

## ✅ App Store Submission

- [ ] Upload new build to App Store Connect
- [ ] Update "What's New in This Version" notes:
  ```
  - Improved authentication system using email
  - Removed unnecessary personal information requirements
  - Enhanced user privacy and data protection
  - Bug fixes and performance improvements
  ```
- [ ] Include response to reviewer (see APPLE_REVIEW_FIX.md)
- [ ] Submit for review

## 📝 Notes

Record any issues found during testing:

---

**Date:** ___________

**Tester:** ___________

**Issues Found:**


**Resolution:**


---

## ⚠️ IMPORTANT

Before submitting:
1. Make sure ALL tests pass
2. Test on real iOS device if possible
3. Review App Store rejection email one more time
4. Confirm all changes address the specific issue (Guideline 5.1.1)
5. Include clear response to reviewer explaining changes

## 📧 Response Template for Apple Review

```
Hello App Review Team,

Thank you for your feedback on our app submission (ID: 9d9a0478-862f-4caa-afff-74d9d1472c08).

We have carefully reviewed Guideline 5.1.1 regarding data collection and have made the following changes in version 1.0.3:

CHANGES MADE:
• Removed the custom "ID" field that was previously required during registration
• Implemented standard email-based authentication
• Email is now used for login instead of a custom username
• Email is essential for account recovery, password resets, and security notifications

CURRENT REQUIRED FIELDS:
1. Email - Essential for authentication and account security
2. Nickname - Used only for display purposes in chat (2-10 characters)
3. Password - Required for account security

We have removed all non-essential personal information requirements. The app now only collects data that is directly necessary for core functionality (chat messaging with real-time translation).

We believe these changes fully address the concerns raised in the review and comply with Guideline 5.1.1.

Thank you for your time and consideration.

Best regards,
ENJP Bridge Team
```
