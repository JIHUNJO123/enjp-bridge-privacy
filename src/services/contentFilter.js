// Content filtering service for profanity detection
const ENGLISH_PROFANITY = [
  'fuck', 'shit', 'bitch', 'ass', 'damn', 'bastard', 'crap', 
  'dick', 'pussy', 'cock', 'whore', 'slut', 'fag', 'nigger'
];

const JAPANESE_PROFANITY = [
  'ばか', 'バカ', '馬鹿', 'くそ', 'クソ', '糞', 'しね', 'シネ', '死ね',
  'あほ', 'アホ', '阿呆', 'ちくしょう', 'チクショウ', '畜生',
  'きちがい', 'キチガイ', '気違い', 'ぶす', 'ブス'
];

/**
 * Check if text contains profanity
 * @param {string} text - Text to check
 * @returns {boolean} - True if profanity detected
 */
export const containsProfanity = (text) => {
  if (!text) return false;
  
  const lowerText = text.toLowerCase();
  
  // Check English profanity
  const hasEnglishProfanity = ENGLISH_PROFANITY.some(word => 
    lowerText.includes(word.toLowerCase())
  );
  
  // Check Japanese profanity
  const hasJapaneseProfanity = JAPANESE_PROFANITY.some(word => 
    text.includes(word)
  );
  
  return hasEnglishProfanity || hasJapaneseProfanity;
};

/**
 * Filter profanity from text by replacing with asterisks
 * @param {string} text - Text to filter
 * @returns {string} - Filtered text
 */
export const filterProfanity = (text) => {
  if (!text) return text;
  
  let filtered = text;
  
  // Filter English profanity
  ENGLISH_PROFANITY.forEach(word => {
    const regex = new RegExp(word, 'gi');
    filtered = filtered.replace(regex, '*'.repeat(word.length));
  });
  
  // Filter Japanese profanity
  JAPANESE_PROFANITY.forEach(word => {
    const regex = new RegExp(word, 'g');
    filtered = filtered.replace(regex, '*'.repeat(word.length));
  });
  
  return filtered;
};

/**
 * Validate message before sending
 * @param {string} text - Message text
 * @returns {object} - {isValid: boolean, message: string}
 */
export const validateMessage = (text) => {
  if (!text || text.trim().length === 0) {
    return {
      isValid: false,
      message: 'Message cannot be empty'
    };
  }
  
  if (containsProfanity(text)) {
    return {
      isValid: false,
      message: 'Message contains inappropriate language'
    };
  }
  
  return {
    isValid: true,
    message: ''
  };
};
