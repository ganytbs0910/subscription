module.exports = {
  project: {
    ios: {
      automaticPodsInstallation: true,
    },
    android: {},
  },
  // Disable New Architecture to support react-native-tcp-socket
  reactNativeArchitectures: {
    ios: {
      newArchEnabled: false,
    },
    android: {
      newArchEnabled: false,
    },
  },
};
