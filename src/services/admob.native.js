import mobileAds, { AdsConsent, AdsConsentStatus } from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';

export const initializeAdMob = async () => {
  try {
    // iOS에서 ATT(App Tracking Transparency) 권한 요청
    if (Platform.OS === 'ios') {
      const consentInfo = await AdsConsent.requestInfoUpdate();
      console.log('Consent Info:', consentInfo);
      
      // 동의가 필요한 경우 동의 폼 표시
      if (
        consentInfo.status === AdsConsentStatus.REQUIRED ||
        consentInfo.status === AdsConsentStatus.UNKNOWN
      ) {
        const formResult = await AdsConsent.showForm();
        console.log('Consent Form Result:', formResult);
      }
    }
    
    // AdMob 초기화
    await mobileAds().initialize();
    console.log('AdMob 초기화 성공');
  } catch (error) {
    console.error('AdMob 초기화 실패:', error);
  }
};
