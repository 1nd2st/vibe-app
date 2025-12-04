import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

interface ScreenHeaderProps {
  title: string;
  navigation: NativeStackNavigationProp<any>;
  showBack?: boolean;
  showHome?: boolean;
  rightComponent?: React.ReactNode;
}

/**
 * Shared header component for consistent navigation across all screens
 * - Root screens (Customers, InventoryMenu, Settings): back goes to Home
 * - Deep screens: back goes to previous screen
 * - All screens show Home icon to quickly navigate to Home
 */
export default function ScreenHeader({
  title,
  navigation,
  showBack = true,
  showHome = true,
  rightComponent,
}: ScreenHeaderProps) {
  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // If cannot go back, navigate to Home
      navigation.navigate("Home" as never);
    }
  };

  const handleHomePress = () => {
    navigation.navigate("Home" as never);
  };

  return (
    <View className="bg-white px-6 py-4 border-b border-gray-200">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          {showBack && (
            <Pressable onPress={handleBackPress} className="mr-4 active:opacity-70 -ml-2">
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </Pressable>
          )}
          <Text className="text-2xl font-bold text-gray-900" numberOfLines={1}>
            {title}
          </Text>
        </View>

        <View className="flex-row items-center gap-3">
          {rightComponent}
          {showHome && (
            <Pressable onPress={handleHomePress} className="active:opacity-70">
              <Ionicons name="home-outline" size={24} color="#2563EB" />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
