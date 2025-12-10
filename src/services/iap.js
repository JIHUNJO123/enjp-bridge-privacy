// 인앱결제 서비스 - RevenueCat 사용
import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

// RevenueCat API Keys
const REVENUECAT_API_KEY_IOS = 'appl_EpiFCrvJEKSjAgmhbocbFmgraMu';
const REVENUECAT_API_KEY_ANDROID = 'goog_YOUR_ANDROID_API_KEY'; // TODO: RevenueCat 대시보드에서 Android API Key로 교체

// 상품 ID (App Store Connect / Google Play Console에서 생성)
export const PRODUCT_IDS = {
  REMOVE_ADS: 'com.enjpbridge.app.removeads',
};

// RevenueCat Entitlement ID (RevenueCat 대시보드에서 설정)
export const ENTITLEMENT_IDS = {
  REMOVE_ADS: 'remove_ads', // RevenueCat 대시보드에서 만든 Entitlement ID
};

let isInitialized = false;

// RevenueCat 초기화
export async function initializeIAP() {
  if (isInitialized) {
    console.log('RevenueCat already initialized');
    return true;
  }

  try {
    const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
    
    // API Key가 없으면 초기화 스킵
    if (!apiKey || apiKey.includes('YOUR_')) {
      console.log('RevenueCat API key not configured, skipping initialization');
      return false;
    }
    
    // 디버그 로그 활성화 (개발 중에만)
    if (__DEV__ && LOG_LEVEL) {
      try {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      } catch (e) {
        console.log('Could not set log level:', e);
      }
    }
    
    await Purchases.configure({ apiKey });
    isInitialized = true;
    console.log('RevenueCat initialized successfully');
    return true;
  } catch (error) {
    console.error('RevenueCat initialization failed:', error);
    isInitialized = false;
    return false;
  }
}

// 사용자 ID 설정 (로그인 후 호출)
export async function setUserID(userId) {
  try {
    await Purchases.logIn(userId);
    console.log('RevenueCat user logged in:', userId);
  } catch (error) {
    console.error('RevenueCat login failed:', error);
  }
}

// 사용자 로그아웃
export async function logoutUser() {
  try {
    await Purchases.logOut();
    console.log('RevenueCat user logged out');
  } catch (error) {
    console.error('RevenueCat logout failed:', error);
  }
}

// 상품 정보 가져오기
export async function getProducts() {
  try {
    console.log('Fetching products from RevenueCat...');
    const offerings = await Purchases.getOfferings();
    console.log('Offerings:', JSON.stringify(offerings, null, 2));
    
    if (offerings.current && offerings.current.availablePackages.length > 0) {
      const products = offerings.current.availablePackages.map(pkg => ({
        productId: pkg.product.identifier,
        title: pkg.product.title,
        description: pkg.product.description,
        price: pkg.product.price,
        localizedPrice: pkg.product.priceString,
        currency: pkg.product.currencyCode,
        package: pkg, // RevenueCat 패키지 객체 저장 (구매 시 사용)
      }));
      console.log('Products fetched:', products.length);
      return products;
    }
    
    console.warn('No offerings available');
    return [];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

// 광고 제거 구매
export async function purchaseRemoveAds() {
  try {
    console.log('Starting purchase for Remove Ads...');
    
    // Offerings에서 패키지 가져오기
    const offerings = await Purchases.getOfferings();
    
    if (!offerings.current || offerings.current.availablePackages.length === 0) {
      throw new Error('No offerings available');
    }
    
    // 첫 번째 패키지로 구매 (또는 특정 패키지 ID로 필터링)
    const packageToPurchase = offerings.current.availablePackages[0];
    
    console.log('Purchasing package:', packageToPurchase.identifier);
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    
    // 구매 성공 확인
    if (customerInfo.entitlements.active[ENTITLEMENT_IDS.REMOVE_ADS]) {
      console.log('Purchase successful! Ads removed.');
      return true;
    }
    
    return false;
  } catch (error) {
    if (error.userCancelled) {
      console.log('User cancelled purchase');
      return false;
    }
    console.error('Purchase failed:', error);
    throw error;
  }
}

// 광고 제거 상태 확인
export async function checkAdsRemoved() {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const hasEntitlement = customerInfo.entitlements.active[ENTITLEMENT_IDS.REMOVE_ADS] !== undefined;
    console.log('Ads removed status:', hasEntitlement);
    return hasEntitlement;
  } catch (error) {
    console.error('Error checking entitlements:', error);
    return false;
  }
}

// 구매 복원
export async function restorePurchases() {
  try {
    console.log('Restoring purchases...');
    const customerInfo = await Purchases.restorePurchases();
    
    if (customerInfo.entitlements.active[ENTITLEMENT_IDS.REMOVE_ADS]) {
      console.log('Restore successful! Ads removed.');
      return true;
    }
    
    console.log('No previous purchases found');
    return false;
  } catch (error) {
    console.error('Error restoring purchases:', error);
    return false;
  }
}

// 구매 상태 리스너 설정
export function setPurchaseListener(onPurchaseSuccess, onPurchaseError) {
  // 초기화되지 않았으면 빈 cleanup 함수 반환
  if (!isInitialized) {
    console.log('RevenueCat not initialized, skipping listener setup');
    return () => {};
  }
  
  try {
    const listener = Purchases.addCustomerInfoUpdateListener((customerInfo) => {
      console.log('Customer info updated');
      
      if (customerInfo?.entitlements?.active?.[ENTITLEMENT_IDS.REMOVE_ADS]) {
        onPurchaseSuccess && onPurchaseSuccess();
      }
    });
    
    // cleanup 함수 반환
    return () => {
      try {
        if (listener && listener.remove) {
          listener.remove();
        }
      } catch (e) {
        console.log('Error removing listener:', e);
      }
    };
  } catch (error) {
    console.error('Error setting up purchase listener:', error);
    return () => {};
  }
}

// 연결 해제 (RevenueCat은 명시적 해제 불필요하지만 호환성 유지)
export async function disconnectIAP() {
  console.log('RevenueCat disconnect called (no-op)');
}

// 웹 환경 체크
export function isIAPAvailable() {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}
