import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { initializeAdMob } from './src/services/admob';

export default function App() {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // 웹에서는 알림 기능 비활성화
    if (Platform.OS !== 'web') {
      // AdMob 초기화
      initializeAdMob();

      // 알림이 도착했을 때 (앱이 포그라운드에 있을 때)
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log('알림 도착:', notification);
      });

      // 알림을 탭했을 때
      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('알림 탭:', response);
        const data = response.notification.request.content.data;
        // 여기서 특정 채팅방으로 이동하는 로직 추가 가능
        if (data.chatRoomId) {
          console.log('채팅방으로 이동:', data.chatRoomId);
        }
      });
    }

    return () => {
      if (Platform.OS !== 'web') {
        if (notificationListener.current) {
          notificationListener.current.remove();
        }
        if (responseListener.current) {
          responseListener.current.remove();
        }
      }
    };
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </AuthProvider>
  );
}
