const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  
  // 웹 빌드 시 react-native-google-mobile-ads를 빈 모듈로 대체
  config.resolve.alias = {
    ...config.resolve.alias,
    'react-native-google-mobile-ads': false,
  };
  
  return config;
};
