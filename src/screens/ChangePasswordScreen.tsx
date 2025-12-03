// Change Password screen - Users can change their password
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { HomeStackParamList } from "../navigation/HomeNavigator";
import {
  changePassword,
  getPasswordPolicy,
  type PasswordPolicy,
} from "../database/db-enhanced";
import { useAuthStore } from "../state/authStore";

type Props = NativeStackScreenProps<HomeStackParamList, "ChangePassword">;

export default function ChangePasswordScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [policy, setPolicy] = useState<PasswordPolicy | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    try {
      const currentPolicy = await getPasswordPolicy();
      setPolicy(currentPolicy);
    } catch (error) {
      console.error("Failed to load password policy:", error);
    }
  };

  const handleChangePassword = async () => {
    if (!user?.id) {
      Alert.alert("Error", "User not found");
      return;
    }

    // Validation
    if (!currentPassword.trim()) {
      Alert.alert("Error", "Please enter your current password");
      return;
    }

    if (!newPassword.trim()) {
      Alert.alert("Error", "Please enter a new password");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert("Error", "New password must be different from current password");
      return;
    }

    setIsLoading(true);
    try {
      const result = await changePassword(user.id, currentPassword, newPassword);

      if (result.success) {
        Alert.alert(
          "Success",
          "Password changed successfully",
          [
            {
              text: "OK",
              onPress: () => {
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        // Show validation errors
        const errors = result.errors || ["Failed to change password"];
        Alert.alert("Password Requirements", errors.join("\n"));
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to change password");
    } finally {
      setIsLoading(false);
    }
  };

  const getRequirementStatus = (text: string): boolean => {
    if (!policy || !newPassword) return false;

    if (text.includes("8 characters")) {
      return newPassword.length >= policy.min_length;
    }
    if (text.includes("uppercase")) {
      return policy.require_uppercase ? /[A-Z]/.test(newPassword) : true;
    }
    if (text.includes("lowercase")) {
      return policy.require_lowercase ? /[a-z]/.test(newPassword) : true;
    }
    if (text.includes("number")) {
      return policy.require_number ? /[0-9]/.test(newPassword) : true;
    }
    if (text.includes("special character")) {
      return policy.require_special_char ? /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) : true;
    }
    return false;
  };

  const requirements = policy
    ? [
        `At least ${policy.min_length} characters`,
        policy.require_uppercase && "At least one uppercase letter (A-Z)",
        policy.require_lowercase && "At least one lowercase letter (a-z)",
        policy.require_number && "At least one number (0-9)",
        policy.require_special_char && "At least one special character (!@#$%^&*)",
      ].filter(Boolean) as string[]
    : [];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-6 py-4 bg-white border-b border-gray-200">
        <View className="flex-row items-center">
          <Pressable onPress={() => navigation.goBack()} className="mr-4 p-2 -ml-2">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
          <Text className="text-2xl font-bold text-gray-900">Change Password</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView className="flex-1 px-6 py-6">
          {/* Current Password */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-2">Current Password</Text>
            <View className="flex-row items-center bg-white border border-gray-300 rounded-xl px-4">
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showCurrent}
                className="flex-1 py-3 text-base text-gray-900"
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowCurrent(!showCurrent)} className="p-2">
                <Ionicons
                  name={showCurrent ? "eye-off" : "eye"}
                  size={20}
                  color="#6B7280"
                />
              </Pressable>
            </View>
          </View>

          {/* New Password */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-2">New Password</Text>
            <View className="flex-row items-center bg-white border border-gray-300 rounded-xl px-4">
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showNew}
                className="flex-1 py-3 text-base text-gray-900"
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowNew(!showNew)} className="p-2">
                <Ionicons
                  name={showNew ? "eye-off" : "eye"}
                  size={20}
                  color="#6B7280"
                />
              </Pressable>
            </View>
          </View>

          {/* Confirm Password */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-2">Confirm New Password</Text>
            <View className="flex-row items-center bg-white border border-gray-300 rounded-xl px-4">
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter new password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showConfirm}
                className="flex-1 py-3 text-base text-gray-900"
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowConfirm(!showConfirm)} className="p-2">
                <Ionicons
                  name={showConfirm ? "eye-off" : "eye"}
                  size={20}
                  color="#6B7280"
                />
              </Pressable>
            </View>
          </View>

          {/* Password Requirements */}
          {policy && (
            <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <Text className="text-sm font-semibold text-blue-900 mb-3">
                Password Requirements
              </Text>
              {requirements.map((req, index) => {
                const isMet = getRequirementStatus(req);
                return (
                  <View key={index} className="flex-row items-center mb-2">
                    <Ionicons
                      name={isMet ? "checkmark-circle" : "ellipse-outline"}
                      size={18}
                      color={isMet ? "#16A34A" : "#9CA3AF"}
                    />
                    <Text
                      className={`ml-2 text-sm ${isMet ? "text-green-900" : "text-gray-700"}`}
                    >
                      {req}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Must Change Password Warning */}
          {user?.must_change_password && (
            <View className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
              <View className="flex-row items-start">
                <Ionicons name="warning" size={20} color="#EA580C" />
                <View className="flex-1 ml-3">
                  <Text className="text-sm font-semibold text-orange-900 mb-1">
                    Password Change Required
                  </Text>
                  <Text className="text-sm text-orange-800">
                    You must change your password before continuing to use the app.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Change Password Button */}
          <Pressable
            onPress={handleChangePassword}
            disabled={isLoading}
            className={`rounded-xl py-4 mb-6 ${isLoading ? "bg-gray-400" : "bg-blue-600 active:bg-blue-700"}`}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-semibold text-base">
                Change Password
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
