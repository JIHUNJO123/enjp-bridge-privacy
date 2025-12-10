import React, { useState } from 'react';
import AdMobBannerComponent from '../components/AdMobBanner';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  SafeAreaView,
} from 'react-native';
import { db } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { showInterstitial } from '../components/AdMobInterstitial';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [language, setLanguage] = useState('en');
  const [autoCompleteDisabled, setAutoCompleteDisabled] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  console.log('LoginScreen - isLogin:', isLogin, 'termsAccepted:', termsAccepted);
  // Google Sign-In 관련 상태 제거
  
  const { login, signup } = useAuth();

  // 입력 규칙 검증 함수
  const validateInputs = (isEnglish) => {
    // 닉네임 규칙: 2-10자, 영문/일본어/숫자만 허용 (회원가입 시)
    if (!isLogin) {
      if (!displayName) {
        return isEnglish ? 'Please enter a nickname.' : 'ニックネームを入力してください。';
      }
      if (displayName.length < 2 || displayName.length > 10) {
        return isEnglish ? 'Nickname must be 2-10 characters.' : 'ニックネームは2～10文字です。';
      }
      // 일본어(히라가나/카타카나/한자), 영문, 숫자만 허용
      const nicknameRegex = /^[ぁ-んァ-ヶー一-龯a-zA-Z0-9]+$/;
      if (!nicknameRegex.test(displayName)) {
        return isEnglish ? 'Nickname can only contain English, Japanese, or numbers.' : 'ニックネームは英文、日本語、数字のみ使用可能です。';
      }
    }

    // 이메일 규칙: 유효한 이메일 형식
    if (!email) {
      return isEnglish ? 'Please enter your email.' : 'メールアドレスを入力してください。';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return isEnglish ? 'Please enter a valid email address.' : '有効なメールアドレスを入力してください。';
    }

    // 비밀번호 규칙: 6-20자, 영문+숫자 조합
    if (!password) {
      return isEnglish ? 'Please enter your password.' : 'パスワードを入力してください。';
    }
    if (password.length < 6 || password.length > 20) {
      return isEnglish ? 'Password must be 6-20 characters.' : 'パスワードは6～20文字です。';
    }
    // 영문과 숫자 모두 포함
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasLetter || !hasNumber) {
      return isEnglish ? 'Password must contain both letters and numbers.' : 'パスワードは英文と数字を両方含む必要があります。';
    }
    // 비밀번호 확인
    if (!isLogin && password !== passwordConfirm) {
      return isEnglish ? 'Passwords do not match.' : 'パスワードが一致しません。';
    }

    return null; // 검증 통과
  };

  const handleAuth = async () => {
    if (isProcessing) return; // 중복 클릭 방지
    
    const isEnglish = language === 'en';
    
    // 입력 규칙 검증
    const validationError = validateInputs(isEnglish);
    if (validationError) {
      if (Platform.OS === 'web') {
        window.alert(`⚠️ ${isEnglish ? 'Input Error' : '入力エラー'}\n\n${validationError}`);
      } else {
        Alert.alert(isEnglish ? '⚠️ Input Error' : '⚠️ 入力エラー', validationError);
      }
      return;
    }

    setIsProcessing(true); // 처리 시작
    
    try {
      if (isLogin) {
        // 이메일과 비밀번호로 로그인 (선택한 언어 전달)
        await login(email, password, language);
        await showInterstitial(); // 로그인 성공 시 전면 광고 노출
      } else {
        // Google 회원가입 로직 제거
        {
          // 이용약관 동의 확인
          if (!termsAccepted) {
            const errorMsg = isEnglish 
              ? 'Please agree to the Terms of Service to continue.' 
              : '利用規約に同意してください。';
            if (Platform.OS === 'web') {
              window.alert(`⚠️ ${isEnglish ? 'Terms Required' : '利用規約必須'}\n\n${errorMsg}`);
            } else {
              Alert.alert(isEnglish ? '⚠️ Terms Required' : '⚠️ 利用規約必須', errorMsg);
            }
            return;
          }
          
          // 아이디 회원가입
          const validationError = validateInputs(isEnglish);
          if (validationError) {
            if (Platform.OS === 'web') {
              window.alert(`⚠️ ${isEnglish ? 'Input Error' : '入力エラー'}\n\n${validationError}`);
            } else {
              Alert.alert(isEnglish ? '⚠️ Input Error' : '⚠️ 入力エラー', validationError);
            }
            return;
          }
          
          console.log('Calling signup with:', { email, displayName, language });
          const result = await signup(email, password, displayName, language);
          console.log('Signup result:', result);
          
          await showInterstitial(); // 회원가입 성공 시 전면 광고 노출
          
          // 회원가입 성공 시 안내
          if (Platform.OS === 'web') {
            window.alert(`✅ ${isEnglish ? 'Registration Complete' : '会員登録完了'}\n\n${isEnglish ? 'Your registration is complete!' : '登録が完了しました！'}`);
          } else {
            Alert.alert(isEnglish ? '✅ Registration Complete' : '✅ 会員登録完了', isEnglish ? 'Your registration is complete!' : '登録が完了しました！');
          }
          // 회원가입 성공하면 자동으로 로그인되므로 화면 전환 불필요
          setIsProcessing(false);
          return;
        }
      }
    } catch (error) {
      const isEnglish = language === 'en';
      let errorMessage = error.message || (isEnglish ? 'An error occurred.' : 'エラーが発生しました。');

      // Firebase Auth 에러 코드 처리
      if (error.code) {
        switch (error.code) {
          case 'permission-denied':
          case 'auth/permission-denied':
            errorMessage = isEnglish ? 'Database permission error. Please contact support.' : 'データベース権限エラーです。サポートにお問い合わせください。';
            break;
          case 'auth/email-already-in-use':
            errorMessage = isEnglish ? 'This ID is already in use.' : 'このIDはすでに使用されています。';
            break;
          case 'auth/invalid-email':
            errorMessage = isEnglish ? 'Invalid ID format.' : '無効なID形式です。';
            break;
          case 'auth/weak-password':
            errorMessage = isEnglish ? 'Password must be at least 6 characters.' : 'パスワードは6文字以上である必要があります。';
            break;
          case 'auth/user-not-found':
            errorMessage = isEnglish ? 'Email not found. Please check your email.' : 'メールアドレスが見つかりません。メールアドレスを確認してください。';
            break;
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            errorMessage = isEnglish ? 'Incorrect email or password.' : 'メールアドレスまたはパスワードが間違っています。';
            break;
          case 'auth/too-many-requests':
            errorMessage = isEnglish ? 'Too many failed attempts. Please try again later.' : '試行回数が多すぎます。しばらくしてから再度お試しください。';
            break;
          case 'auth/network-request-failed':
            errorMessage = isEnglish ? 'Network error. Please check your connection.' : 'ネットワークエラーです。接続を確認してください。';
            break;
        }
      }

      // 커스텀 에러 메시지 (닉네임 중복, 디바이스 제한 등)는 그대로 표시
      if (error.message && !error.code) {
        if (
          error.message.includes('query is not defined') ||
          error.message.includes('collection is not defined') ||
          error.message.includes('where is not defined') ||
          error.message.includes('getDocs is not defined')
        ) {
          errorMessage = isEnglish ? 'System error occurred. Please try again.' : 'システムエラーが発生しました。再度お試しください。';
        } else {
          errorMessage = error.message;
        }
      }

      console.error('Login/Signup error:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        language: language,
        isLogin: isLogin
      });

      const title = isLogin
        ? (isEnglish ? 'Login Failed' : 'ログイン失敗')
        : (isEnglish ? 'Registration Failed' : '会員登録失敗');

      if (Platform.OS === 'web') {
        window.alert(`❌ ${title}\n\n${errorMessage}`);
      } else {
        Alert.alert(`❌ ${title}`, errorMessage);
      }
    } finally {
      setIsProcessing(false); // 처리 완료 (성공/실패 모두)
    }
  };

  // Define text variables to simplify JSX
  const appTitle = language === 'en' ? 'English ⇄ Japanese' : '英語 ⇄ 日本語';
  const subtitle = language === 'en' ? 'Language Exchange Chat' : '言語交換チャット';
  const description = language === 'en' ? 'Connect with the world through real-time translation' : 'リアルタイム翻訳で世界とつながろう';
  const nicknamePlaceholder = language === 'en' ? 'Nickname (2-10 characters)' : 'ニックネーム (2～10文字)';
  const emailPlaceholder = language === 'en' ? 'Email' : 'メールアドレス';
  const passwordPlaceholder = language === 'en' ? 'Password (6-20 chars, letters+numbers)' : 'パスワード (6～20文字, 英数字)';
  const confirmPasswordPlaceholder = language === 'en' ? 'Confirm Password' : 'パスワード確認';
  const selectLanguageLabel = language === 'en' ? 'Select Language:' : '言語選択:';
  const loginButtonText = isLogin ? (language === 'en' ? 'Login' : 'ログイン') : (language === 'en' ? 'Sign Up' : '会員登録');
  const switchButtonText = isLogin 
    ? (language === 'en' ? 'Don\'t have an account? Sign Up' : 'アカウントをお持ちでないですか？会員登録')
    : (language === 'en' ? 'Already have an account? Login' : 'すでにアカウントをお持ちですか？ログイン');
  const rulesTitle = language === 'en' ? '📝 Registration Rules' : '📝 登録ルール';
  const nicknameRule = language === 'en' 
    ? '• Nickname: 2-10 characters (English/Japanese/numbers)'
    : '• ニックネーム: 2～10文字 (英文/日本語/数字)';
  const emailRule = language === 'en' 
    ? '• Email: Valid email address required'
    : '• メール: 有効なメールアドレスが必要';
  const passwordRule = language === 'en' 
    ? '• Password: 6-20 characters (letters+numbers required)'
    : '• パスワード: 6～20文字 (英文+数字必須)';
  const specialCharsRule = language === 'en' 
    ? '• Special characters not allowed in nickname'
    : '• 特殊文字はニックネームに使用不可';
  const dividerText = language === 'en' ? 'OR' : 'または';

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 언어 전환 버튼 */}
        <View style={styles.languageSwitcher}>
          <TouchableOpacity
            style={[styles.languageSwitchButton, language === 'en' && styles.languageSwitchButtonActive]}
            onPress={() => setLanguage('en')}
          >
            <Text style={[styles.languageSwitchText, language === 'en' && styles.languageSwitchTextActive]}>
              English
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.languageSwitchButton, language === 'ja' && styles.languageSwitchButtonActive]}
            onPress={() => setLanguage('ja')}
          >
            <Text style={[styles.languageSwitchText, language === 'ja' && styles.languageSwitchTextActive]}>
              日本語
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={styles.appName}>ENJP Bridge</Text>
          <Text style={styles.title}>💬✨</Text>
          <Text style={styles.appTitle}>
            {appTitle}
          </Text>
          <Text style={styles.subtitle}>
            {subtitle}
          </Text>
          <Text style={styles.description}>
            {description}
          </Text>
        </View>

        <View style={styles.form}>
          {!isLogin && (
            <TextInput
              style={styles.input}
              placeholder={nicknamePlaceholder}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="none"
              maxLength={10}
            />
          )}
          
          <TextInput
            style={styles.input}
            placeholder={emailPlaceholder}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            textContentType="emailAddress"
            keyboardType="email-address"
            importantForAutofill="yes"
            spellCheck={false}
          />
          
          <TextInput
            style={styles.input}
            placeholder={passwordPlaceholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            maxLength={20}
          />
          {!isLogin && (
            <TextInput
              style={styles.input}
              placeholder={confirmPasswordPlaceholder}
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              secureTextEntry
              maxLength={20}
            />
          )}

          {!isLogin && (
            <View style={styles.termsContainer}>
              <Text style={styles.termsTitle}>
                {language === 'en' ? 'TERMS OF SERVICE' : '利用規約'}
              </Text>
              <ScrollView style={styles.termsScrollView} nestedScrollEnabled={true}>
                <Text style={styles.termsContent}>
                  {language === 'en' ? `By using ENJP Bridge, you agree to:

1. Age Requirement
• You must be at least 13 years old to use this app
• Users under 13 are not permitted

2. Prohibited Content
• No harassment, hate speech, discrimination
• No sexually explicit or pornographic content
• No spam, scams, or fraudulent activities
• No illegal content or activities
• No violence, threats, or self-harm content

3. User Conduct
• Be respectful to all users
• Use appropriate language
• Do not impersonate others
• Do not share personal information publicly

4. Content Moderation
• Reported content will be reviewed as soon as possible
• Violators may receive warnings or permanent bans
• Decisions are made at our discretion

5. Reporting & Blocking
• You can report inappropriate users/content
• You can block users at any time
• Use the in-app report feature

6. Consequences
• Minor violations: Warning
• Repeated violations: Permanent ban
• Serious violations: Immediate ban

7. Your Rights & Privacy
• You can delete your account anytime in Settings
• All your data will be permanently deleted upon account deletion
• See our Privacy Policy for data collection details
• You can withdraw consent by deleting your account

8. Service Changes
• We may modify or discontinue services at any time
• We reserve the right to update these terms
• Continued use means acceptance of changes

Contact: jihun.jo@yahoo.com` 
                    : `ENJP Bridgeを使用することで、以下に同意します：

1. 年齢要件
• このアプリを使用するには13歳以上である必要があります
• 13歳未満のユーザーは許可されません

2. 禁止コンテンツ
• ハラスメント、ヘイトスピーチ、差別の禁止
• 性的に露骨またはポルノコンテンツの禁止
• スパム、詐欺、不正行為の禁止
• 違法なコンテンツや活動の禁止
• 暴力、脅迫、自傷コンテンツの禁止

3. ユーザー行動規範
• すべてのユーザーに敬意を払う
• 適切な言葉遣いを使用する
• 他人になりすましない
• 個人情報を公開しない

4. コンテンツモデレーション
• 報告されたコンテンツはできるだけ早く審査されます
• 違反者は警告または永久禁止される場合があります
• 決定は当社の裁量で行われます

5. 報告とブロック
• 不適切なユーザー/コンテンツを報告可能
• いつでもユーザーをブロック可能
• アプリ内の報告機能を使用

6. 結果
• 軽微な違反：警告
• 繰り返し違反：永久禁止
• 重大な違反：即時禁止

7. お客様の権利とプライバシー
• 設定からいつでもアカウント削除可能
• アカウント削除時にすべてのデータが完全に削除されます
• データ収集の詳細はプライバシーポリシーをご覧ください
• アカウント削除により同意を撤回できます

8. サービスの変更
• いつでもサービスを変更または終了する場合があります
• これらの規約を更新する権利を留保します
• 継続使用は変更の受諾を意味します

連絡先：jihun.jo@yahoo.com`}
                </Text>
              </ScrollView>
              <TouchableOpacity
                style={styles.termsCheckbox}
                onPress={() => setTermsAccepted(!termsAccepted)}
              >
                <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                  {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.termsAgreeText}>
                  {language === 'en' ? 'I have read and agree to the Terms of Service' : '利用規約を読んで同意しました'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {!isLogin && (
            <View style={styles.languageContainer}>
              <Text style={styles.languageLabel}>
                {selectLanguageLabel}
              </Text>
              <View style={styles.languageButtons}>
                <TouchableOpacity
                  style={[
                    styles.languageButton,
                    language === 'en' && styles.languageButtonActive,
                  ]}
                  onPress={() => setLanguage('en')}
                >
                  <Text style={[
                    styles.languageButtonText,
                    language === 'en' && styles.languageButtonTextActive,
                  ]}>
                    English
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.languageButton,
                    language === 'ja' && styles.languageButtonActive,
                  ]}
                  onPress={() => setLanguage('ja')}
                >
                  <Text style={[
                    styles.languageButtonText,
                    language === 'ja' && styles.languageButtonTextActive,
                  ]}>
                    日本語
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!isLogin && (
            <View style={styles.rulesContainer}>
              <Text style={styles.rulesTitle}>
                {rulesTitle}
              </Text>
              <Text style={styles.rulesText}>
                {nicknameRule}
              </Text>
              <Text style={styles.rulesText}>
                {emailRule}
              </Text>
              <Text style={styles.rulesText}>
                {passwordRule}
              </Text>
              <Text style={styles.rulesText}>
                {specialCharsRule}
              </Text>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.button, isProcessing && styles.buttonDisabled]} 
            onPress={handleAuth}
            disabled={isProcessing}
          >
            <Text style={styles.buttonText}>
              {isProcessing 
                ? (language === 'en' ? 'Processing...' : '処理中...') 
                : loginButtonText
              }
            </Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>
              {dividerText}
            </Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign-In 버튼 및 로직 완전 제거 */}

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setIsLogin(!isLogin)}
          >
            <Text style={styles.switchButtonText}>
              {switchButtonText}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <AdMobBannerComponent screenType="login" />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  languageSwitcher: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  languageSwitchButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  languageSwitchButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  languageSwitchText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  languageSwitchTextActive: {
    color: '#fff',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: {
    fontSize: 42,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#007AFF',
    letterSpacing: 1,
  },
  title: {
    fontSize: 50,
    marginBottom: 15,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#666',
  },
  description: {
    fontSize: 15,
    color: '#888',
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  languageContainer: {
    marginBottom: 15,
  },
  languageLabel: {
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
  },
  languageButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  languageButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  languageButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  languageButtonText: {
    fontSize: 16,
    color: '#333',
  },
  languageButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  termsContainer: {
    marginTop: 10,
    marginBottom: 15,
    paddingVertical: 15,
    paddingHorizontal: 10,
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  termsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B00',
    marginBottom: 10,
    textAlign: 'center',
  },
  termsScrollView: {
    maxHeight: 200,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#FFF',
  },
  termsContent: {
    fontSize: 11,
    color: '#333',
    lineHeight: 16,
  },
  termsCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  termsAgreeText: {
    fontSize: 13,
    color: '#333',
    flex: 1,
    marginLeft: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 4,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  termsTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  termsText: {
    fontSize: 14,
    color: '#333',
  },
  termsLink: {
    fontSize: 14,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#999',
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#666',
    fontSize: 14,
  },
  googleButtonContainer: {
    marginBottom: 10,
    alignItems: 'center',
  },
  googleButton: {
    width: 175,
    height: 40,
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  rulesContainer: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  rulesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 10,
  },
  rulesText: {
    fontSize: 13,
    color: '#555',
    marginBottom: 5,
    lineHeight: 20,
  },
});
