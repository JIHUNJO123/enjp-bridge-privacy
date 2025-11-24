# 한일 채팅 앱 사용 가이드

## 🚀 빠른 시작

### 1. Firebase 설정 (필수)

앱을 실행하기 전에 먼저 Firebase를 설정해야 합니다.

1. `FIREBASE_SETUP.md` 파일을 열어 단계별 지침을 따릅니다
2. Firebase Console에서 프로젝트를 생성합니다
3. `src/services/firebase.js` 파일에 Firebase 구성 정보를 입력합니다

### 2. 앱 실행

```bash
# 프로젝트 디렉토리로 이동
cd korea-japan-chat

# 의존성 설치 (이미 완료됨)
npm install

# 개발 서버 시작
npm start
```

### 3. 테스트 방법

#### 모바일에서 테스트 (권장)

1. 스마트폰에 **Expo Go** 앱 다운로드
   - [iOS - App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Android - Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. `npm start` 실행 후 나타나는 QR 코드를 스캔
3. Expo Go에서 앱이 자동으로 열립니다

#### 웹 브라우저에서 테스트

```bash
npm run web
```

브라우저에서 http://localhost:19006 이 자동으로 열립니다.

#### Android 에뮬레이터에서 테스트

```bash
npm run android
```

사전 요구사항: Android Studio + Android 에뮬레이터

#### iOS 시뮬레이터에서 테스트 (macOS만 가능)

```bash
npm run ios
```

사전 요구사항: Xcode

## 📱 앱 사용 방법

### 회원가입

1. 앱 실행 시 로그인 화면이 나타납니다
2. "계정이 없으신가요? 회원가입" 클릭
3. 다음 정보 입력:
   - 닉네임
   - 이메일
   - 비밀번호 (6자 이상)
   - 언어 선택 (한국어 🇰🇷 또는 일본어 🇯🇵)
4. "회원가입" 버튼 클릭

### 로그인

1. 이메일과 비밀번호 입력
2. "로그인" 버튼 클릭

### 새로운 채팅 시작

1. 메인 화면에서 "+ 새로운 채팅 시작" 버튼 클릭
2. 사용자 목록에서 대화하고 싶은 사람 선택
3. 채팅방이 자동으로 생성됩니다

### 메시지 보내기

1. 하단 입력창에 메시지 입력
2. "전송" 버튼 클릭
3. 메시지가 실시간으로 전송됩니다

### 번역 기능

- 상대방이 보낸 메시지는 자동으로 번역됩니다
- 원문과 번역문이 모두 표시됩니다
- 예시:
  ```
  こんにちは
  번역: 안녕하세요
  ```

## 🧪 테스트 시나리오

### 시나리오 1: 한일 대화 테스트

1. **한국어 계정** 생성
   - 닉네임: 한국사용자
   - 언어: 한국어 선택

2. **일본어 계정** 생성 (다른 이메일 사용)
   - 닉네임: 日本ユーザー
   - 언어: 일본어 선택

3. 한국어 계정에서 일본어 사용자와 채팅 시작

4. 메시지 교환 테스트:
   - 한국어 → 일본어 번역 확인
   - 일본어 → 한국어 번역 확인

### 시나리오 2: 다중 채팅방

1. 여러 사용자와 채팅방 생성
2. 채팅방 목록에서 최근 메시지 순으로 정렬 확인
3. 각 채팅방에서 메시지 송수신 테스트

## ⚙️ 설정 및 커스터마이징

### 번역 API 변경

기본적으로 무료 MyMemory API를 사용합니다. 
Google Translate API로 변경하려면:

1. Google Cloud Console에서 API 키 발급
2. `src/services/translation.js` 파일 수정
3. API 키와 엔드포인트 업데이트

### 스타일 커스터마이징

각 화면의 `styles` 객체에서 색상, 폰트 등을 수정할 수 있습니다:

- `LoginScreen.js`: 로그인 화면 스타일
- `ChatListScreen.js`: 채팅 목록 스타일
- `ChatScreen.js`: 채팅 화면 스타일

예시:
```javascript
const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF', // 원하는 색상으로 변경
    // ...
  },
});
```

## 🐛 일반적인 문제 해결

### "Firebase: Error (auth/...)"
- Firebase 설정이 올바른지 확인
- `src/services/firebase.js`의 구성 정보 재확인
- Firebase Console에서 Authentication 활성화 확인

### 번역이 표시되지 않음
- 인터넷 연결 확인
- 콘솔에서 API 오류 확인
- MyMemory API 사용량 제한 확인

### 메시지가 전송되지 않음
- Firebase Firestore 규칙 확인
- 사용자가 로그인되어 있는지 확인
- 네트워크 연결 확인

### 앱이 느림
- Firebase 인덱스 생성 확인
- 네트워크 속도 확인
- 캐시 삭제: `expo start -c`

## 📊 성능 최적화 팁

1. **이미지 최적화**
   - assets 폴더의 이미지를 최적화된 크기로 교체

2. **메시지 페이지네이션**
   - 많은 메시지가 있을 경우 Firestore 쿼리에 limit 추가

3. **번역 캐싱**
   - 이미 번역된 메시지는 로컬에 캐시하여 재사용

## 🔒 보안 주의사항

1. **Firebase 보안 규칙**
   - 프로덕션 배포 전 `FIREBASE_SETUP.md`의 프로덕션 규칙 적용

2. **API 키 보호**
   - `.env` 파일 사용하여 환경 변수로 관리
   - Git에 커밋하지 않기 (.gitignore에 추가)

3. **사용자 데이터**
   - 비밀번호는 Firebase Authentication이 자동으로 암호화
   - 개인정보는 최소한만 수집

## 📞 도움말

문제가 발생하면:
1. README.md의 문제 해결 섹션 확인
2. FIREBASE_SETUP.md의 설정 재확인
3. 콘솔 로그에서 오류 메시지 확인
4. Firebase Console에서 데이터 확인

---

즐거운 개발 되세요! 🎉
