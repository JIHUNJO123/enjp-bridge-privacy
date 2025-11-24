# Firebase 설정 가이드

이 문서는 한일 채팅 앱을 위한 Firebase 설정 방법을 자세히 안내합니다.

## 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 (예: "korea-japan-chat")
4. Google 애널리틱스 설정 (선택사항)
5. "프로젝트 만들기" 클릭

## 2. Authentication 설정

1. Firebase Console > 빌드 > Authentication 선택
2. "시작하기" 클릭
3. "Sign-in method" 탭 선택
4. "이메일/비밀번호" 제공업체 선택
5. 활성화 토글 켜기
6. "저장" 클릭

## 3. Firestore Database 생성

1. Firebase Console > 빌드 > Firestore Database 선택
2. "데이터베이스 만들기" 클릭
3. "테스트 모드에서 시작" 선택 (개발 중)
4. 위치 선택 (asia-northeast3 - 서울 권장)
5. "사용 설정" 클릭

## 4. 웹 앱 추가

1. Firebase Console > 프로젝트 설정 (톱니바퀴 아이콘)
2. "내 앱" 섹션에서 웹 아이콘 (</>) 클릭
3. 앱 닉네임 입력 (예: "Korea Japan Chat Web")
4. "앱 등록" 클릭
5. Firebase SDK 구성 정보 복사

## 5. Firebase 구성 정보 업데이트

프로젝트의 `src/services/firebase.js` 파일을 열고 다음과 같이 업데이트하세요:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890abcdef"
};
```

## 6. Firestore 보안 규칙 설정

### 개발 중 (테스트용)

Firebase Console > Firestore Database > 규칙 탭에서:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 프로덕션 (보안 강화)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자 프로필
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && request.auth.uid == userId;
      allow delete: if false;
    }
    
    // 채팅방
    match /chatRooms/{chatRoomId} {
      allow read: if request.auth != null && 
                     request.auth.uid in resource.data.participants;
      allow create: if request.auth != null && 
                       request.auth.uid in request.resource.data.participants;
      allow update: if request.auth != null && 
                       request.auth.uid in resource.data.participants;
      allow delete: if false;
      
      // 채팅 메시지
      match /messages/{messageId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null && 
                         request.auth.uid == request.resource.data.senderId;
        allow update, delete: if false;
      }
    }
  }
}
```

## 7. Firestore 인덱스 생성

채팅방 목록을 빠르게 불러오기 위한 복합 인덱스가 필요합니다.

1. Firebase Console > Firestore Database > 색인 탭
2. "복합 색인 추가" 클릭
3. 다음 정보 입력:
   - 컬렉션 ID: `chatRooms`
   - 필드 1: `participants` (배열 포함)
   - 필드 2: `lastMessageAt` (내림차순)
4. "색인 만들기" 클릭

또는 앱 실행 중 Firestore 콘솔에 나타나는 링크를 클릭하여 자동으로 생성할 수 있습니다.

## 8. 데이터 구조

### users 컬렉션

```javascript
{
  uid: "user123",
  email: "user@example.com",
  displayName: "사용자이름",
  language: "ko", // 'ko' 또는 'ja'
  createdAt: "2025-11-21T12:00:00.000Z"
}
```

### chatRooms 컬렉션

```javascript
{
  participants: ["user1", "user2"],
  participantsInfo: {
    user1: {
      displayName: "한국사용자",
      language: "ko"
    },
    user2: {
      displayName: "日本ユーザー",
      language: "ja"
    }
  },
  lastMessage: "마지막 메시지 내용",
  lastMessageAt: "2025-11-21T12:00:00.000Z",
  createdAt: "2025-11-21T12:00:00.000Z"
}
```

### messages 서브컬렉션 (chatRooms/{chatRoomId}/messages)

```javascript
{
  text: "메시지 내용",
  senderId: "user123",
  senderName: "사용자이름",
  createdAt: "2025-11-21T12:00:00.000Z"
}
```

## 9. Firebase 사용량 모니터링

1. Firebase Console > 사용량 및 결제
2. 무료 Spark 플랜 제한:
   - Firestore: 읽기 50,000회/일, 쓰기 20,000회/일
   - Authentication: 무제한 (무료)
3. 사용량 알림 설정 권장

## 10. 환경 변수 관리 (선택사항)

보안을 위해 Firebase 구성 정보를 환경 변수로 관리할 수 있습니다:

1. 프로젝트 루트에 `.env` 파일 생성:

```env
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_app_id
```

2. `babel.config.js`에 플러그인 추가:

```bash
npm install --save-dev react-native-dotenv
```

```javascript
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    ['module:react-native-dotenv']
  ]
};
```

3. `firebase.js`에서 환경 변수 사용:

```javascript
import { 
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID
} from '@env';

const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID
};
```

4. `.gitignore`에 `.env` 추가

## 문제 해결

### "Firebase: Error (auth/configuration-not-found)"
- Firebase 구성 정보가 올바른지 확인
- 웹 앱이 Firebase Console에 등록되어 있는지 확인

### "Missing or insufficient permissions"
- Firestore 보안 규칙 확인
- 사용자가 로그인되어 있는지 확인

### 인덱스 관련 오류
- Firebase Console에서 제공하는 링크를 클릭하여 인덱스 자동 생성
- 인덱스 생성 완료까지 몇 분 소요

---

설정이 완료되면 앱을 실행하여 테스트하세요!
