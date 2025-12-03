// Inventory Settings screen with User Management, Password Policy, Printer settings
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { HomeStackParamList } from "../navigation/HomeNavigator";
import { useAuthStore } from "../state/authStore";

type Props = NativeStackScreenProps<HomeStackParamList, "InventorySettings">;

export default function InventorySettingsScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-6 py-4 bg-white border-b border-gray-200">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => navigation.goBack()}
            className="mr-4 p-2 -ml-2"
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
          <Text className="text-2xl font-bold text-gray-900">Settings</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-6">
        {/* User Management Section (Admin Only) */}
        {isAdmin && (
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Administration
            </Text>

            <Pressable
              onPress={() => navigation.navigate("UserManagement")}
              className="bg-white rounded-xl p-4 border border-gray-200 mb-3 active:bg-gray-50"
            >
              <View className="flex-row items-center">
                <View className="bg-blue-100 rounded-full p-3 mr-4">
                  <Ionicons name="people-outline" size={24} color="#2563EB" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900">
                    User Management
                  </Text>
                  <Text className="text-sm text-gray-600 mt-1">
                    Add, edit, and manage user accounts
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate("PasswordPolicy")}
              className="bg-white rounded-xl p-4 border border-gray-200 active:bg-gray-50"
            >
              <View className="flex-row items-center">
                <View className="bg-purple-100 rounded-full p-3 mr-4">
                  <Ionicons name="shield-checkmark-outline" size={24} color="#7C3AED" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900">
                    Password Policy
                  </Text>
                  <Text className="text-sm text-gray-600 mt-1">
                    Configure password requirements
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </Pressable>
          </View>
        )}

        {/* Account Section */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Account
          </Text>

          <Pressable
            onPress={() => navigation.navigate("ChangePassword")}
            className="bg-white rounded-xl p-4 border border-gray-200 mb-3 active:bg-gray-50"
          >
            <View className="flex-row items-center">
              <View className="bg-green-100 rounded-full p-3 mr-4">
                <Ionicons name="key-outline" size={24} color="#16A34A" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  Change Password
                </Text>
                <Text className="text-sm text-gray-600 mt-1">
                  Update your login password
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </Pressable>

          <View className="bg-white rounded-xl p-4 border border-gray-200">
            <View className="flex-row items-center">
              <View className="bg-gray-100 rounded-full p-3 mr-4">
                <Ionicons name="person-outline" size={24} color="#6B7280" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  Logged in as
                </Text>
                <Text className="text-sm text-gray-600 mt-1">
                  {user?.username} ({user?.role})
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Printer Section (Coming Soon) */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Printer Settings
          </Text>

          <View className="bg-white rounded-xl p-4 border border-gray-200 opacity-60">
            <View className="flex-row items-center">
              <View className="bg-orange-100 rounded-full p-3 mr-4">
                <Ionicons name="print-outline" size={24} color="#EA580C" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  Zebra Printer Setup
                </Text>
                <Text className="text-sm text-gray-600 mt-1">
                  Configure IP, port, and label settings
                </Text>
                <Text className="text-xs text-orange-600 mt-1">
                  Coming soon
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* App Info */}
        <View className="bg-gray-100 rounded-xl p-4">
          <Text className="text-xs text-gray-600 text-center">
            Inventory Management System
          </Text>
          <Text className="text-xs text-gray-500 text-center mt-1">
            Version 1.0.0 • Dec 2025
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
