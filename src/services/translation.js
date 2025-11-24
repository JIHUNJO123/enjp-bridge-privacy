// 번역 서비스 - Google Translate 무료 API 사용

// Google Translate 무료 엔드포인트
const translateWithGoogle = async (text, sourceLang, targetLang) => {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('Google Translate response:', data);
    
    // Google Translate는 [[["번역결과","원문",null,null,1]]] 형식으로 반환
    if (data && data[0] && data[0][0] && data[0][0][0]) {
      const translated = data[0][0][0];
      console.log('Google translation result:', translated);
      return translated;
    }
    return null;
  } catch (error) {
    console.error('Google Translate error:', error);
    return null;
  }
};

// MyMemory API (fallback)
const translateWithMyMemory = async (text, sourceLang, targetLang) => {
  try {
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`
    );
    const data = await response.json();
    console.log('MyMemory response:', data);
    
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText;
    }
    return null;
  } catch (error) {
    console.error('MyMemory error:', error);
    return null;
  }
};

export const translateText = async (text, sourceLang, targetLang) => {
  console.log('translateText called:', { text, sourceLang, targetLang });
  
  // Google Translate 먼저 시도 (가장 정확함)
  let translated = await translateWithGoogle(text, sourceLang, targetLang);
  
  // 실패하면 MyMemory 시도
  if (!translated) {
    console.log('Google Translate failed, trying MyMemory...');
    translated = await translateWithMyMemory(text, sourceLang, targetLang);
  }
  
  // 둘 다 실패하면 원문 반환
  if (!translated || translated.length === 0) {
    console.warn('All translation attempts failed, returning original text');
    return text;
  }
  
  console.log('Final translation:', translated);
  return translated;
};

// 한국어 -> 일본어
export const translateKoreanToJapanese = (text) => {
  return translateText(text, 'ko', 'ja');
};

// 일본어 -> 한국어
export const translateJapaneseToKorean = (text) => {
  return translateText(text, 'ja', 'ko');
};

// 자동 언어 감지 및 번역
export const autoTranslate = async (text, userLanguage) => {
  console.log('autoTranslate called:', { text, userLanguage });
  
  // 간단한 언어 감지 (한글/히라가나/카타카나/영문 체크)
  const hasKorean = /[ᄀ-ᇿ|㄰-㆏|가-힯]/.test(text);
  const hasJapanese = /[぀-ゟ゠-ヿ]/.test(text);
  const hasEnglish = /[a-zA-Z]/.test(text) && !hasKorean && !hasJapanese;
  
  console.log('Language detection:', { hasKorean, hasJapanese, hasEnglish });
  
  if (hasKorean && userLanguage === 'ja') {
    console.log('Translating Korean to Japanese');
    return await translateKoreanToJapanese(text);
  } else if (hasJapanese && userLanguage === 'en') {
    console.log('Translating Japanese to English');
    return await translateText(text, 'ja', 'en');
  } else if (hasEnglish && userLanguage === 'ja') {
    console.log('Translating English to Japanese');
    return await translateText(text, 'en', 'ja');
  }
  
  console.log('No translation needed, returning original text');
  return text;
};
