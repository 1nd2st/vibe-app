import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Switch, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSettingsStore } from "../state/settingsStore";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { printTestLabel } from "../utils/zebraPrinter";
import AppHeader from "../components/AppHeader";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Settings">;
};

export default function SettingsScreen({ navigation }: Props) {
  const { settings, updateSettings, resetSettings } = useSettingsStore();

  const [aiEnabled, setAiEnabled] = useState(settings.aiEnabled);
  const [aiAutoDetect, setAiAutoDetect] = useState(settings.aiAutoDetect);
  const [aiPrompt, setAiPrompt] = useState(settings.aiPrompt);
  const [aiModel, setAiModel] = useState(settings.aiModel);

  const [printerEnabled, setPrinterEnabled] = useState(settings.printerEnabled);
  const [printerIp, setPrinterIp] = useState(settings.printerIp || "");
  const [printerPort, setPrinterPort] = useState(settings.printerPort.toString());
  const [labelWidth, setLabelWidth] = useState(settings.labelWidth.toString());
  const [labelHeight, setLabelHeight] = useState(settings.labelHeight.toString());
  const [printerDpi, setPrinterDpi] = useState(settings.printerDpi);

  const [companyName, setCompanyName] = useState(settings.companyName);
  const [isPrintingTest, setIsPrintingTest] = useState(false);

  const handleTestLabel = async () => {
    if (!printerIp.trim()) {
      Alert.alert("Printer IP Required", "Please enter the printer IP address first.");
      return;
    }

    setIsPrintingTest(true);
    const success = await printTestLabel(
      printerIp.trim(),
      parseInt(printerPort) || 9100,
      parseFloat(labelWidth) || 3,
      parseFloat(labelHeight) || 1,
      printerDpi
    );

    setIsPrintingTest(false);

    if (success) {
      Alert.alert(
        "Test Label Sent",
        "A test label has been sent to the printer. Check if it printed correctly.\n\nThe test label includes:\n• Label size and resolution info\n• Border frame (5 DPI smaller)\n• Current label dimensions"
      );
    }
  };

  const handleSave = () => {
    updateSettings({
      aiEnabled,
      aiAutoDetect,
      aiPrompt,
      aiModel,
      printerEnabled,
      printerIp: printerIp || undefined,
      printerPort: parseInt(printerPort) || 9100,
      labelWidth: parseFloat(labelWidth) || 3,
      labelHeight: parseFloat(labelHeight) || 1,
      printerDpi,
      companyName,
    });
    Alert.alert("Settings Saved", "Your settings have been saved successfully.");
  };

  const handleReset = () => {
    Alert.alert(
      "Reset Settings",
      "Are you sure you want to reset all settings to default values?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            resetSettings();
            // Reload settings
            setAiEnabled(false);
            setAiAutoDetect(false);
            setAiPrompt("Analyze this artwork/item photo and identify any visible damage, wear, scratches, cracks, discoloration, or condition issues. Be specific about location and severity.");
            setAiModel("gpt-4o");
            setPrinterEnabled(false);
            setPrinterIp("");
            setPrinterPort("9100");
            setLabelWidth("3");
            setLabelHeight("1");
            setPrinterDpi(203);
            setCompanyName("Art Logistics");
            Alert.alert("Settings Reset", "All settings have been reset to default values.");
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      {/* Header */}
      <AppHeader
        title="Settings"
        onBackPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            (navigation as any).navigate("Home");
          }
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        {/* User Management Link (Admin Only) */}
        <Pressable
          onPress={() => (navigation as any).navigate("InventorySettings")}
          className="bg-white rounded-2xl p-4 mb-4 border-2 border-blue-200 active:bg-gray-50"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <View className="flex-row items-center mb-2">
                <View className="bg-blue-100 rounded-full p-2 mr-3">
                  <Ionicons name="people" size={20} color="#2563EB" />
                </View>
                <Text className="text-lg font-semibold text-gray-900">User Management & Security</Text>
              </View>
              <Text className="text-sm text-gray-600 ml-11">
                Manage users, passwords, and access control
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#3B82F6" />
          </View>
        </Pressable>

        {/* General Settings */}
        <View className="bg-white rounded-2xl p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">General</Text>

          <Text className="text-sm font-medium text-gray-700 mb-2">Company Name</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
            placeholder="Your company name"
            placeholderTextColor="#9CA3AF"
            value={companyName}
            onChangeText={setCompanyName}
          />
        </View>

        {/* AI Damage Detection */}
        <View className="bg-white rounded-2xl p-4 mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900">AI Damage Detection</Text>
              <Text className="text-sm text-gray-600 mt-1">
                Automatically analyze photos for damage
              </Text>
            </View>
            <Switch
              value={aiEnabled}
              onValueChange={setAiEnabled}
              trackColor={{ false: "#D1D5DB", true: "#3B82F6" }}
              thumbColor={aiEnabled ? "#FFFFFF" : "#F3F4F6"}
            />
          </View>

          {aiEnabled && (
            <>
              <View className="flex-row items-center justify-between mb-4 pb-4 border-b border-gray-100">
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-900">Auto-detect on photo capture</Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    Analyze photos automatically when taken
                  </Text>
                </View>
                <Switch
                  value={aiAutoDetect}
                  onValueChange={setAiAutoDetect}
                  trackColor={{ false: "#D1D5DB", true: "#3B82F6" }}
                  thumbColor={aiAutoDetect ? "#FFFFFF" : "#F3F4F6"}
                />
              </View>

              <Text className="text-sm font-medium text-gray-700 mb-2">AI Model</Text>
              <View className="flex-row gap-3 mb-4">
                <Pressable
                  onPress={() => setAiModel("gpt-4o")}
                  className={`flex-1 px-4 py-3 rounded-xl border ${
                    aiModel === "gpt-4o"
                      ? "bg-blue-50 border-blue-600"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium text-center ${
                      aiModel === "gpt-4o" ? "text-blue-700" : "text-gray-700"
                    }`}
                  >
                    GPT-4 Vision
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setAiModel("claude-3-5-sonnet")}
                  className={`flex-1 px-4 py-3 rounded-xl border ${
                    aiModel === "claude-3-5-sonnet"
                      ? "bg-blue-50 border-blue-600"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium text-center ${
                      aiModel === "claude-3-5-sonnet" ? "text-blue-700" : "text-gray-700"
                    }`}
                  >
                    Claude 3.5
                  </Text>
                </Pressable>
              </View>

              <Text className="text-sm font-medium text-gray-700 mb-2">
                AI Analysis Instructions
              </Text>
              <Text className="text-xs text-gray-500 mb-2">
                Tell the AI what to look for when analyzing photos
              </Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                placeholder="What should the AI look for?"
                placeholderTextColor="#9CA3AF"
                value={aiPrompt}
                onChangeText={setAiPrompt}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </>
          )}
        </View>

        {/* Zebra Printer Settings */}
        <View className="bg-white rounded-2xl p-4 mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900">Zebra Label Printer</Text>
              <Text className="text-sm text-gray-600 mt-1">
                Print QR code labels for items
              </Text>
            </View>
            <Switch
              value={printerEnabled}
              onValueChange={setPrinterEnabled}
              trackColor={{ false: "#D1D5DB", true: "#3B82F6" }}
              thumbColor={printerEnabled ? "#FFFFFF" : "#F3F4F6"}
            />
          </View>

          {printerEnabled && (
            <>
              <Text className="text-sm font-medium text-gray-700 mb-2">Printer IP Address</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
                placeholder="e.g., 192.168.1.100"
                placeholderTextColor="#9CA3AF"
                value={printerIp}
                onChangeText={setPrinterIp}
                keyboardType="decimal-pad"
              />

              <Text className="text-sm font-medium text-gray-700 mb-2">Printer Port</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
                placeholder="Default: 9100"
                placeholderTextColor="#9CA3AF"
                value={printerPort}
                onChangeText={setPrinterPort}
                keyboardType="number-pad"
              />

              <View className="flex-row gap-3 mb-4">
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Label Width (inches)</Text>
                  <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                    placeholder="3"
                    placeholderTextColor="#9CA3AF"
                    value={labelWidth}
                    onChangeText={setLabelWidth}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Label Height (inches)</Text>
                  <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                    placeholder="1"
                    placeholderTextColor="#9CA3AF"
                    value={labelHeight}
                    onChangeText={setLabelHeight}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <Text className="text-sm font-medium text-gray-700 mb-2">Printer Resolution (DPI)</Text>
              <View className="flex-row gap-3">
                {([203, 300, 600] as const).map((dpi) => (
                  <Pressable
                    key={dpi}
                    onPress={() => setPrinterDpi(dpi)}
                    className={`flex-1 px-4 py-3 rounded-xl border ${
                      printerDpi === dpi
                        ? "bg-blue-50 border-blue-600"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium text-center ${
                        printerDpi === dpi ? "text-blue-700" : "text-gray-700"
                      }`}
                    >
                      {dpi} DPI
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Test Label Button */}
              <Pressable
                onPress={handleTestLabel}
                disabled={isPrintingTest || !printerIp.trim()}
                className={`mt-4 rounded-xl py-4 items-center flex-row justify-center border-2 ${
                  isPrintingTest || !printerIp.trim()
                    ? "bg-gray-100 border-gray-300"
                    : "bg-green-50 border-green-600 active:bg-green-100"
                }`}
              >
                {isPrintingTest ? (
                  <>
                    <ActivityIndicator size="small" color="#16A34A" />
                    <Text className="text-green-700 text-base font-semibold ml-2">Printing Test...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="print-outline" size={20} color={printerIp.trim() ? "#16A34A" : "#9CA3AF"} />
                    <Text className={`text-base font-semibold ml-2 ${printerIp.trim() ? "text-green-700" : "text-gray-400"}`}>
                      Print Test Label
                    </Text>
                  </>
                )}
              </Pressable>

              <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-4">
                <Text className="text-amber-900 text-xs font-medium mb-1">Test Label Info:</Text>
                <Text className="text-amber-800 text-xs">
                  • Prints with 5 DPI border frame{"\n"}
                  • Shows label dimensions and resolution{"\n"}
                  • Verifies printer connectivity
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Reset Button */}
        <Pressable
          onPress={handleReset}
          className="bg-red-50 border border-red-200 rounded-xl py-4 items-center mb-4 active:bg-red-100"
        >
          <Text className="text-red-600 text-base font-semibold">Reset to Defaults</Text>
        </Pressable>
      </ScrollView>

      {/* Save Button */}
      <View className="bg-white border-t border-gray-200 px-6 py-4">
        <Pressable
          onPress={handleSave}
          className="bg-blue-600 rounded-xl py-4 items-center active:bg-blue-700"
        >
          <Text className="text-white text-lg font-semibold">Save Settings</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
