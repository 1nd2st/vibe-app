// Unified header component for consistent navigation across the app
import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useNavigationState } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

interface AppHeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightButton?: React.ReactNode;
}

export default function AppHeader({
  title,
  showBackButton = true,
  onBackPress,
  rightButton,
}: AppHeaderProps) {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const navigationState = useNavigationState((state) => state);

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
      return;
    }

    // Check if we can go back in the stack
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // If we're at a root screen, go to Home
      navigation.navigate("Home");
    }
  };

  return (
    <View className="px-6 py-4 bg-white border-b border-gray-200">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          {showBackButton && (
            <Pressable
              onPress={handleBackPress}
              className="mr-4 p-2 -ml-2 active:bg-gray-100 rounded-lg"
            >
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </Pressable>
          )}
          <Text className="text-2xl font-bold text-gray-900" numberOfLines={1}>
            {title}
          </Text>
        </View>
        {rightButton && <View className="ml-4">{rightButton}</View>}
      </View>
    </View>
  );
}
