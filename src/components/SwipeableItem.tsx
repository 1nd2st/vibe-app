import React, { useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";

interface SwipeableItemProps {
  children: React.ReactNode;
  onDelete: () => void;
  enabled?: boolean;
}

export default function SwipeableItem({ children, onDelete, enabled = true }: SwipeableItemProps) {
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });

    const opacity = dragX.interpolate({
      inputRange: [-100, -50, 0],
      outputRange: [1, 0.5, 0],
      extrapolate: "clamp",
    });

    return (
      <Animated.View
        style={[
          styles.deleteButton,
          {
            opacity,
            transform: [{ scale }],
          },
        ]}
      >
        <Ionicons name="trash" size={24} color="#FFFFFF" />
        <Text style={styles.deleteText}>Delete</Text>
      </Animated.View>
    );
  };

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      onSwipeableOpen={(direction) => {
        if (direction === "right") {
          onDelete();
          swipeableRef.current?.close();
        }
      }}
      rightThreshold={80}
      friction={2}
      overshootRight={false}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  deleteButton: {
    backgroundColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
    width: 100,
    marginBottom: 12,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  deleteText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
});
