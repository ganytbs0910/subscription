import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  ViewStyle,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 50;
const DELETE_WIDTH = 80;

interface Props {
  children: React.ReactNode;
  onDelete?: () => void;
  onPress?: () => void;
  style?: ViewStyle;
}

export default function SwipeableRow({ children, onDelete, onPress, style }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [isOpen, setIsOpen] = useState(false);
  const startX = useRef(0);

  const closeRow = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
    }).start();
    setIsOpen(false);
  };

  const openRow = () => {
    Animated.spring(translateX, {
      toValue: -DELETE_WIDTH,
      useNativeDriver: true,
      friction: 8,
    }).start();
    setIsOpen(true);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // 横方向の動きが縦方向より大きい場合にスワイプと判定
        return Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderGrant: () => {
        startX.current = (translateX as any)._value;
      },
      onPanResponderMove: (_, gestureState) => {
        const newValue = startX.current + gestureState.dx;
        // 左スワイプのみ許可（最大DELETE_WIDTH分）
        if (newValue <= 0 && newValue >= -DELETE_WIDTH) {
          translateX.setValue(newValue);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -SWIPE_THRESHOLD) {
          openRow();
        } else if (gestureState.dx > SWIPE_THRESHOLD) {
          closeRow();
        } else {
          // しきい値に達していない場合は元の状態に戻す
          if (isOpen) {
            openRow();
          } else {
            closeRow();
          }
        }
      },
    })
  ).current;

  const handleDelete = () => {
    Animated.timing(translateX, {
      toValue: -SCREEN_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDelete?.();
      translateX.setValue(0);
      setIsOpen(false);
    });
  };

  const handlePress = () => {
    if (isOpen) {
      closeRow();
    } else {
      onPress?.();
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* Delete button */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={handleDelete}
        activeOpacity={0.7}
      >
        <Icon name="delete" size={22} color="#FFF" />
        <Text style={styles.deleteText}>削除</Text>
      </TouchableOpacity>

      <Animated.View
        style={[styles.rowContent, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handlePress}
          style={styles.touchable}
        >
          {children}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 14,
  },
  deleteButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_WIDTH,
    backgroundColor: '#D32F2F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  rowContent: {
    backgroundColor: 'transparent',
  },
  touchable: {
    width: '100%',
  },
});
