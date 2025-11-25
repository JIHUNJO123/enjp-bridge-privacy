import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { autoTranslate } from '../services/translation';
import { sendPushNotification } from '../services/notifications';
import AdMobBannerComponent from '../components/AdMobBanner';

export default function ChatScreen({ route, navigation }) {
  // route.params가 undefined일 수 있으므로 안전하게 처리
  const params = route?.params || {};
  const { chatRoomId, otherUser } = params;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [translatedMessages, setTranslatedMessages] = useState({});
  const { user, userProfile } = useAuth();
  const flatListRef = useRef(null);
  const isEnglish = (userProfile?.language || 'en') === 'en';

  useEffect(() => {
    if (!user || !user.uid || !chatRoomId) return;

    // 메시지 실시간 구독
    const messagesRef = collection(db, 'chatRooms', chatRoomId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log('Messages received:', msgs.length);
      setMessages(msgs);

      // 메시지 자동 번역
      for (const msg of msgs) {
        if (msg.senderId !== user.uid && !translatedMessages[msg.id]) {
          console.log('Translating message:', msg.id, msg.text, 'to', userProfile.language);
          const translated = await autoTranslate(msg.text, userProfile.language);
          console.log('Translation result:', translated);
          setTranslatedMessages(prev => ({
            ...prev,
            [msg.id]: translated,
          }));
        }
      }
    });

    return () => unsubscribe();
  }, [chatRoomId]);

  useEffect(() => {
    // 새 메시지가 추가되면 스크롤
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const sendMessage = async () => {
    if (inputText.trim() === '') return;
    if (!user || !user.uid) return;

    try {
      const messageText = inputText.trim();
      setInputText('');

      // 메시지 저장
      const messagesRef = collection(db, 'chatRooms', chatRoomId, 'messages');
      await addDoc(messagesRef, {
        text: messageText,
        senderId: user.uid,
        senderName: userProfile.displayName,
        createdAt: new Date().toISOString(),
      });

      // 채팅방 정보 업데이트
      const chatRoomRef = doc(db, 'chatRooms', chatRoomId);
      await updateDoc(chatRoomRef, {
        lastMessage: messageText,
        lastMessageAt: new Date().toISOString(),
      });

      // 상대방에게 푸시 알림 전송 (자기 자신에게는 보내지 않음)
      // otherUser.id가 다르고, pushToken도 다를 때만 전송
      if (otherUser?.pushToken && 
          otherUser.id !== user.uid && 
          otherUser.pushToken !== userProfile?.pushToken) {
        const isKorean = (userProfile?.language || 'ko') === 'ko';
        await sendPushNotification(
          otherUser.pushToken,
          `${userProfile.displayName}${isKorean ? '님의 메시지' : 'さんからメッセージ'}`,
          messageText,
          { chatRoomId, senderId: user.uid }
        );
        console.log('푸시 알림 전송:', otherUser.displayName);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const renderMessage = ({ item }) => {
    if (!user || !user.uid) return null;
    
    const isMyMessage = item.senderId === user.uid;
    const showTranslation = !isMyMessage && translatedMessages[item.id];

    return (
      <View
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
        ]}
      >
        {!isMyMessage && (
          <Text style={styles.senderName}>{item.senderName}</Text>
        )}
        
        <View
          style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText,
            ]}
          >
            {item.text}
          </Text>
          
          {showTranslation && translatedMessages[item.id] !== item.text && (
            <View style={styles.translationContainer}>
              <Text style={styles.translationLabel}>번역:</Text>
              <Text style={styles.translationText}>
                {translatedMessages[item.id]}
              </Text>
            </View>
          )}
        </View>
        
        <Text style={styles.messageTime}>
          {formatTime(item.createdAt)}
        </Text>
      </View>
    );
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>{isEnglish ? "← Back" : "← 戻る"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {otherUser?.displayName || '채팅'} {otherUser?.language === 'en' ? 'EN' : '🇯🇵'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder={isEnglish ? "Type a message..." : "メッセージを入力してください..."}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim()}
        >
          <Text style={styles.sendButtonText}>{isEnglish ? "Send" : "送信"}</Text>
        </TouchableOpacity>
      </View>
      
      <AdMobBannerComponent screenType="chat" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingTop: Platform.OS === 'ios' ? 50 : 15,
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  headerSpacer: {
    width: 50,
  },
  messagesList: {
    padding: 15,
  },
  messageContainer: {
    marginBottom: 15,
    maxWidth: '80%',
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    marginLeft: 10,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 15,
    marginBottom: 5,
  },
  myMessageBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 5,
  },
  otherMessageBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 5,
  },
  messageText: {
    fontSize: 16,
  },
  myMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#000',
  },
  translationContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  translationLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 3,
  },
  translationText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
    marginHorizontal: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
