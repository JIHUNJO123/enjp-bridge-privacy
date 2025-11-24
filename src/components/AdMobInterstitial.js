import { Platform } from 'react-native';

// 플랫폼별 실제 광고 ID
const getInterstitialAdUnitID = () => {
  if (Platform.OS === 'ios') {
    return 'ca-app-pub-5837885590326347/3715416128'; // iOS Interstitial
  } else if (Platform.OS === 'android') {
    return 'ca-app-pub-5837885590326347/3523844437'; // Android Interstitial
  }
};

export async function showInterstitial() {
  // TODO: AdMob은 개발 빌드에서만 작동합니다
  console.log('Interstitial ad disabled in Expo Go - development build required');
  return;
}

