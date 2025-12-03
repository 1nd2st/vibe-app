// Inventory Management menu screen
import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { HomeStackParamList } from "../navigation/HomeNavigator";
import AppHeader from "../components/AppHeader";

type Props = NativeStackScreenProps<HomeStackParamList, "InventoryMenu">;

export default function InventoryMenuScreen({ navigation }: Props) {
  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <AppHeader
        title="Inventory Management"
        onBackPress={() => navigation.navigate("Home")}
      />

      {/* Menu Options */}
      <ScrollView className="flex-1" contentContainerClassName="px-6 py-6">
        <View className="space-y-4">
          {/* Scan & Put Away */}
          <Pressable
            onPress={() => navigation.navigate("ScanPutAway")}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 active:bg-gray-50"
          >
            <View className="flex-row items-center">
              <View className="bg-blue-100 rounded-full p-4 mr-4">
                <Ionicons name="scan-outline" size={32} color="#2563EB" />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-gray-900 mb-1">
                  Scan & Put Away
                </Text>
                <Text className="text-sm text-gray-600">
                  Scan items and assign storage locations
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
            </View>
          </Pressable>

          {/* Search Item */}
          <Pressable
            onPress={() => navigation.navigate("SearchItem")}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 active:bg-gray-50"
          >
            <View className="flex-row items-center">
              <View className="bg-purple-100 rounded-full p-4 mr-4">
                <Ionicons name="search-outline" size={32} color="#9333EA" />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-gray-900 mb-1">
                  Search Item
                </Text>
                <Text className="text-sm text-gray-600">
                  Find items by ID, description, or customer
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
            </View>
          </Pressable>

          {/* Browse Locations */}
          <Pressable
            onPress={() => navigation.navigate("BrowseLocations")}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 active:bg-gray-50"
          >
            <View className="flex-row items-center">
              <View className="bg-green-100 rounded-full p-4 mr-4">
                <Ionicons name="file-tray-stacked-outline" size={32} color="#16A34A" />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-gray-900 mb-1">
                  Browse Locations
                </Text>
                <Text className="text-sm text-gray-600">
                  View warehouse locations and inventory
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
