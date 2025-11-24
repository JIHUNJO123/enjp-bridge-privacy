# AdMob 광고 ID 교체 가이드

## 받아야 할 ID:

### 1. 앱 ID (app.json에 입력)
- Android: ca-app-pub-XXXXXXXX~XXXXXXXXXX
- iOS: ca-app-pub-XXXXXXXX~XXXXXXXXXX

### 2. 배너 광고 ID (BannerAd.js에 입력)
- Android: ca-app-pub-XXXXXXXX/XXXXXXXXXX
- iOS: ca-app-pub-XXXXXXXX/XXXXXXXXXX

### 3. 전면 광고 ID (interstitialAd.js에 입력)
- Android: ca-app-pub-XXXXXXXX/XXXXXXXXXX
- iOS: ca-app-pub-XXXXXXXX/XXXXXXXXXX

## 교체 방법:

### 1. app.json
```json
"android": {
  "config": {
    "googleMobileAdsAppId": "여기에-실제-앱-ID-입력"
  }
}
```

### 2. src/components/BannerAd.js
```javascript
const adUnitId = Platform.select({
  ios: '여기에-iOS-배너-ID-입력',
  android: '여기에-Android-배너-ID-입력',
});
```

### 3. src/services/interstitialAd.js
```javascript
const adUnitId = Platform.select({
  ios: '여기에-iOS-전면-ID-입력',
  android: '여기에-Android-전면-ID-입력',
});
```

## 주의사항:
- 테스트 ID로는 실제 수익 발생 안 됨
- 실제 ID로 변경 후 앱 재배포 필요
- Play Store 배포 전에 반드시 교체!
