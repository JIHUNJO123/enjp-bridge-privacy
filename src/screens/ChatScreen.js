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
  Alert,
  Modal,
} from 'react-native';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { autoTranslate } from '../services/translation';
import { sendPushNotification } from '../services/notifications';
import { validateMessage } from '../services/contentFilter';
import AdMobBannerComponent from '../components/AdMobBanner';

export default function ChatScreen({ route, navigation }) {
  // route.params가 undefined일 수 있으므로 안전하게 처리
  const params = route?.params || {};
  const { chatRoomId, otherUser } = params;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [translatedMessages, setTranslatedMessages] = useState({});
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const { user, userProfile } = useAuth();
  const flatListRef = useRef(null);
  const isEnglish = (userProfile?.language || 'en') === 'en';

  useEffect(() => {
    if (!user || !user.uid || !chatRoomId) return;

    // 차단 여부 확인
    const checkBlockStatus = async () => {
      try {
        // 내가 상대방을 차단했는지 확인
        const myBlockDoc = await getDoc(doc(db, 'users', user.uid, 'blocked', otherUser.uid));
        // 상대방이 나를 차단했는지 확인
        const theirBlockDoc = await getDoc(doc(db, 'users', otherUser.uid, 'blocked', user.uid));
        
        if (myBlockDoc.exists() || theirBlockDoc.exists()) {
          // 차단된 상태면 채팅 목록으로 돌아가기
          navigation.goBack();
          
          if (Platform.OS === 'web') {
            window.alert(isEnglish 
              ? 'This conversation is no longer available.' 
              : 'この会話は利用できません。');
          } else {
            Alert.alert(
              isEnglish ? 'Blocked' : 'ブロック済み',
              isEnglish 
                ? 'This conversation is no longer available.' 
                : 'この会話は利用できません。'
            );
          }
          return true;
        }
        return false;
      } catch (error) {
        console.error('Error checking block status:', error);
        return false;
      }
    };

    // 초기 차단 여부 확인
    checkBlockStatus().then(isBlocked => {
      if (isBlocked) return;

      // 채팅방 진입 시 읽지 않은 메시지 카운트 초기화
      const resetUnreadCount = async () => {
        try {
          const chatRoomRef = doc(db, 'chatRooms', chatRoomId);
          await updateDoc(chatRoomRef, {
            [`unread_${user.uid}`]: 0,
          });
        } catch (error) {
          console.error('Error resetting unread count:', error);
        }
      };
      resetUnreadCount();
    });

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
      
      // Validate message for inappropriate content
      const validation = validateMessage(messageText);
      
      if (!validation.isValid) {
        const userLang = userProfile?.language || 'en';
        const isUserEnglish = userLang === 'en';
        
        Alert.alert(
          isUserEnglish ? 'Inappropriate Content' : '不適切なコンテンツ',
          isUserEnglish 
            ? 'This message contains inappropriate language and cannot be sent.' 
            : 'このメッセージには不適切な言葉が含まれているため、送信できません。'
        );
        setInputText('');
        return;
      }
      
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
      
      // 현재 상대방의 unread 카운트 가져오기
      const chatRoomDoc = await getDoc(chatRoomRef);
      const currentUnread = chatRoomDoc.data()?.[`unread_${otherUser.uid}`] || 0;
      
      await updateDoc(chatRoomRef, {
        lastMessage: messageText,
        lastMessageAt: new Date().toISOString(),
        [`unread_${otherUser.uid}`]: currentUnread + 1,
      });

      // 상대방에게 푸시 알림 전송 (자기 자신에게는 보내지 않음)
      // otherUser.id가 다르고, pushToken도 다를 때만 전송
      if (otherUser?.pushToken && 
          otherUser.id !== user.uid && 
          otherUser.pushToken !== userProfile?.pushToken) {
        // 알림을 받는 사람(otherUser)의 언어에 맞춤
        const isReceiverEnglish = (otherUser?.language || 'en') === 'en';
        const notificationTitle = isReceiverEnglish 
          ? `New message from ${userProfile.displayName}`
          : `${userProfile.displayName}さんからメッセージ`;
        
        await sendPushNotification(
          otherUser.pushToken,
          notificationTitle,
          messageText,
          { chatRoomId, senderId: user.uid }
        );
        console.log('푸시 알림 전송:', otherUser.displayName);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleReport = () => {
    setShowMenu(false);
    setShowReportModal(true);
  };

  const submitReport = async () => {
    if (!reportReason) {
      if (Platform.OS === 'web') {
        window.alert(isEnglish ? 'Please select a reason' : '理由を選択してください');
      } else {
        Alert.alert(
          isEnglish ? 'Error' : 'エラー',
          isEnglish ? 'Please select a reason' : '理由を選択してください'
        );
      }
      return;
    }
    
    console.log('submitReport called');
    console.log('otherUser:', otherUser);
    console.log('user:', user);
    console.log('reportReason:', reportReason);
    
    try {
      // 신고 기록 저장
      const reportRef = doc(collection(db, 'reports'));
      await setDoc(reportRef, {
        reporterId: user.uid,
        reporterName: userProfile.displayName,
        reportedUserId: otherUser.uid,
        reportedUserName: otherUser.displayName,
        chatRoomId: chatRoomId,
        reason: reportReason,
        createdAt: Timestamp.now(),
        status: 'pending',
      });
      
      setShowReportModal(false);
      setReportReason('');
      
      if (Platform.OS === 'web') {
        window.alert(
          isEnglish 
            ? 'Thank you for your report. We will review it as soon as possible.'
            : 'ご報告ありがとうございます。できるだけ早く確認いたします。'
        );
      } else {
        Alert.alert(
          isEnglish ? 'Report Submitted' : '報告完了',
          isEnglish 
            ? 'Thank you for your report. We will review it as soon as possible.'
            : 'ご報告ありがとうございます。できるだけ早く確認いたします。'
        );
      }
    } catch (error) {
      console.error('Error reporting user:', error);
      console.error('Error details:', error.code, error.message);
      if (Platform.OS === 'web') {
        window.alert(
          isEnglish ? 'Failed to submit report. Please try again.' : '報告に失敗しました。もう一度お試しください。'
        );
      } else {
        Alert.alert(
          isEnglish ? 'Error' : 'エラー',
          isEnglish ? 'Failed to submit report. Please try again.' : '報告に失敗しました。もう一度お試しください。'
        );
      }
    }
  };

  const handleBlock = async () => {
    console.log('handleBlock called');
    console.log('otherUser:', otherUser);
    console.log('user.uid:', user?.uid);
    setShowMenu(false);
    
    const confirmBlock = Platform.OS === 'web'
      ? window.confirm(
          isEnglish 
            ? `Are you sure you want to block ${otherUser?.displayName}?\n\nThis will delete the chat room.`
            : `${otherUser?.displayName}さんをブロックしますか？\n\nチャットルームが削除されます。`
        )
      : await new Promise((resolve) => {
          Alert.alert(
            isEnglish ? 'Block User' : 'ユーザーをブロック',
            isEnglish 
              ? `Are you sure you want to block ${otherUser?.displayName}?\n\nThis will delete the chat room.`
              : `${otherUser?.displayName}さんをブロックしますか？\n\nチャットルームが削除されます。`,
            [
              {
                text: isEnglish ? 'Cancel' : 'キャンセル',
                style: 'cancel',
                onPress: () => resolve(false),
              },
              {
                text: isEnglish ? 'Block' : 'ブロック',
                style: 'destructive',
                onPress: () => resolve(true),
              },
            ]
          );
        });
    
    if (!confirmBlock) return;
    
    try {
      // 차단 기록 저장
      const blockRef = doc(db, 'users', user.uid, 'blocked', otherUser.uid);
      await setDoc(blockRef, {
        blockedUserId: otherUser.uid,
        blockedUserName: otherUser.displayName,
        createdAt: Timestamp.now(),
      });
      
      if (Platform.OS === 'web') {
        window.alert(
          isEnglish 
            ? `You have blocked ${otherUser?.displayName}.`
            : `${otherUser?.displayName}さんをブロックしました。`
        );
        navigation.goBack();
      } else {
        Alert.alert(
          isEnglish ? 'User Blocked' : 'ユーザーをブロックしました',
          isEnglish 
            ? `You have blocked ${otherUser?.displayName}.`
            : `${otherUser?.displayName}さんをブロックしました。`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      if (Platform.OS === 'web') {
        window.alert(
          isEnglish ? 'Failed to block user. Please try again.' : 'ブロックに失敗しました。もう一度お試しください。'
        );
      } else {
        Alert.alert(
          isEnglish ? 'Error' : 'エラー',
          isEnglish ? 'Failed to block user. Please try again.' : 'ブロックに失敗しました。もう一度お試しください。'
        );
      }
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
              <Text style={styles.translationLabel}>{isEnglish ? 'Translation:' : '翻訳:'}</Text>
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
    return date.toLocaleTimeString(isEnglish ? 'en-US' : 'ja-JP', {
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
          {otherUser?.displayName || (isEnglish ? 'Chat' : 'チャット')} {otherUser?.language === 'en' ? 'EN' : '🇯🇵'}
        </Text>
        <TouchableOpacity onPress={() => {
          console.log('Menu button clicked');
          setShowMenu(true);
        }} style={styles.menuButton}>
          <Text style={styles.menuButtonText}>⋮</Text>
        </TouchableOpacity>
      </View>
      
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuModal}>
            <TouchableOpacity style={styles.menuItem} onPress={handleReport}>
              <Text style={styles.menuItemText}>
                {isEnglish ? '🚨 Report User' : '🚨 ユーザーを報告'}
              </Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleBlock}>
              <Text style={[styles.menuItemText, styles.menuItemDanger]}>
                {isEnglish ? '🚫 Block User' : '🚫 ユーザーをブロック'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowReportModal(false);
          setReportReason('');
        }}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowReportModal(false);
            setReportReason('');
          }}
        >
          <View style={styles.reportModal} onStartShouldSetResponder={() => true}>
            <Text style={styles.reportTitle}>
              {isEnglish ? 'Report User' : 'ユーザーを報告'}
            </Text>
            <Text style={styles.reportSubtitle}>
              {isEnglish 
                ? `Why are you reporting ${otherUser?.displayName}?`
                : `${otherUser?.displayName}さんを報告する理由は？`}
            </Text>
            
            <TouchableOpacity 
              style={[styles.reasonOption, reportReason === 'harassment' && styles.reasonSelected]}
              onPress={() => setReportReason('harassment')}
            >
              <Text style={styles.reasonText}>
                {isEnglish ? 'Harassment or bullying' : 'ハラスメントまたはいじめ'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.reasonOption, reportReason === 'inappropriate' && styles.reasonSelected]}
              onPress={() => setReportReason('inappropriate')}
            >
              <Text style={styles.reasonText}>
                {isEnglish ? 'Inappropriate content' : '不適切なコンテンツ'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.reasonOption, reportReason === 'spam' && styles.reasonSelected]}
              onPress={() => setReportReason('spam')}
            >
              <Text style={styles.reasonText}>
                {isEnglish ? 'Spam or advertising' : 'スパムまたは広告'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.reasonOption, reportReason === 'hate' && styles.reasonSelected]}
              onPress={() => setReportReason('hate')}
            >
              <Text style={styles.reasonText}>
                {isEnglish ? 'Hate speech' : 'ヘイトスピーチ'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.reasonOption, reportReason === 'other' && styles.reasonSelected]}
              onPress={() => setReportReason('other')}
            >
              <Text style={styles.reasonText}>
                {isEnglish ? 'Other' : 'その他'}
              </Text>
            </TouchableOpacity>

            <View style={styles.reportButtonContainer}>
              <TouchableOpacity 
                style={styles.reportCancelButton}
                onPress={() => {
                  setShowReportModal(false);
                  setReportReason('');
                }}
              >
                <Text style={styles.reportCancelText}>
                  {isEnglish ? 'Cancel' : 'キャンセル'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.reportSubmitButton, !reportReason && styles.reportSubmitDisabled]}
                onPress={submitReport}
                disabled={!reportReason}
              >
                <Text style={styles.reportSubmitText}>
                  {isEnglish ? 'Submit' : '送信'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      
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
    minWidth: 60,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 5,
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
  menuButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  menuButtonText: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: 'bold',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 0,
    minWidth: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  menuItem: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    minHeight: 56,
    justifyContent: 'center',
  },
  menuItemText: {
    fontSize: 17,
    color: '#000',
  },
  menuItemDanger: {
    fontSize: 17,
    color: '#FF3B30',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  reportModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  reportSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  reasonOption: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  reasonSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  reasonText: {
    fontSize: 15,
    color: '#000',
  },
  reportButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  reportCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  reportCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  reportSubmitButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
  },
  reportSubmitDisabled: {
    backgroundColor: '#ccc',
  },
  reportSubmitText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});
