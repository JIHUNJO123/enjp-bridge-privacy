# 개발자를 위한 기술 문서

## 프로젝트 아키텍처

### 기술 스택

- **프론트엔드**: React Native (Expo)
- **네비게이션**: React Navigation v7
- **백엔드**: Firebase
  - Authentication (이메일/비밀번호)
  - Firestore (실시간 데이터베이스)
- **번역**: MyMemory Translation API (무료)

### 폴더 구조

```
src/
├── components/          # 재사용 가능한 UI 컴포넌트
│   ├── LoadingScreen.js
│   └── MessageBubble.js
├── context/            # React Context (전역 상태 관리)
│   └── AuthContext.js  # 인증 상태 관리
├── navigation/         # 네비게이션 설정
│   └── AppNavigator.js # 라우팅 로직
├── screens/           # 화면 컴포넌트
│   ├── LoginScreen.js
│   ├── ChatListScreen.js
│   ├── UserListScreen.js
│   └── ChatScreen.js
└── services/          # 외부 서비스 연동
    ├── firebase.js    # Firebase 초기화
    └── translation.js # 번역 API
```

## 데이터 모델

### Users Collection

```typescript
interface User {
  uid: string;              // Firebase Auth UID
  email: string;            // 사용자 이메일
  displayName: string;      // 닉네임
  language: 'ko' | 'ja';   // 선호 언어
  createdAt: string;        // ISO 8601 timestamp
}
```

### ChatRooms Collection

```typescript
interface ChatRoom {
  participants: string[];   // [userId1, userId2]
  participantsInfo: {
    [userId: string]: {
      displayName: string;
      language: 'ko' | 'ja';
    }
  };
  lastMessage: string;      // 마지막 메시지 텍스트
  lastMessageAt: string;    // ISO 8601 timestamp
  createdAt: string;        // ISO 8601 timestamp
}
```

### Messages Subcollection (chatRooms/{chatRoomId}/messages)

```typescript
interface Message {
  text: string;            // 메시지 내용
  senderId: string;        // 발신자 UID
  senderName: string;      // 발신자 닉네임
  createdAt: string;       // ISO 8601 timestamp
}
```

## 주요 기능 구현

### 1. 인증 (AuthContext.js)

```javascript
// 회원가입
const signup = async (email, password, displayName, language) => {
  // 1. Firebase Authentication으로 계정 생성
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // 2. Firestore에 사용자 프로필 저장
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email, displayName, language,
    createdAt: new Date().toISOString(),
  });
};
```

### 2. 실시간 채팅 (ChatScreen.js)

```javascript
// 메시지 구독 (실시간 업데이트)
const messagesRef = collection(db, 'chatRooms', chatRoomId, 'messages');
const q = query(messagesRef, orderBy('createdAt', 'asc'));

onSnapshot(q, (snapshot) => {
  const msgs = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
  setMessages(msgs);
});
```

### 3. 자동 번역 (translation.js)

```javascript
export const autoTranslate = async (text, userLanguage) => {
  // 언어 감지
  const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text);
  const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
  
  // 필요시 번역
  if (hasKorean && userLanguage === 'ja') {
    return await translateKoreanToJapanese(text);
  } else if (hasJapanese && userLanguage === 'ko') {
    return await translateJapaneseToKorean(text);
  }
  
  return text;
};
```

## 성능 최적화

### 1. Firestore 쿼리 최적화

```javascript
// 복합 인덱스 사용
query(
  collection(db, 'chatRooms'),
  where('participants', 'array-contains', userId),
  orderBy('lastMessageAt', 'desc')
);
```

### 2. 번역 캐싱

```javascript
const [translatedMessages, setTranslatedMessages] = useState({});

// 이미 번역된 메시지는 재번역하지 않음
if (!translatedMessages[msg.id]) {
  const translated = await autoTranslate(msg.text, userLanguage);
  setTranslatedMessages(prev => ({ ...prev, [msg.id]: translated }));
}
```

### 3. 메모이제이션

```javascript
// React.memo로 불필요한 리렌더링 방지
const MessageItem = React.memo(({ message, isMyMessage }) => {
  // ...
});
```

## API 제한사항

### MyMemory Translation API

- **무료 플랜**: 
  - 10,000 단어/일
  - API 키 불필요
- **제한 초과 시**: 
  - 번역 실패 → 원문 반환
  - Google Translate API로 업그레이드 권장

### Firebase 무료 플랜 (Spark)

- **Firestore**:
  - 읽기: 50,000회/일
  - 쓰기: 20,000회/일
  - 저장소: 1GB
- **Authentication**: 무제한

## 보안 고려사항

### Firestore 보안 규칙

```javascript
// 프로덕션 규칙
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    match /chatRooms/{chatRoomId} {
      allow read, write: if request.auth.uid in resource.data.participants;
      
      match /messages/{messageId} {
        allow read: if request.auth != null;
        allow create: if request.auth.uid == request.resource.data.senderId;
      }
    }
  }
}
```

### 클라이언트 측 유효성 검사

```javascript
// 입력 검증
if (!email || !password) {
  Alert.alert('오류', '이메일과 비밀번호를 입력해주세요.');
  return;
}

// 메시지 길이 제한
<TextInput maxLength={500} />
```

## 테스트

### 단위 테스트 (추가 예정)

```bash
npm install --save-dev jest @testing-library/react-native
npm test
```

### E2E 테스트 (추가 예정)

```bash
npm install --save-dev detox
detox test
```

## 배포

### Expo EAS Build

```bash
# EAS CLI 설치
npm install -g eas-cli

# EAS 로그인
eas login

# 빌드 설정
eas build:configure

# Android 빌드
eas build --platform android

# iOS 빌드
eas build --platform ios
```

### 환경 변수 설정

```bash
# .env 파일 생성
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
# ...

# EAS에 환경 변수 추가
eas secret:create --scope project --name FIREBASE_API_KEY --value your_api_key
```

## 확장 가능성

### 추가 가능한 기능

1. **그룹 채팅**
   - participants 배열 확장
   - 채팅방 타입 추가 (1:1, group)

2. **이미지/파일 전송**
   - Firebase Storage 사용
   - 미디어 메시지 타입 추가

3. **푸시 알림**
   - Expo Notifications
   - Firebase Cloud Messaging

4. **읽음 표시**
   - lastReadAt 필드 추가
   - 읽지 않은 메시지 카운트

5. **타이핑 인디케이터**
   - Firestore Realtime Updates
   - isTyping 상태 관리

## 디버깅

### React Native Debugger

```bash
# Chrome DevTools
Ctrl+M (Android) / Cmd+D (iOS) → Debug

# Flipper
npx react-native-flipper
```

### Firebase Emulator (로컬 개발)

```bash
firebase init emulators
firebase emulators:start
```

## 기여 가이드라인

1. 기능 브랜치 생성
2. 코드 작성 및 테스트
3. Pull Request 생성
4. 코드 리뷰 후 병합

## 라이선스

MIT License
