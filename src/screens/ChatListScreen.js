import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { collection, query, where, onSnapshot, getDoc, getDocs, updateDoc, serverTimestamp, doc, setDoc, increment } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import AdMobBannerComponent from '../components/AdMobBanner';
import { showInterstitial } from '../components/AdMobInterstitial';

export default function ChatListScreen({ navigation }) {
  const [chatRooms, setChatRooms] = useState([]);
  const [chatClickCount, setChatClickCount] = useState(0);
  const { user, userProfile, logout, deleteAccount } = useAuth();

  useEffect(() => {
    if (!user || !user.uid) {
      setChatRooms([]);
      return;
    }

    console.log('Setting up ChatList listener for user:', user.uid);

    // 사용자가 참여한 채팅방 가져오기 (orderBy 제거하여 인덱스 문제 방지)
    const q = query(
      collection(db, 'chatRooms'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      console.log('ChatList snapshot updated, docs count:', snapshot.docs.length);
      const rooms = [];
      
      // 차단한 사용자 목록 가져오기
      const blockedUsersQuery = query(collection(db, 'users', user.uid, 'blocked'));
      const blockedSnapshot = await getDocs(blockedUsersQuery);
      const blockedUserIds = blockedSnapshot.docs.map(doc => doc.data().blockedUserId);
      
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
          // 차단한 사용자와의 채팅방은 목록에서 제외
          if (blockedUserIds.includes(otherUserId)) {
            console.log('Skipping blocked user:', otherUserId);
            continue;
          }
          
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
            
            // 읽지 않은 메시지 개수 계산
            const unreadCount = roomData[`unread_${user.uid}`] || 0;
            
            rooms.push({
              id: docSnap.id,
              ...roomData,
              otherUser,
              unreadCount,
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
    if (Platform.OS === 'web') {
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
                await showInterstitial();
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
    console.log('handleDeleteAccount called');
    const isEnglish = (userProfile?.language || 'en') === 'en';
    
    // 웹에서는 window.confirm 사용
    if (Platform.OS === 'web') {
      console.log('Using window.confirm for web');
      const confirmMessage = `⚠️ ${isEnglish ? 'Account Deletion Warning' : '会員退会警告'}\n\n${isEnglish ? 'All data will be permanently deleted:\n- Chat history\n- User information\n- All messages\n\nAre you sure you want to delete your account?' : '会員退会時、すべてのデータが永久に削除されます。\n- チャット履歴\n- ユーザー情報\n- すべてのメッセージ\n\n本当に退会しますか？'}`;
      if (window.confirm(confirmMessage)) {
        try {
          console.log('Calling deleteAccount...');
          await deleteAccount();
          window.alert(`✅ ${isEnglish ? 'Account Deleted' : '退会完了'}\n\n${isEnglish ? 'Your account has been deleted.' : '会員退会が完了しました。'}`);
        } catch (error) {
          console.error('Delete account error:', error);
          window.alert(`❌ ${isEnglish ? 'Deletion Failed' : '退会失敗'}\n\n${error.message}`);
        }
      }
    } else {
      // 모바일에서는 Alert 사용
      console.log('Using Alert for mobile');
      Alert.alert(
        isEnglish ? 'Delete Account' : '会員退会',
        isEnglish
          ? 'All data will be permanently deleted:\n- Chat history\n- User information\n- All messages\n\nAre you sure you want to delete your account?'
          : '会員退会時、すべてのデータが永久に削除されます。\n- チャット履歴\n- ユーザー情報\n- すべてのメッセージ\n\n本当に退会しますか？',
        [
          { text: isEnglish ? 'Cancel' : 'キャンセル', style: 'cancel' },
          {
            text: isEnglish ? 'Delete' : '退会',
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('Calling deleteAccount...');
                await deleteAccount();
                Alert.alert(
                  isEnglish ? 'Account Deleted' : '退会完了',
                  isEnglish ? 'Your account has been deleted.' : '会員退会が完了しました。'
                );
              } catch (error) {
                console.error('Delete account error:', error);
                Alert.alert(
                  isEnglish ? 'Error' : 'エラー',
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
      
      // 전면 광고 표시
      await showInterstitial();
      
      const isEnglish = (userProfile?.language || 'en') === 'en';
      if (Platform.OS === 'web') {
        window.alert(`✅ ${isEnglish ? 'Request Accepted' : '承認完了'}\n\n${isEnglish ? 'Chat room is now active!\nYou can start chatting now.' : 'チャットルームが有効になりました！\n会話を始められます。'}`);
      } else {
        Alert.alert(
          isEnglish ? '✅ Request Accepted' : '✅ 承認完了',
          isEnglish ? 'Chat room is now active!\nYou can start chatting now.' : 'チャットルームが有効になりました！\n会話を始められます。'
        );
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
      if (Platform.OS === 'web') {
        window.alert(`❌ ${isEnglish ? 'Error' : 'エラー発生'}\n\n${error.message}`);
      } else {
        Alert.alert(
          isEnglish ? '❌ Error' : '❌ エラー',
          error.message
        );
      }
    }
  };

  const handleRejectRequest = async (chatRoomId) => {
    const isEnglish = (userProfile?.language || 'en') === 'en';
    const confirmMessage = `${isEnglish ? 'Do you want to reject this request?\n(Cannot be undone)' : 'このリクエストを拒否しますか？\n（復元できません）'}`;
    const confirmTitle = `⚠️ ${isEnglish ? 'Reject Chat' : 'チャット拒否'}`;
    
    const executeReject = async () => {
      try {
        console.log('Rejecting request:', chatRoomId);
        
        // 채팅방 정보 가져오기
        const chatRoomDoc = await getDoc(doc(db, 'chatRooms', chatRoomId));
        if (!chatRoomDoc.exists()) {
          throw new Error('Chat room not found');
        }
        
        const chatRoomData = chatRoomDoc.data();
        const otherUserId = chatRoomData.participants.find(id => id !== user.uid);
        
        // 채팅방 상태를 rejected로 변경
        await updateDoc(doc(db, 'chatRooms', chatRoomId), {
          status: 'rejected',
          rejectedAt: serverTimestamp(),
        });
        
        // 거부 카운트 증가 (사용자 문서의 rejectionCounts 맵에 상대방 ID를 키로 사용)
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.data();
        const rejectionCounts = userData?.rejectionCounts || {};
        const currentCount = rejectionCounts[otherUserId] || 0;
        const newCount = currentCount + 1;
        
        // 거부 카운트 업데이트
        await updateDoc(userDocRef, {
          [`rejectionCounts.${otherUserId}`]: newCount
        });
        
        console.log(`Rejection count for ${otherUserId}: ${newCount}`);
        
        // 2번째 거부 시 자동 차단
        if (newCount >= 2) {
          console.log(`Auto-blocking user ${otherUserId} after 2 rejections`);
          await setDoc(doc(db, 'users', user.uid, 'blocked', otherUserId), {
            blockedUserId: otherUserId,
            blockedAt: serverTimestamp(),
            reason: 'auto_block_after_2_rejections'
          });
          
          if (Platform.OS === 'web') {
            window.alert(`🚫 ${isEnglish ? 'User Auto-Blocked' : 'ユーザー自動ブロック'}\n\n${isEnglish ? 'This user has been automatically blocked after 2 rejections.' : 'このユーザーは2回拒否したため自動的にブロックされました。'}`);
          } else {
            Alert.alert(
              isEnglish ? '🚫 User Auto-Blocked' : '🚫 ユーザー自動ブロック',
              isEnglish ? 'This user has been automatically blocked after 2 rejections.' : 'このユーザーは2回拒否したため自動的にブロックされました。'
            );
          }
        } else {
          if (Platform.OS === 'web') {
            window.alert(`✅ ${isEnglish ? 'Request Rejected' : '拒否完了'}\n\n${isEnglish ? `Chat request has been rejected. (${newCount}/2)\nOne more rejection will auto-block this user.` : `チャットリクエストを拒否しました。(${newCount}/2)\nもう一度拒否すると自動的にブロックされます。`}`);
          } else {
            Alert.alert(
              isEnglish ? '✅ Request Rejected' : '✅ 拒否完了',
              isEnglish ? `Chat request has been rejected. (${newCount}/2)\nOne more rejection will auto-block this user.` : `チャットリクエストを拒否しました。(${newCount}/2)\nもう一度拒否すると自動的にブロックされます。`
            );
          }
        }
        
        console.log('Chat request rejected');
      } catch (error) {
        console.error('Error rejecting request:', error);
        console.error('Error details:', error.message);
        if (Platform.OS === 'web') {
          window.alert(`❌ ${isEnglish ? 'Rejection Failed' : '拒否失敗'}\n\n${error.message}`);
        } else {
          Alert.alert(
            isEnglish ? '❌ Rejection Failed' : '❌ 拒否失敗',
            error.message
          );
        }
      }
    };
    
    if (Platform.OS === 'web') {
      if (window.confirm(`${confirmTitle}\n\n${confirmMessage}`)) {
        await executeReject();
      }
    } else {
      Alert.alert(
        confirmTitle,
        confirmMessage,
        [
          {
            text: isEnglish ? 'Cancel' : 'キャンセル',
            style: 'cancel'
          },
          {
            text: isEnglish ? 'Reject' : '拒否',
            style: 'destructive',
            onPress: executeReject
          }
        ]
      );
    }
  };

  const renderChatRoom = ({ item }) => {
    if (!user || !user.uid) return null;
    
    const languageFlag = item.otherUser?.language === 'en' ? 'EN' : '🇯🇵';
    const isEnglish = (userProfile?.language || 'en') === 'en';
    const isPending = item.status === 'pending';
    const isRequester = item.requestedBy === user.uid;
    const isRecipient = !isRequester && isPending;
    
    console.log('Rendering room:', item.id, '| Status:', item.status, '| isPending:', isPending, '| isRecipient:', isRecipient);
    
    return (
      <View style={styles.chatRoomItem}>
        <TouchableOpacity
          style={styles.chatRoomContent}
          onPress={async () => {
            console.log('Room clicked:', item.id, 'Status:', item.status);
            if (item.status === 'accepted') {
              // 3번째마다 전면 광고 표시
              const newCount = chatClickCount + 1;
              setChatClickCount(newCount);
              
              if (newCount % 3 === 0) {
                await showInterstitial();
              }
              
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
              {item.unreadCount > 0 && item.status === 'accepted' && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>N</Text>
                </View>
              )}
              {isPending && (
                <Text style={styles.pendingBadge}>
                  {isRequester 
                    ? (isEnglish ? 'Waiting' : '待機中')
                    : (isEnglish ? 'New Request' : '新規リクエスト')}
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
    const isEnglish = (userProfile?.language || 'en') === 'en';
    
    if (diff < 60000) return isEnglish ? 'Just now' : 'ただいま';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}${isEnglish ? 'min ago' : '分前'}`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}${isEnglish ? 'h ago' : '時間前'}`;
    
    return date.toLocaleDateString(isEnglish ? 'en-US' : 'ja-JP');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {(userProfile?.language || 'en') === 'en' ? 'Chat' : 'チャット'}
        </Text>
        <View style={styles.headerRight}>
          <Text style={styles.userInfo}>
            {userProfile?.displayName} {(userProfile?.language || 'en') === 'en' ? 'EN' : '🇯🇵'}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.settingsButton}>
            <Text style={styles.settingsText}>⚙️</Text>
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
  settingsButton: {
    padding: 5,
  },
  settingsText: {
    fontSize: 20,
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
  unreadBadge: {
    backgroundColor: '#FF3B30',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pendingBadge: {
    backgroundColor: '#FF9500',
    color: '#fff',
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
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
