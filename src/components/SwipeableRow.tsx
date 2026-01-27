import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 80;
const DELETE_WIDTH = 80;

interface Props {
  children: React.ReactNode;
  onDelete?: () => void;
}

export default function SwipeableRow({ children, onDelete }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 20;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -SWIPE_THRESHOLD && onDelete) {
          Animated.spring(translateX, {
            toValue: -DELETE_WIDTH,
            useNativeDriver: true,
            friction: 8,
          }).start();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  return (
    <View style={styles.container}>
      {/* Delete button anchored to the right edge, revealed by swipe */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => {
          Animated.spring(translateX, {
            toValue: -SCREEN_WIDTH,
            useNativeDriver: true,
          }).start(() => {
            onDelete?.();
            translateX.setValue(0);
          });
        }}
        activeOpacity={0.7}
      >
        <Icon name="delete" size={22} color="#FFF" />
        <Text style={styles.deleteText}>削除</Text>
      </TouchableOpacity>
      <Animated.View
        style={[styles.rowContent, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
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
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
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
});
