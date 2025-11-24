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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [language, setLanguage] = useState('en');
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

    // 아이디 규칙: 4-16자, 영문/숫자만 허용
    if (!username) {
      return isEnglish ? 'Please enter your ID.' : 'IDを入力してください。';
    }
    const usernameRegex = /^[a-zA-Z0-9]{4,16}$/;
    if (!usernameRegex.test(username)) {
      return isEnglish ? 'ID must be 4-16 characters (letters and numbers only).' : 'IDは4～16文字（英数字のみ）です。';
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
    const isEnglish = language === 'en';
    const isKorean = language === 'ko';
    
    // 입력 규칙 검증
    const validationError = validateInputs(isEnglish);
    if (validationError) {
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(`⚠️ ${isEnglish ? 'Input Error' : '入力エラー'}\n\n${validationError}`);
      } else {
        Alert.alert(`⚠️ ${isKorean ? '입력 오류' : '入力エラー'}`, validationError);
      }
      return;
    }

    try {
      if (isLogin) {
        // 로그인 시도 전에 해당 아이디가 존재하는지 확인
        const userQuery = query(
          collection(db, 'users'),
          where('username', '==', username)
        );
        const userSnapshot = await getDocs(userQuery);
        
        if (userSnapshot.empty) {
          const errorMsg = isEnglish ? 'ID not found. Please check your ID.' : 'IDが見つかりません。IDを確認してください。';
          if (typeof window !== 'undefined' && window.alert) {
            window.alert(`⚠️ ${isEnglish ? 'Login Error' : 'ログインエラー'}\n\n${errorMsg}`);
          } else {
            Alert.alert(`⚠️ ${isEnglish ? 'Login Error' : 'ログインエラー'}`, errorMsg);
          }
          return;
        }
        // 아이디와 비밀번호로 로그인
        await login(username, password);
      } else {
        // Google 회원가입 로직 제거
        {
          // 아이디 회원가입
          const validationError = validateInputs(isEnglish);
          if (validationError) {
            if (typeof window !== 'undefined' && window.alert) {
              window.alert(`⚠️ ${isEnglish ? 'Input Error' : '入力エラー'}\n\n${validationError}`);
            } else {
              Alert.alert(`⚠️ ${isKorean ? '입력 오류' : '入力エラー'}`, validationError);
            }
            return;
          }
          await signup(username, password, displayName, language);
          await showInterstitial(); // 회원가입 성공 시 전면 광고 노출
          
          // 회원가입 성공 시 안내
          if (typeof window !== 'undefined' && window.alert) {
            window.alert(`✅ ${isEnglish ? 'Registration Complete' : '会員登録完了'}\n\n${isEnglish ? 'Your registration is complete!' : '登録が完了しました！'}`);
          } else {
            Alert.alert(`✅ ${isEnglish ? 'Registration Complete' : '会員登録完了'}`, isEnglish ? 'Your registration is complete!' : '登録が完了しました！');
          }
          // 회원가입 성공하면 자동으로 로그인되므로 화면 전환 불필요
          return;
        }
      }
    } catch (error) {
      const isEnglish = language === 'en';
      const isKorean = language === 'ko';
      let errorMessage = error.message || (isKorean ? '오류가 발생했습니다.' : 'エラーが発生しました。');

      // Firebase Auth 에러 코드 처리
      if (error.code) {
        switch (error.code) {
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
            errorMessage = isEnglish ? 'ID not found. Please check your ID.' : 'IDが見つかりません。IDを確認してください。';
            break;
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            errorMessage = isEnglish ? 'Incorrect ID or password.' : 'IDまたはパスワードが間違っています。';
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

      if (typeof window !== 'undefined' && window.alert) {
        window.alert(`❌ ${title}\n\n${errorMessage}`);
      } else {
        Alert.alert(`❌ ${title}`, errorMessage);
      }
    }
  };

  // Define text variables to simplify JSX
  const appTitle = language === 'en' ? 'English ⇄ Japanese' : '英語 ⇄ 日本語';
  const subtitle = language === 'en' ? 'Language Exchange Chat' : '言語交換チャット';
  const description = language === 'en' ? 'Connect with the world through real-time translation' : 'リアルタイム翻訳で世界とつながろう';
  const nicknamePlaceholder = language === 'en' ? 'Nickname (2-10 characters)' : 'ニックネーム (2～10文字)';
  const idPlaceholder = language === 'en' ? 'ID (4-16 letters/numbers)' : 'ID (4～16文字 英数字)';
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
  const idRule = language === 'en' 
    ? '• ID: 4-16 characters (letters and numbers only)'
    : '• ID: 4～16文字（英数字のみ）';
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
            placeholder={idPlaceholder}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            maxLength={16}
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
            <View style={styles.rulesContainer}>
              <Text style={styles.rulesTitle}>
                {rulesTitle}
              </Text>
              <Text style={styles.rulesText}>
                {nicknameRule}
              </Text>
              <Text style={styles.rulesText}>
                {idRule}
              </Text>
              <Text style={styles.rulesText}>
                {passwordRule}
              </Text>
              <Text style={styles.rulesText}>
                {specialCharsRule}
              </Text>
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

          <TouchableOpacity style={styles.button} onPress={handleAuth}>
            <Text style={styles.buttonText}>
              {loginButtonText}
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
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
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
