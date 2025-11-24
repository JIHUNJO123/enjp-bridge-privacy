import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// 이미지 선택 및 압축
export const pickAndCompressImage = async () => {
  try {
    // 권한 요청
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permission denied');
    }

    // 이미지 선택
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (result.canceled) {
      return null;
    }

    // 이미지 압축 (최대 800px, 품질 70%)
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      result.assets[0].uri,
      [{ resize: { width: 800 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );

    return manipulatedImage.uri;
  } catch (error) {
    console.error('Error picking image:', error);
    throw error;
  }
};

// Firebase Storage에 이미지 업로드
export const uploadImageToStorage = async (imageUri, chatRoomId, userId) => {
  try {
    // URI를 Blob으로 변환
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // 파일명 생성 (timestamp + userId)
    const filename = `${Date.now()}_${userId}.jpg`;
    const storageRef = ref(storage, `chat_images/${chatRoomId}/${filename}`);

    // 업로드
    await uploadBytes(storageRef, blob);

    // 다운로드 URL 가져오기
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};
