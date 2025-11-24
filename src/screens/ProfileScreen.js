import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { doc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen({ navigation }) {
  const { user, userProfile, logout, deleteAccount } = useAuth();

  const isEnglish = (userProfile?.language || 'en') === 'en';

  const handleDeleteAccount = () => {
    Alert.alert(
      isEnglish ? 'Delete Account' : 'アカウント削除',
      isEnglish ? 'Are you sure you want to delete your account? This action cannot be undone.' : 'アカウントを削除しますか？この操作は元に戻せません。',
      [
        { text: isEnglish ? 'Cancel' : 'キャンセル', style: 'cancel' },
        {
          text: isEnglish ? 'Delete' : '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              Alert.alert(isEnglish ? 'Success' : '成功', isEnglish ? 'Account deleted successfully.' : 'アカウントが削除されました。');
            } catch (error) {
              Alert.alert(isEnglish ? 'Error' : 'エラー', isEnglish ? 'Failed to delete account.' : 'アカウント削除に失敗しました。');
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>{isEnglish ? '← Back' : '← 戻る'}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {isEnglish ? 'Settings' : '設定'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>
            {isEnglish ? 'Email' : 'メールアドレス'}
          </Text>
          <Text style={styles.value}>{userProfile?.email}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>
            {isEnglish ? 'Nickname' : 'ニックネーム'}
          </Text>
          <Text style={styles.value}>{userProfile?.displayName}</Text>
        </View>

        <View style={styles.divider} />

        <TouchableOpacity
          style={[styles.button, styles.logoutButton]}
          onPress={logout}
        >
          <Text style={styles.buttonText}>
            {isEnglish ? 'Logout' : 'ログアウト'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.deleteButton]}
          onPress={handleDeleteAccount}
        >
          <Text style={styles.buttonText}>
            {isEnglish ? 'Delete Account' : 'アカウント削除'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  value: {
    fontSize: 16,
    color: '#666',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  input: {
    fontSize: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#FF9500',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 20,
  },
});