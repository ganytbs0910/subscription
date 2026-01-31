import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

const IOS_CLIENT_ID =
  '215942414602-5nqqk5nv72d7nnahosgt94a2dsb843nb.apps.googleusercontent.com';

export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    iosClientId: IOS_CLIENT_ID,
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
  });
};

export const signInWithGoogle = async () => {
  try {
    // 以前のセッションをクリアしてスコープを再取得
    const currentUser = GoogleSignin.getCurrentUser();
    if (currentUser) {
      await GoogleSignin.signOut();
    }

    const response = await GoogleSignin.signIn();
    const tokens = await GoogleSignin.getTokens();

    return {
      user: response.data?.user,
      accessToken: tokens.accessToken,
    };
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new Error('ログインがキャンセルされました');
    } else if (error.code === statusCodes.IN_PROGRESS) {
      throw new Error('ログイン処理中です');
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Google Play Servicesが利用できません');
    } else {
      throw error;
    }
  }
};

export const signOutGoogle = async () => {
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    if (__DEV__) {
      console.error('Sign out error:', error);
    }
  }
};

export const isSignedIn = async () => {
  const hasPreviousSignIn = GoogleSignin.hasPreviousSignIn();
  if (hasPreviousSignIn) {
    try {
      const tokens = await GoogleSignin.getTokens();
      return { isSignedIn: true, accessToken: tokens.accessToken };
    } catch {
      return { isSignedIn: false, accessToken: null };
    }
  }
  return { isSignedIn: false, accessToken: null };
};

export const getCurrentUser = () => {
  return GoogleSignin.getCurrentUser();
};
