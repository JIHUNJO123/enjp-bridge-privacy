import React from 'react';
import { View, Platform, Text } from 'react-native';

export default function AdMobBannerComponent({ screenType }) {
  // 웹에서는 광고 대신 빈 공간 표시
  if (Platform.OS === 'web') {
    return <View style={{ height: 50 }} />;
  }

  // 플랫폼별 실제 광고 ID 사용
  const getAdUnitID = () => {
    if (Platform.OS === 'ios') {
      if (screenType === 'chatList') {
        return 'ca-app-pub-5837885590326347/2286058033'; // ChatListScreen iOS
      } else {
        return 'ca-app-pub-5837885590326347/4912221370'; // LoginScreen iOS
      }
    } else if (Platform.OS === 'android') {
      if (screenType === 'chatList') {
        return 'ca-app-pub-5837885590326347/5566827493'; // ChatListScreen Android
      } else {
        return 'ca-app-pub-5837885590326347/2937521075'; // LoginScreen Android
      }
    }
  };

  // TODO: AdMob은 개발 빌드에서만 작동합니다
  return (
    <View style={{ alignItems: 'center', marginVertical: 10, height: 50, justifyContent: 'center' }}>
      <Text style={{ fontSize: 12, color: '#999' }}>광고 영역 (개발 빌드 필요)</Text>
    </View>
  );
}
