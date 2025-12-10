import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { doc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { purchaseRemoveAds, getProducts, isIAPAvailable } from '../services/iap';

export default function ProfileScreen({ navigation }) {
  const { user, userProfile, logout, deleteAccount, adsRemoved, handleRestorePurchases } = useAuth();
  const [isLoadingPurchase, setIsLoadingPurchase] = useState(false);
  const [productPrice, setProductPrice] = useState('$2.99');

  const isEnglish = (userProfile?.language || 'en') === 'en';

  // 상품 가격 가져오기
  useEffect(() => {
    const fetchProducts = async () => {
      if (isIAPAvailable() && !adsRemoved) {
        const products = await getProducts();
        if (products.length > 0) {
          // react-native-iap에서는 localizedPrice 사용
          setProductPrice(products[0].localizedPrice || products[0].price || '$2.99');
        }
      }
    };
    fetchProducts();
  }, [adsRemoved]);

  const handlePurchaseRemoveAds = async () => {
    if (!isIAPAvailable()) {
      Alert.alert(
        isEnglish ? 'Not Available' : '利用不可',
        isEnglish ? 'In-app purchases are not available on this device.' : 'このデバイスではアプリ内課金は利用できません。'
      );
      return;
    }

    setIsLoadingPurchase(true);
    try {
      console.log('Starting purchase...');
      
      // 구매 전에 상품 정보 먼저 가져오기 (필수)
      const products = await getProducts();
      console.log('Products loaded:', products);
      console.log('Products count:', products?.length);
      
      if (!products || products.length === 0) {
        // 더 자세한 에러 메시지
        Alert.alert(
          'Debug Info',
          `Products: ${JSON.stringify(products)}\nCount: ${products?.length || 0}\n\nMake sure:\n1. IAP is approved in App Store Connect\n2. Bundle ID matches\n3. Product ID: com.enjpbridge.app.removeads`
        );
        throw new Error('Product not found. Please try again later.');
      }
      
      await purchaseRemoveAds();
      console.log('Purchase request sent');
      // 결과는 AuthContext의 purchaseListener에서 처리됨
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert(
        isEnglish ? 'Error' : 'エラー',
        `${isEnglish ? 'Purchase failed.' : '購入に失敗しました。'}\n\n${error.message || error}`
      );
    } finally {
      setIsLoadingPurchase(false);
    }
  };

  const handleRestore = async () => {
    if (!isIAPAvailable()) {
      Alert.alert(
        isEnglish ? 'Not Available' : '利用不可',
        isEnglish ? 'In-app purchases are not available on this device.' : 'このデバイスではアプリ内課金は利用できません。'
      );
      return;
    }

    setIsLoadingPurchase(true);
    try {
      const restored = await handleRestorePurchases();
      if (restored) {
        Alert.alert(
          isEnglish ? 'Restored' : '復元完了',
          isEnglish ? 'Your purchase has been restored.' : '購入が復元されました。'
        );
      } else {
        Alert.alert(
          isEnglish ? 'No Purchases' : '購入なし',
          isEnglish ? 'No previous purchases found.' : '以前の購入が見つかりませんでした。'
        );
      }
    } catch (error) {
      Alert.alert(
        isEnglish ? 'Error' : 'エラー',
        isEnglish ? 'Failed to restore purchases.' : '購入の復元に失敗しました。'
      );
    } finally {
      setIsLoadingPurchase(false);
    }
  };

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
    <SafeAreaView style={styles.safeArea}>
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
            <View style={styles.headerSpacer} />
          </View>

        <View style={styles.section}>
          <Text style={styles.label}>
            {isEnglish ? 'Nickname' : 'ニックネーム'}
          </Text>
          <Text style={styles.value}>{userProfile?.displayName}</Text>
        </View>

        <View style={styles.divider} />

        {/* 광고 제거 섹션 */}
        {!adsRemoved ? (
          <View style={styles.adSection}>
            <Text style={styles.adSectionTitle}>
              {isEnglish ? '🚫 Remove Ads' : '🚫 広告を削除'}
            </Text>
            <Text style={styles.adSectionDesc}>
              {isEnglish 
                ? 'Enjoy an ad-free experience with a one-time purchase.' 
                : '一度の購入で広告なしの体験をお楽しみください。'}
            </Text>
            
            <TouchableOpacity
              style={[styles.button, styles.purchaseButton]}
              onPress={handlePurchaseRemoveAds}
              disabled={isLoadingPurchase}
            >
              {isLoadingPurchase ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {isEnglish ? `Remove Ads - ${productPrice}` : `広告を削除 - ${productPrice}`}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              disabled={isLoadingPurchase}
            >
              <Text style={styles.restoreButtonText}>
                {isEnglish ? 'Restore Purchases' : '購入を復元'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.adRemovedSection}>
            <Text style={styles.adRemovedText}>
              ✅ {isEnglish ? 'Ads Removed' : '広告削除済み'}
            </Text>
          </View>
        )}

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
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
  headerSpacer: {
    width: 60,
  },
  backButton: {
    padding: 10,
    minWidth: 60,
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
  adSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  adSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  adSectionDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  purchaseButton: {
    backgroundColor: '#34C759',
  },
  restoreButton: {
    padding: 12,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: '#007AFF',
    fontSize: 14,
  },
  adRemovedSection: {
    backgroundColor: '#E8F5E9',
    padding: 20,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  adRemovedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
});