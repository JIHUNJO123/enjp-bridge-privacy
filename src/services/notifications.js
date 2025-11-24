// 푸시 알림 서비스
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// 알림이 도착했을 때 어떻게 처리할지 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,  // 알림 표시
    shouldPlaySound: true,  // 소리 재생
    shouldSetBadge: true,   // 뱃지 표시
  }),
});

// 푸시 알림 권한 요청 및 토큰 발급
export async function registerForPushNotifications() {
  let token;

  // 실제 기기에서만 작동 (시뮬레이터에서는 작동 안 함)
  if (!Device.isDevice) {
    console.log('푸시 알림은 실제 기기에서만 작동합니다.');
    return null;
  }

  // 알림 권한 요청
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('알림 권한이 거부되었습니다.');
    return null;
  }

  // Expo 푸시 토큰 발급
  try {
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: undefined, // Expo Go에서는 projectId 불필요
    })).data;
    console.log('푸시 토큰:', token);
  } catch (error) {
    console.log('푸시 토큰 발급 실패:', error.message);
    return null;
  }

  // Android 알림 채널 설정
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: '기본 알림',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}

// 푸시 알림 전송 (Expo 푸시 알림 서비스 사용)
export async function sendPushNotification(expoPushToken, title, body, data = {}) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
  };

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    console.log('푸시 알림 전송 완료');
  } catch (error) {
    console.error('푸시 알림 전송 실패:', error);
  }
}

// 로컬 알림 예약 (테스트용)
export async function scheduleLocalNotification(title, body, seconds = 5) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: title,
      body: body,
      data: { data: 'test' },
    },
    trigger: { seconds: seconds },
  });
}
