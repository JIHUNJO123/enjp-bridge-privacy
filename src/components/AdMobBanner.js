import React from 'react';
import { View, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';

// 웹에서는 AdMob을 import하지 않음
let BannerAd, BannerAdSize, TestIds;
if (Platform.OS !== 'web') {
  const admob = require('react-native-google-mobile-ads');
  BannerAd = admob.BannerAd;
  BannerAdSize = admob.BannerAdSize;
  TestIds = admob.TestIds;
}

export default function AdMobBannerComponent({ screenType }) {
  const { adsRemoved } = useAuth();
  
  console.log('AdMobBanner rendering for:', screenType, 'Platform:', Platform.OS, 'adsRemoved:', adsRemoved);
  
  // 광고 제거 구매 시 광고 숨김
  if (adsRemoved) {
    return null;
  }
  
  // 웹에서는 광고 대신 빈 공간 표시
  if (Platform.OS === 'web') {
    return <View style={{ height: 50 }} />;
  }

  // 개발 중에는 테스트 광고 ID 사용, 프로덕션에서는 실제 ID 사용
  const __DEV__ = false; // 프로덕션 빌드
  
  const getAdUnitID = () => {
    // 개발 모드에서는 테스트 광고 사용
    if (__DEV__) {
      console.log('Using test ad ID');
      return TestIds.BANNER;
    }
    
    // 프로덕션에서는 실제 광고 ID 사용
    if (Platform.OS === 'ios') {
      // 채팅 화면은 chatList와 동일한 광고 사용
      if (screenType === 'chatList' || screenType === 'chat') {
        console.log('iOS ChatList ad ID');
        return 'ca-app-pub-5837885590326347/2286058033'; // ChatListScreen iOS
      } else {
        console.log('iOS Login ad ID');
        return 'ca-app-pub-5837885590326347/4912221370'; // LoginScreen iOS
      }
    } else if (Platform.OS === 'android') {
      // 채팅 화면은 chatList와 동일한 광고 사용
      if (screenType === 'chatList' || screenType === 'chat') {
        console.log('Android ChatList ad ID');
        return 'ca-app-pub-5837885590326347/5566827493'; // ChatListScreen Android
      } else {
        console.log('Android Login ad ID');
        return 'ca-app-pub-5837885590326347/2937521075'; // LoginScreen Android
      }
    }
  };

  return (
    <View style={{ alignItems: 'center', marginVertical: 10 }}>
      <BannerAd
        unitId={getAdUnitID()}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdFailedToLoad={(error) => {
          console.error('Banner ad failed to load:', error);
        }}
        onAdLoaded={() => {
          console.log('Banner ad loaded successfully');
        }}
      />
    </View>
  );
}
