import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { collection, query, where, onSnapshot, getDoc, updateDoc, serverTimestamp, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import AdMobBannerComponent from '../components/AdMobBanner';

export default function ChatListScreen({ navigation }) {
  const [chatRooms, setChatRooms] = useState([]);
  const { user, userProfile, logout, deleteAccount } = useAuth();

  useEffect(() => {
    if (!user) return;

    console.log('Setting up ChatList listener for user:', user.uid);

    // 사용자가 참여한 채팅방 가져오기 (orderBy 제거하여 인덱스 문제 방지)
    const q = query(
      collection(db, 'chatRooms'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      console.log('ChatList snapshot updated, docs count:', snapshot.docs.length);
      const rooms = [];
      
      for (const docSnap of snapshot.docs) {
        const roomData = docSnap.data();
        console.log('Room:', docSnap.id, 'Status:', roomData.status, 'RequestedBy:', roomData.requestedBy);
        
        // 거절된 채팅방은 목록에서 제외
        if (roomData.status === 'rejected') {
          console.log('Skipping rejected room:', docSnap.id);
          continue;
        }
        
        // 상대방 정보 가져오기
        const otherUserId = roomData.participants.find(id => id !== user.uid);
        if (otherUserId) {
          try {
            const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));
            if (!otherUserDoc.exists()) {
              console.log('Skipping room - user does not exist:', otherUserId);
              continue;
            }
            
            const otherUser = otherUserDoc.data();
            
            // 탈퇴한 사용자와의 채팅방은 목록에서 제외
            if (otherUser.deleted) {
              console.log('Skipping room - user is deleted:', otherUser.displayName);
              continue;
            }
            
            rooms.push({
              id: docSnap.id,
              ...roomData,
              otherUser,
            });
          } catch (error) {
            console.error('Error fetching other user:', otherUserId, error);
          }
        }
      }
      
      // lastMessageAt 기준으로 정렬
      rooms.sort((a, b) => {
        const aTime = a.lastMessageAt?.toDate?.() || new Date(a.lastMessageAt || 0);
        const bTime = b.lastMessageAt?.toDate?.() || new Date(b.lastMessageAt || 0);
        return bTime - aTime;
      });
      
      console.log('Setting chat rooms:', rooms.length, 'rooms');
      setChatRooms(rooms);
    }, (error) => {
      console.error('ChatList snapshot error:', error);
      console.error('Error details:', error.message, error.code);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    const isEnglish = (userProfile?.language || 'en') === 'en';
    // 웹에서는 window.confirm 사용
    if (typeof window !== 'undefined' && window.confirm) {
      const confirmMessage = `🚪 ${isEnglish ? 'Logout Confirmation' : 'ログアウト確認'}\n\n${isEnglish ? 'Are you sure you want to logout?' : '本当にログアウトしますか？'}`;
      if (window.confirm(confirmMessage)) {
        try {
          console.log('Logging out...');
          await logout();
          console.log('Logout successful');
        } catch (error) {
          console.error('Logout error:', error);
          window.alert(`❌ ${isEnglish ? 'Logout Failed' : 'ログアウト失敗'}\n\n${isEnglish ? 'An error occurred during logout.' : 'ログアウト中にエラーが発生しました。'}`);
        }
      }
    } else {
      // 모바일에서는 Alert 사용
      Alert.alert(
        isEnglish ? 'Logout' : 'ログアウト',
        isEnglish ? 'Are you sure you want to logout?' : 'ログアウトしますか？',
        [
          { text: isEnglish ? 'Cancel' : 'キャンセル', style: 'cancel' },
          {
            text: isEnglish ? 'Logout' : 'ログアウト',
            style: 'destructive',
            onPress: async () => {
              try {
                await logout();
              } catch (error) {
                Alert.alert(
                  isEnglish ? 'Error' : 'エラー',
                  isEnglish ? 'An error occurred during logout.' : 'ログアウト中にエラーが発生しました。'
                );
              }
            },
          },
        ]
      );
    }
  };

  const handleDeleteAccount = async () => {
    const isEnglish = (userProfile?.language || 'en') === 'en';
    
    // 웹에서는 window.confirm 사용
    if (typeof window !== 'undefined' && window.confirm) {
      const confirmMessage = `⚠️ ${isEnglish ? 'Account Deletion Warning' : '会員退会警告'}\n\n${isEnglish ? 'All data will be permanently deleted:\n- Chat history\n- User information\n- All messages\n\nAre you sure you want to delete your account?' : '会員退会時、すべてのデータが永久に削除されます。\n- チャット履歴\n- ユーザー情報\n- すべてのメッセージ\n\n本当に退会しますか？'}`;
      if (window.confirm(confirmMessage)) {
        try {
          await deleteAccount();
          window.alert(`✅ ${isEnglish ? 'Account Deleted' : '退会完了'}\n\n${isEnglish ? 'Your account has been deleted.' : '会員退会が完了しました。'}`);
        } catch (error) {
          console.error('Delete account error:', error);
          window.alert(`❌ ${isEnglish ? 'Deletion Failed' : '退会失敗'}\n\n${error.message}`);
        }
      }
    } else {
      // 모바일에서는 Alert 사용
      Alert.alert(
        isEnglish ? 'Delete Account' : '会員退会',
        isEnglish
          ? 'All data will be permanently deleted:\n- Chat history\n- User information\n- All messages\n\nAre you sure you want to delete your account?'
          : '会員退会時、すべてのデータが永久に削除されます。\n- チャット履歴\n- ユーザー情報\n- すべてのメッセージ\n\n本当に退会しますか？',
        [
          { text: isKorean ? '취소' : 'キャンセル', style: 'cancel' },
          {
            text: isKorean ? '탈퇴' : '退会',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteAccount();
                Alert.alert(
                  isKorean ? '탈퇴 완료' : '退会完了',
                  isKorean ? '회원탈퇴가 완료되었습니다.' : '会員退会が完了しました。'
                );
              } catch (error) {
                Alert.alert(
                  isKorean ? '오류' : 'エラー',
                  error.message
                );
              }
            },
          },
        ]
      );
    }
  };

  const handleAcceptRequest = async (chatRoomId, otherUser) => {
    try {
      console.log('Accepting request:', chatRoomId);
      await updateDoc(doc(db, 'chatRooms', chatRoomId), {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
      });
      console.log('Chat request accepted');
      const isEnglish = (userProfile?.language || 'en') === 'en';
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(`✅ ${isEnglish ? 'Request Accepted' : '承認完了'}\n\n${isEnglish ? 'Chat room is now active!\nYou can start chatting now.' : 'チャットルームが有効になりました！\n会話を始められます。'}`);
      }
      // 승낙 후 채팅방으로 이동
      navigation.navigate('Chat', {
        chatRoomId: chatRoomId,
        otherUser: otherUser,
      });
    } catch (error) {
      console.error('Error accepting request:', error);
      console.error('Error details:', error.message);
      const isEnglish = (userProfile?.language || 'en') === 'en';
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(`❌ ${isEnglish ? 'Error' : 'エラー発生'}\n\n${error.message}`);
      }
    }
  };

  const handleRejectRequest = async (chatRoomId) => {
    const isEnglish = (userProfile?.language || 'en') === 'en';
    if (typeof window !== 'undefined' && window.confirm) {
      const confirmMessage = `⚠️ ${isEnglish ? 'Reject Chat' : 'チャット拒否'}\n\n${isEnglish ? 'Do you want to reject this request?\n(Cannot be undone)' : 'このリクエストを拒否しますか？\n（復元できません）'}`;
      if (window.confirm(confirmMessage)) {
        try {
          console.log('Rejecting request:', chatRoomId);
          await updateDoc(doc(db, 'chatRooms', chatRoomId), {
            status: 'rejected',
            rejectedAt: serverTimestamp(),
          });
          console.log('Chat request rejected');
          if (typeof window !== 'undefined' && window.alert) {
            window.alert(`✅ ${isEnglish ? 'Request Rejected' : '拒否完了'}\n\n${isEnglish ? 'Chat request has been rejected.' : 'チャットリクエストを拒否しました。'}`);
          }
        } catch (error) {
          console.error('Error rejecting request:', error);
          console.error('Error details:', error.message);
          if (typeof window !== 'undefined' && window.alert) {
            window.alert(`❌ ${isEnglish ? 'Rejection Failed' : '拒否失敗'}\n\n${error.message}`);
          }
        }
      }
    }
  };

  const renderChatRoom = ({ item }) => {
    const languageFlag = item.otherUser?.language === 'en' ? '🇺🇸' : '🇯🇵';
    const isEnglish = (userProfile?.language || 'en') === 'en';
    const isPending = item.status === 'pending';
    const isRequester = item.requestedBy === user.uid;
    const isRecipient = !isRequester && isPending;
    
    console.log('Rendering room:', item.id, '| Status:', item.status, '| isPending:', isPending, '| isRecipient:', isRecipient);
    
    return (
      <View style={styles.chatRoomItem}>
        <TouchableOpacity
          style={styles.chatRoomContent}
          onPress={() => {
            console.log('Room clicked:', item.id, 'Status:', item.status);
            if (item.status === 'accepted') {
              navigation.navigate('Chat', { 
                chatRoomId: item.id,
                otherUser: item.otherUser,
              });
            } else {
              console.log('Room not accepted yet, status:', item.status);
            }
          }}
          disabled={item.status !== 'accepted'}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{languageFlag}</Text>
          </View>
          
          <View style={styles.chatRoomInfo}>
            <View style={styles.chatRoomHeader}>
              <Text style={styles.chatRoomName}>
                {item.otherUser?.displayName || (isEnglish ? 'User' : 'ユーザー')}
              </Text>
              {isPending && (
                <Text style={styles.pendingBadge}>
                  {isRequester 
                    ? (isEnglish ? 'Waiting' : '待機中')
                    : (isEnglish ? 'New Request' : '新規リクエスト')
                  }
                </Text>
              )}
            </View>
            
            <Text style={styles.lastMessage} numberOfLines={1}>
              {isPending 
                ? (isRequester 
                    ? (isEnglish ? 'Chat request sent' : 'チャットリクエストを送信しました')
                    : (isEnglish ? 'Chat request received' : 'チャットリクエストが届きました')
                  )
                : (item.lastMessage || (isEnglish ? 'No messages' : 'メッセージがありません'))
              }
            </Text>
          </View>
        </TouchableOpacity>
        
        {isRecipient && (
          <View style={styles.requestButtons}>
            <TouchableOpacity 
              style={styles.acceptButton}
              onPress={() => handleAcceptRequest(item.id, item.otherUser)}
            >
              <Text style={styles.acceptButtonText}>
                {isEnglish ? 'Accept' : '承認'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.rejectButton}
              onPress={() => handleRejectRequest(item.id)}
            >
              <Text style={styles.rejectButtonText}>
                {isEnglish ? 'Reject' : '拒否'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const isKorean = (userProfile?.language || 'ko') === 'ko';
    
    if (diff < 60000) return isKorean ? '방금 전' : 'ただいま';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}${isKorean ? '분 전' : '分前'}`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}${isKorean ? '시간 전' : '時間前'}`;
    
    return date.toLocaleDateString(isKorean ? 'ko-KR' : 'ja-JP');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {(userProfile?.language || 'en') === 'en' ? 'Chat' : 'チャット'}
        </Text>
        <View style={styles.headerRight}>
          <Text style={styles.userInfo}>
            {userProfile?.displayName} {(userProfile?.language || 'en') === 'en' ? '🇺🇸' : '🇯🇵'}
          </Text>
          <TouchableOpacity onPress={handleDeleteAccount} style={styles.deleteButton}>
            <Text style={styles.deleteText}>
              {(userProfile?.language || 'en') === 'en' ? 'Delete' : '退会'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>
              {(userProfile?.language || 'en') === 'en' ? 'Logout' : 'ログアウト'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={styles.newChatButton}
        onPress={() => navigation.navigate('UserList')}
      >
        <Text style={styles.newChatButtonText}>
          {(userProfile?.language || 'en') === 'en' ? '+ Start New Chat' : '+ 新しいチャットを始める'}
        </Text>
      </TouchableOpacity>

      {chatRooms.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {(userProfile?.language || 'en') === 'en' ? 'No chat rooms' : 'チャットルームがありません'}
          </Text>
          <Text style={styles.emptySubtext}>
            {(userProfile?.language || 'en') === 'en' ? 'Start a new chat!' : '新しいチャットを始めてみましょう！'}
          </Text>
        </View>
      ) : (
        <View style={{flex: 1}}>
          <FlatList
            data={chatRooms}
            renderItem={renderChatRoom}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />
          <AdMobBannerComponent screenType="chatList" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userInfo: {
    fontSize: 14,
    color: '#666',
  },
  profileButton: {
    padding: 5,
  },
  profileText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 5,
  },
  deleteText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    padding: 5,
  },
  logoutText: {
    color: '#007AFF',
    fontSize: 14,
  },
  newChatButton: {
    backgroundColor: '#007AFF',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  newChatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 0,
  },
  chatRoomItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  chatRoomContent: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 24,
  },
  chatRoomInfo: {
    flex: 1,
  },
  chatRoomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  chatRoomName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  pendingBadge: {
    backgroundColor: '#FF9500',
    color: '#fff',
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  chatRoomTime: {
    fontSize: 12,
    color: '#999',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  requestButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
  },
});
