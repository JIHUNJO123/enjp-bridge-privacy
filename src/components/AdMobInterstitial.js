import { Platform } from 'react-native';

// 웹에서는 AdMob을 import하지 않음
let InterstitialAd, AdEventType, TestIds;
if (Platform.OS !== 'web') {
  const admob = require('react-native-google-mobile-ads');
  InterstitialAd = admob.InterstitialAd;
  AdEventType = admob.AdEventType;
  TestIds = admob.TestIds;
}

// 개발 중에는 테스트 광고 ID 사용
const __DEV__ = false; // 프로덕션 빌드 시 false로 변경

// 플랫폼별 광고 ID
const getInterstitialAdUnitID = () => {
  // 개발 모드에서는 테스트 광고 사용
  if (__DEV__) {
    return TestIds.INTERSTITIAL;
  }
  
  // 프로덕션에서는 실제 광고 ID 사용
  if (Platform.OS === 'ios') {
    return 'ca-app-pub-5837885590326347/3715416128'; // iOS Interstitial
  } else if (Platform.OS === 'android') {
    return 'ca-app-pub-5837885590326347/3523844437'; // Android Interstitial
  }
};

let interstitial = null;

// 광고 미리 로드
const loadInterstitial = () => {
  // 웹에서는 광고 로드하지 않음
  if (Platform.OS === 'web') {
    return;
  }
  
  interstitial = InterstitialAd.createForAdRequest(getInterstitialAdUnitID(), {
    requestNonPersonalizedAdsOnly: true,
  });

  interstitial.addAdEventListener(AdEventType.LOADED, () => {
    console.log('Interstitial ad loaded');
  });

  interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
    console.error('Interstitial ad error:', error);
  });

  interstitial.load();
};

// 앱 시작 시 광고 로드 (웹 제외)
if (Platform.OS !== 'web') {
  loadInterstitial();
}

export async function showInterstitial() {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    if (interstitial && interstitial.loaded) {
      await interstitial.show();
      // 광고를 보여준 후 다음 광고 미리 로드
      loadInterstitial();
    } else {
      console.log('Interstitial ad not ready yet');
      // 광고가 준비되지 않았다면 로드 시도
      loadInterstitial();
    }
  } catch (error) {
    console.error('Error showing interstitial:', error);
  }
}

