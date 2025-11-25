import mobileAds from 'react-native-google-mobile-ads';

export const initializeAdMob = async () => {
  try {
    await mobileAds().initialize();
    console.log('AdMob 초기화 성공');
  } catch (error) {
    console.error('AdMob 초기화 실패:', error);
  }
};
