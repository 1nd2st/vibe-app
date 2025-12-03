// Login screen for inventory management app
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../state/authStore";

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading, error, clearError, initializeDB } = useAuthStore();

  useEffect(() => {
    // Initialize database on mount
    initializeDB();
  }, []);

  const handleLogin = async () => {
    if (!username.trim()) {
      Alert.alert("Error", "Please enter your username");
      return;
    }

    if (!password.trim()) {
      Alert.alert("Error", "Please enter your password");
      return;
    }

    const success = await login(username.trim(), password);

    if (success) {
      onLoginSuccess();
    } else {
      Alert.alert("Login Failed", error || "Invalid credentials");
    }
  };

  useEffect(() => {
    // Clear error when user starts typing
    if (error) {
      clearError();
    }
  }, [username, password]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-8">
          {/* Header */}
          <View className="items-center mb-12">
            <Text className="text-4xl font-bold text-gray-900 mb-2">
              Inventory App
            </Text>
            <Text className="text-base text-gray-600">
              Sign in to continue
            </Text>
          </View>

          {/* Login Form */}
          <View className="space-y-4">
            {/* Username Field */}
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Username
              </Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="Enter your username"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoCorrect={false}
                className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-4 text-base text-gray-900"
                editable={!isLoading}
              />
            </View>

            {/* Password Field */}
            <View className="mt-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Password
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-4 text-base text-gray-900"
                editable={!isLoading}
                onSubmitEditing={handleLogin}
                returnKeyType="done"
              />
            </View>

            {/* Login Button */}
            <Pressable
              onPress={handleLogin}
              disabled={isLoading}
              className="bg-blue-600 rounded-xl py-4 mt-6 active:bg-blue-700"
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center text-base font-semibold">
                  Sign In
                </Text>
              )}
            </Pressable>
          </View>

          {/* Helper Text */}
          <View className="mt-8 p-4 bg-blue-50 rounded-xl">
            <Text className="text-sm text-gray-600 text-center">
              Default credentials:{"\n"}
              <Text className="font-mono text-gray-800">
                admin / admin
              </Text>
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
