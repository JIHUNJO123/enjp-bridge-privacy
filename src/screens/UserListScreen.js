import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { 
  collection, 
  query, 
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  deleteDoc,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';

export default function UserListScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchText, setSearchText] = useState('');
  const { user, userProfile } = useAuth();

  useEffect(() => {
    if (user && user.uid) {
      loadUsers();
    }
  }, [user]);

  useEffect(() => {
    if (!user || !user.uid) return;

    // 실시간 사용자 목록 업데이트
    const q = query(collection(db, 'users'));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const myLanguage = userProfile?.language || 'en';
      
      console.log('=== UserList Snapshot ===');
      console.log('Total users in DB:', snapshot.docs.length);
      
      // 차단한 사용자 목록 가져오기
      const blockedUsersQuery = query(collection(db, 'users', user.uid, 'blocked'));
      const blockedSnapshot = await getDocs(blockedUsersQuery);
      const blockedUserIds = blockedSnapshot.docs.map(doc => doc.data().blockedUserId);
      console.log('Blocked user IDs:', blockedUserIds);
      
      const allUsers = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      
      // 각 사용자의 deleted 상태 로그
      allUsers.forEach(u => {
        console.log(`User: ${u.displayName}, deleted: ${u.deleted}, type: ${typeof u.deleted}, language: ${u.language}`);
      });
      
      const userList = allUsers
        .filter(u => {
          const shouldShow = u.id !== user.uid && 
                            u.language !== myLanguage && 
                            !u.deleted && 
                            !blockedUserIds.includes(u.id); // 차단된 사용자 제외
          
          if (u.displayName === 'jojojo') {
            console.log(`jojojo filter result: shouldShow=${shouldShow}, deleted=${u.deleted}`);
          }
          
          return shouldShow;
        })
        .sort((a, b) => {
          // 최근 활동 순 정렬 (lastActiveAt이 최신인 사람이 위로)
          const aTime = a.lastActiveAt?.toMillis ? a.lastActiveAt.toMillis() : (a.lastActiveAt || 0);
          const bTime = b.lastActiveAt?.toMillis ? b.lastActiveAt.toMillis() : (b.lastActiveAt || 0);
          return bTime - aTime;
        });

      console.log('Filtered users count:', userList.length);
      setUsers(userList);
      setFilteredUsers(userList);
    }, (error) => {
      console.error('Error loading users:', error);
    });

    return () => unsubscribe();
  }, [user, userProfile?.language]);

  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(u =>
        u.displayName.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchText, users]);

  const loadUsers = async () => {
    // 더 이상 사용하지 않음 - onSnapshot으로 대체
  };

  const createChatRoom = async (otherUser) => {
    if (!user || !user.uid) {
      console.log('User not logged in');
      return;
    }
    
    // userProfile이 로드되지 않았으면 alert 후 리턴
    if (!userProfile) {
      console.log('userProfile not loaded');
      if (typeof window !== 'undefined' && window.alert) {
        window.alert('Loading user profile, please wait...');
      }
      return;
    }
    
    // 상대방이 탈퇴한 사용자인지 확인
    if (otherUser.deleted) {
      const isEnglish = (userProfile?.language || 'en') === 'en';
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(`❌ ${isEnglish ? 'Error' : 'エラー'}\n\n${isEnglish ? 'This user has been deleted.' : '退会したユーザーです。'}`);
      }
      return;
    }
    
    const isEnglish = (userProfile?.language || 'en') === 'en';
    
    try {
      // 이미 채팅방이 있는지 확인
      const q = query(
        collection(db, 'chatRooms'),
        where('participants', 'array-contains', user.uid)
      );

      const snapshot = await getDocs(q);
      let existingRoom = null;

      snapshot.forEach(doc => {
        const room = doc.data();
        if (room.participants.includes(otherUser.id)) {
          existingRoom = { id: doc.id, ...room };
        }
      });

      if (existingRoom) {
        // 기존 채팅방 상태 확인
        if (existingRoom.status === 'pending') {
          // 요청자인지 수신자인지 확인
          if (existingRoom.requestedBy === user.uid) {
            console.log('Already requested, showing alert');
            if (typeof window !== 'undefined' && window.alert) {
              window.alert(`⏳ ${isEnglish ? 'Already Requested' : 'すでにリクエスト済み'}\n\n${isEnglish ? 'You have already sent a chat request to this user.\nWaiting for their response.' : 'このユーザーにすでにチャットリクエストを送信しました。\n相手の返事を待っています。'}`);
            } else {
              // 모바일에서는 Alert 사용
              Alert.alert(
                isEnglish ? 'Already Requested' : 'すでにリクエスト済み',
                isEnglish ? 'You have already sent a chat request to this user.\nWaiting for their response.' : 'このユーザーにすでにチャットリクエストを送信しました。\n相手の返事を待っています。'
              );
            }
          } else {
            // 상대방이 나에게 요청한 경우 - ChatList로 이동
            console.log('New request from them, showing alert');
            if (typeof window !== 'undefined' && window.alert) {
              window.alert(`💬 ${isEnglish ? 'New Request' : '新しいリクエスト'}\n\n${isEnglish ? 'You have a chat request from this user.\nYou can accept/reject in the chat list.' : 'このユーザーからのチャットリクエストがあります。\nチャットリストで承認/拒否できます。'}`);
            } else {
              Alert.alert(
                isEnglish ? 'New Request' : '新しいリクエスト',
                isEnglish ? 'You have a chat request from this user.\nYou can accept/reject in the chat list.' : 'このユーザーからのチャットリクエストがあります。\nチャットリストで承認/拒否できます。'
              );
            }
            navigation.goBack();
          }
          return;
        } else if (existingRoom.status === 'accepted') {
          // 수락된 채팅방으로 이동
          navigation.navigate('Chat', {
            chatRoomId: existingRoom.id,
            otherUser: otherUser,
          });
          return;
        } else if (existingRoom.status === 'rejected') {
          // 거절된 채팅방 삭제하고 새로 요청 가능하게 함
          try {
            await deleteDoc(doc(db, 'chatRooms', existingRoom.id));
            console.log('Deleted rejected chat room');
            
            // 삭제 후 새로운 요청 생성
            const chatRoomRef = await addDoc(collection(db, 'chatRooms'), {
              participants: [user.uid, otherUser.id],
              participantsInfo: {
                [user.uid]: {
                  displayName: userProfile?.displayName || 'Unknown',
                  language: userProfile?.language || 'en',
                },
                [otherUser.id]: {
                  displayName: otherUser.displayName || 'Unknown',
                  language: otherUser.language || 'ja',
                },
              },
              status: 'pending',
              requestedBy: user.uid,
              requestedAt: serverTimestamp(),
              createdAt: serverTimestamp(),
              lastMessageAt: serverTimestamp(),
              lastMessage: '',
            });

            if (typeof window !== 'undefined' && window.alert) {
              window.alert(`✅ ${isEnglish ? 'Request Sent' : 'リクエスト完了'}\n\n${isEnglish ? 'Chat request sent!\nYou can start chatting once they accept.' : 'チャットリクエストを送信しました！\n相手が承認すると会話を始められます。'}`);
            }
            navigation.goBack();
          } catch (error) {
            console.error('Error handling rejected room:', error);
            if (typeof window !== 'undefined' && window.alert) {
              window.alert(`❌ ${isEnglish ? 'Error Occurred' : 'エラー発生'}\n\n${error.message}`);
            }
          }
          return;
        }
      } else {
        // 새 채팅 요청 생성
        const chatRoomRef = await addDoc(collection(db, 'chatRooms'), {
          participants: [user.uid, otherUser.id],
          participantsInfo: {
            [user.uid]: {
              displayName: userProfile?.displayName || 'Unknown',
              language: userProfile?.language || 'en',
            },
            [otherUser.id]: {
              displayName: otherUser.displayName || 'Unknown',
              language: otherUser.language || 'ja',
            },
          },
          status: 'pending',
          requestedBy: user.uid,
          requestedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          lastMessageAt: serverTimestamp(),
          lastMessage: '',
        });

        if (typeof window !== 'undefined' && window.alert) {
          window.alert(isEnglish ? 'Chat request sent!' : 'チャットリクエストを送信しました！');
        }
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error creating chat room:', error);
      console.error('Error details:', error.message);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(isEnglish ? `An error occurred: ${error.message}` : `エラーが発生しました: ${error.message}`);
      }
    }
  };

  const renderUser = ({ item }) => {
    const languageFlag = item.language === 'en' ? 'EN' : '🇯🇵';
    
    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => createChatRoom(item)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{languageFlag}</Text>
        </View>
        
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.displayName}</Text>
          <Text style={styles.userLanguage}>
            {item.language === 'en' ? 'English' : 'Japanese'}
          </Text>
        </View>
        
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>{(userProfile?.language || 'en') === 'en' ? '› Back' : '› 戻る'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{(userProfile?.language || 'en') === 'en' ? 'New Chat' : '新しいチャット'}</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={(userProfile?.language || 'en') === 'en' ? 'Search users...' : 'ユーザー検索...'}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <Text style={styles.sectionTitle}>
        {(userProfile?.language || 'en') === 'en' ? 'Japanese Users' : 'English Users'}
      </Text>

      {filteredUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchText 
              ? ((userProfile?.language || 'en') === 'en' ? 'No search results' : '検索結果がありません') 
              : ((userProfile?.language || 'en') === 'en' ? 'No users available' : 'ユーザーがいません')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
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
  backButton: {
    fontSize: 32,
    color: '#007AFF',
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 15,
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f9f9f9',
  },
  listContent: {
    paddingBottom: 20,
  },
  userItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  userLanguage: {
    fontSize: 14,
    color: '#666',
  },
  arrow: {
    fontSize: 24,
    color: '#ccc',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
