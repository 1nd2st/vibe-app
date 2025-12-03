// Password Policy screen - Admin can configure password requirements
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { HomeStackParamList } from "../navigation/HomeNavigator";
import {
  getPasswordPolicy,
  updatePasswordPolicy,
  type PasswordPolicy,
} from "../database/db-enhanced";
import { useAuthStore } from "../state/authStore";

type Props = NativeStackScreenProps<HomeStackParamList, "PasswordPolicy">;

export default function PasswordPolicyScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [policy, setPolicy] = useState<PasswordPolicy | null>(null);

  // Form state
  const [minLength, setMinLength] = useState("8");
  const [requireUppercase, setRequireUppercase] = useState(true);
  const [requireLowercase, setRequireLowercase] = useState(true);
  const [requireNumber, setRequireNumber] = useState(true);
  const [requireSpecialChar, setRequireSpecialChar] = useState(false);
  const [expiryEnabled, setExpiryEnabled] = useState(false);
  const [expiryDays, setExpiryDays] = useState("90");

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    setIsLoading(true);
    try {
      const currentPolicy = await getPasswordPolicy();
      if (currentPolicy) {
        setPolicy(currentPolicy);
        setMinLength(currentPolicy.min_length.toString());
        setRequireUppercase(currentPolicy.require_uppercase);
        setRequireLowercase(currentPolicy.require_lowercase);
        setRequireNumber(currentPolicy.require_number);
        setRequireSpecialChar(currentPolicy.require_special_char);

        if (currentPolicy.password_expiry_days && currentPolicy.password_expiry_days > 0) {
          setExpiryEnabled(true);
          setExpiryDays(currentPolicy.password_expiry_days.toString());
        } else {
          setExpiryEnabled(false);
          setExpiryDays("90");
        }
      }
    } catch (error) {
      console.error("Failed to load password policy:", error);
      Alert.alert("Error", "Failed to load password policy");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) {
      Alert.alert("Error", "User not found");
      return;
    }

    const length = parseInt(minLength);
    if (isNaN(length) || length < 4 || length > 128) {
      Alert.alert("Error", "Minimum length must be between 4 and 128");
      return;
    }

    let expiryDaysValue: number | null = null;
    if (expiryEnabled) {
      const days = parseInt(expiryDays);
      if (isNaN(days) || days < 1 || days > 365) {
        Alert.alert("Error", "Expiry days must be between 1 and 365 days");
        return;
      }
      expiryDaysValue = days;
    }

    setIsSaving(true);
    try {
      await updatePasswordPolicy(
        {
          min_length: length,
          require_uppercase: requireUppercase,
          require_lowercase: requireLowercase,
          require_number: requireNumber,
          require_special_char: requireSpecialChar,
          password_expiry_days: expiryDaysValue || 0,
        },
        user.id
      );

      Alert.alert("Success", "Password policy updated successfully");
      navigation.goBack();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update password policy");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-6 py-4 bg-white border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Pressable onPress={() => navigation.goBack()} className="mr-4 p-2 -ml-2">
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </Pressable>
            <Text className="text-2xl font-bold text-gray-900">Password Policy</Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <ScrollView className="flex-1 px-6 py-6">
          {/* Minimum Length */}
          <View className="bg-white rounded-xl p-4 border border-gray-200 mb-4">
            <Text className="text-base font-semibold text-gray-900 mb-2">
              Minimum Password Length
            </Text>
            <TextInput
              value={minLength}
              onChangeText={setMinLength}
              placeholder="8"
              keyboardType="number-pad"
              placeholderTextColor="#9CA3AF"
              className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900"
            />
            <Text className="text-xs text-gray-600 mt-2">
              Minimum: 4 characters, Maximum: 128 characters
            </Text>
          </View>

          {/* Character Requirements */}
          <View className="bg-white rounded-xl p-4 border border-gray-200 mb-4">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              Character Requirements
            </Text>

            <View className="space-y-3">
              <View className="flex-row items-center justify-between py-2">
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-900">Uppercase Letter</Text>
                  <Text className="text-xs text-gray-600 mt-1">At least one A-Z</Text>
                </View>
                <Switch
                  value={requireUppercase}
                  onValueChange={setRequireUppercase}
                  trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
                  thumbColor={requireUppercase ? "#2563EB" : "#F3F4F6"}
                />
              </View>

              <View className="flex-row items-center justify-between py-2 border-t border-gray-100">
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-900">Lowercase Letter</Text>
                  <Text className="text-xs text-gray-600 mt-1">At least one a-z</Text>
                </View>
                <Switch
                  value={requireLowercase}
                  onValueChange={setRequireLowercase}
                  trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
                  thumbColor={requireLowercase ? "#2563EB" : "#F3F4F6"}
                />
              </View>

              <View className="flex-row items-center justify-between py-2 border-t border-gray-100">
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-900">Number</Text>
                  <Text className="text-xs text-gray-600 mt-1">At least one 0-9</Text>
                </View>
                <Switch
                  value={requireNumber}
                  onValueChange={setRequireNumber}
                  trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
                  thumbColor={requireNumber ? "#2563EB" : "#F3F4F6"}
                />
              </View>

              <View className="flex-row items-center justify-between py-2 border-t border-gray-100">
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-900">Special Character</Text>
                  <Text className="text-xs text-gray-600 mt-1">{"At least one !@#$%^&*"}</Text>
                </View>
                <Switch
                  value={requireSpecialChar}
                  onValueChange={setRequireSpecialChar}
                  trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
                  thumbColor={requireSpecialChar ? "#2563EB" : "#F3F4F6"}
                />
              </View>
            </View>
          </View>

          {/* Password Expiration */}
          <View className="bg-white rounded-xl p-4 border border-gray-200 mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">Password Expiration</Text>
                <Text className="text-xs text-gray-600 mt-1">
                  Force users to change passwords periodically
                </Text>
              </View>
              <Switch
                value={expiryEnabled}
                onValueChange={setExpiryEnabled}
                trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
                thumbColor={expiryEnabled ? "#2563EB" : "#F3F4F6"}
              />
            </View>

            {expiryEnabled && (
              <View className="mt-3 pt-3 border-t border-gray-100">
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Maximum Password Age (days)
                </Text>
                <TextInput
                  value={expiryDays}
                  onChangeText={setExpiryDays}
                  placeholder="90"
                  keyboardType="number-pad"
                  placeholderTextColor="#9CA3AF"
                  className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900"
                />
                <Text className="text-xs text-gray-600 mt-2">
                  Range: 1-365 days
                </Text>
              </View>
            )}
          </View>

          {/* Info */}
          <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <View className="flex-row">
              <Ionicons name="information-circle" size={20} color="#2563EB" />
              <View className="flex-1 ml-3">
                <Text className="text-sm text-blue-900">
                  Password policy applies to all new passwords and password changes. Existing passwords are not affected until users change them.
                </Text>
              </View>
            </View>
          </View>

          {/* Save Button */}
          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            className={`rounded-xl py-4 mb-6 ${isSaving ? "bg-gray-400" : "bg-blue-600 active:bg-blue-700"}`}
          >
            {isSaving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-semibold text-base">
                Save Policy
              </Text>
            )}
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
