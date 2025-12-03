// Home screen with Collection and Inventory Management options
import React from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { HomeStackParamList } from "../navigation/HomeNavigator";
import { useAuthStore } from "../state/authStore";

type Props = NativeStackScreenProps<HomeStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-6 py-4 bg-white border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-gray-900">
              Welcome Back
            </Text>
            <Text className="text-sm text-gray-600 mt-1">
              {user?.username || "User"}
            </Text>
          </View>
          <Pressable
            onPress={handleLogout}
            className="bg-gray-100 rounded-full p-3 active:bg-gray-200"
          >
            <Ionicons name="log-out-outline" size={24} color="#374151" />
          </Pressable>
        </View>
      </View>

      {/* Main Content */}
      <View className="flex-1 justify-center px-6 pb-20">
        <View className="space-y-4">
          {/* Collection Button */}
          <Pressable
            onPress={() => navigation.navigate("Customers")}
            className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 active:bg-gray-50"
          >
            <View className="items-center">
              <View className="bg-blue-100 rounded-full p-6 mb-4">
                <Ionicons name="albums-outline" size={48} color="#2563EB" />
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-2">
                Collection
              </Text>
              <Text className="text-sm text-gray-600 text-center">
                Document items at customer site
              </Text>
            </View>
          </Pressable>

          {/* Inventory Management Button */}
          <Pressable
            onPress={() => navigation.navigate("InventoryMenu")}
            className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 active:bg-gray-50"
          >
            <View className="items-center">
              <View className="bg-green-100 rounded-full p-6 mb-4">
                <Ionicons name="cube-outline" size={48} color="#16A34A" />
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-2">
                Inventory Management
              </Text>
              <Text className="text-sm text-gray-600 text-center">
                Track and manage warehouse inventory
              </Text>
            </View>
          </Pressable>

          {/* Settings Button */}
          <Pressable
            onPress={() => navigation.navigate("Settings")}
            className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 active:bg-gray-50"
          >
            <View className="items-center">
              <View className="bg-orange-100 rounded-full p-6 mb-4">
                <Ionicons name="settings-outline" size={48} color="#EA580C" />
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-2">
                Settings
              </Text>
              <Text className="text-sm text-gray-600 text-center">
                Configure app settings and preferences
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* Footer */}
      <View className="px-6 py-4 bg-white border-t border-gray-200">
        <Text className="text-xs text-gray-500 text-center">
          Inventory Management System v1.0
        </Text>
      </View>
    </SafeAreaView>
  );
}
