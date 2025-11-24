# ENJP Bridge - English-Japanese Chat App

Real-time chat application connecting English and Japanese speakers with automatic translation.

## 📱 주요 기능

- ✅ 영어/일본어 사용자 인증 및 회원가입
- ✅ 이메일/닉네임 중복 체크
- ✅ 실시간 1:1 채팅
- ✅ 자동 메시지 번역
- ✅ 채팅 요청/수락 시스템
- ✅ 푸시 알림 (새 메시지, 채팅 요청)
- ✅ 사용자 목록 및 검색
- ✅ 채팅방 관리

## 🛠 기술 스택

- **프레임워크**: React Native + Expo
- **백엔드**: Firebase (Authentication + Firestore)
- **네비게이션**: React Navigation
- **번역 API**: MyMemory Translation API (무료)

## 📋 사전 요구사항

1. Node.js (v14 이상)
2. npm 또는 yarn
3. Expo CLI (`npm install -g expo-cli`)
4. Firebase 프로젝트
5. Expo Go 앱 (모바일 테스트용)

## 🚀 설치 및 실행

### 1. Firebase 설정

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. 새 프로젝트 생성
3. Authentication 활성화 (이메일/비밀번호 로그인 방식 선택)
4. Firestore Database 생성 (테스트 모드로 시작)
5. 프로젝트 설정에서 웹 앱 추가
6. Firebase 구성 정보 복사

### 2. Firebase 구성 파일 업데이트

`src/services/firebase.js` 파일을 열고 Firebase 구성 정보를 업데이트하세요:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 3. Firestore 보안 규칙 설정

Firebase Console > Firestore Database > 규칙에서 다음 규칙을 설정하세요:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자 컬렉션
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if true;  // 회원가입 시 인증 전 생성 허용
      allow update: if request.auth != null && request.auth.uid == userId;
      allow delete: if request.auth != null && request.auth.uid == userId;
    }
    
    // 채팅방 컬렉션
    match /chatRooms/{chatRoomId} {
      // 읽기: 인증된 사용자이고 참여자인 경우
      allow read: if request.auth != null && 
        request.auth.uid in resource.data.participants;
      
      // 생성: 인증된 사용자이고 자신이 참여자에 포함된 경우
      allow create: if request.auth != null && 
        request.auth.uid in request.resource.data.participants;
      
      // 업데이트: 인증된 사용자이고 참여자인 경우
      allow update: if request.auth != null && 
        request.auth.uid in resource.data.participants;
      
      // 삭제: 인증된 사용자이고 참여자인 경우
      allow delete: if request.auth != null && 
        request.auth.uid in resource.data.participants;
      
      // 메시지 서브컬렉션
      match /messages/{messageId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null;
      }
    }
  }
}
```

### 4. 패키지 설치

```bash
cd korea-japan-chat
npm install
```

### 5. 앱 실행

```bash
npm start
```

Expo Go 앱에서 QR 코드를 스캔하여 테스트할 수 있습니다.

## 📱 플랫폼별 실행

- **Android**: `npm run android`
- **iOS**: `npm run ios` (macOS 필요)
- **Web**: `npm run web`

## 📂 프로젝트 구조

```
korea-japan-chat/
├── App.js                      # 메인 앱 진입점
├── src/
│   ├── screens/               # 화면 컴포넌트
│   │   ├── LoginScreen.js     # 로그인/회원가입
│   │   ├── ChatListScreen.js  # 채팅방 목록
│   │   ├── UserListScreen.js  # 사용자 목록
│   │   └── ChatScreen.js      # 채팅 화면
│   ├── navigation/            # 네비게이션 설정
│   │   └── AppNavigator.js    # 라우팅
│   ├── services/              # 서비스 레이어
│   │   ├── firebase.js        # Firebase 설정
│   │   └── translation.js     # 번역 서비스
│   └── context/               # React Context
│       └── AuthContext.js     # 인증 상태 관리
└── package.json
```

## 🔧 주요 기능 설명

### 1. 회원가입 및 로그인
-아이디/비밀번호 설정정
- 언어 선택 (영어/일본어)
- 닉네임 설정

### 2. 채팅 기능
- 실시간 메시지 송수신
- 자동 언어 감지 및 번역
- 번역문과 원문 동시 표시

### 3. 사용자 관리
- 다른 언어 사용자 목록 표시
- 채팅방 자동 생성

## 🌐 번역 API 변경

기본적으로 무료 MyMemory Translation API를 사용합니다. 
더 나은 번역 품질을 위해 Google Translate API로 변경할 수 있습니다:

1. [Google Cloud Console](https://console.cloud.google.com/)에서 API 키 발급
2. Translation API 활성화
3. `src/services/translation.js` 파일 수정

```javascript
// Google Translate API 예시
const GOOGLE_API_KEY = 'YOUR_GOOGLE_API_KEY';
const GOOGLE_TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2';

export const translateText = async (text, sourceLang, targetLang) => {
  const response = await fetch(`${GOOGLE_TRANSLATE_URL}?key=${GOOGLE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: text,
      source: sourceLang,
      target: targetLang,
    }),
  });
  const data = await response.json();
  return data.data.translations[0].translatedText;
};
```

## 🐛 문제 해결

### Firebase 연결 오류
- Firebase 구성 정보가 정확한지 확인
- Firebase 프로젝트에서 웹 앱이 등록되어 있는지 확인

### 번역이 작동하지 않음
- 인터넷 연결 확인
- API 사용량 제한 확인
- 콘솔에서 에러 메시지 확인

### 앱이 실행되지 않음
- `npm install` 재실행
- 캐시 삭제: `expo start -c`
- Node.js 버전 확인

## 📝 개발 계획

- [ ] 그룹 채팅 기능
- [ ] 이미지/파일 전송
- [✓] 푸시 알림
- [ ] 음성 메시지
- [ ] 오프라인 모드
- [ ] 다크 모드

## 📄 라이선스

MIT License

## 🤝 기여

이슈와 풀 리퀘스트는 언제나 환영합니다!

---

Made with ❤️ for English-Japan friendship
