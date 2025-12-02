import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";

export interface BreadcrumbItem {
  label: string;
  screen?: keyof RootStackParamList;
  params?: any;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handlePress = (item: BreadcrumbItem) => {
    if (item.screen) {
      // @ts-ignore - Dynamic navigation
      navigation.navigate(item.screen, item.params);
    }
  };

  return (
    <View className="flex-row items-center px-6 py-2 bg-gray-50 border-b border-gray-200">
      {items.map((item, index) => (
        <View key={index} className="flex-row items-center">
          {index > 0 && (
            <Ionicons name="chevron-forward" size={14} color="#9CA3AF" style={{ marginHorizontal: 6 }} />
          )}
          {item.screen && index < items.length - 1 ? (
            <Pressable onPress={() => handlePress(item)} className="active:opacity-70">
              <Text className="text-sm text-blue-600 font-medium">{item.label}</Text>
            </Pressable>
          ) : (
            <Text className="text-sm text-gray-900 font-semibold">{item.label}</Text>
          )}
        </View>
      ))}
    </View>
  );
}
