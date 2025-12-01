import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useCollectionStore } from "../state/collectionStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "NewCollection">;
};

export default function NewCollectionScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const addCollection = useCollectionStore((s) => s.addCollection);

  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [notes, setNotes] = useState("");

  const handleCreate = () => {
    if (!customerName.trim() || !pickupAddress.trim() || !employeeName.trim()) {
      return;
    }

    const collectionId = addCollection({
      customerName: customerName.trim(),
      customerId: `CUST-${Date.now()}`,
      collectionDate: Date.now(),
      status: "in_progress",
      pickupAddress: pickupAddress.trim(),
      deliveryAddress: deliveryAddress.trim() || undefined,
      employeeName: employeeName.trim(),
      notes: notes.trim() || undefined,
    });

    navigation.replace("CollectionDetail", { collectionId });
  };

  const canCreate = customerName.trim() && pickupAddress.trim() && employeeName.trim();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-gray-50"
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-200 flex-row items-center">
        <Pressable onPress={() => navigation.goBack()} className="mr-4 active:opacity-70">
          <Ionicons name="close" size={28} color="#111827" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-bold text-gray-900">New Collection</Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        {/* Customer Information */}
        <View className="bg-white rounded-2xl p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">Customer Information</Text>

          <Text className="text-sm font-medium text-gray-700 mb-2">Customer Name *</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
            placeholder="Enter customer name"
            placeholderTextColor="#9CA3AF"
            value={customerName}
            onChangeText={setCustomerName}
          />

          <Text className="text-sm font-medium text-gray-700 mb-2">Address</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
            placeholder="Customer address"
            placeholderTextColor="#9CA3AF"
            value={customerAddress}
            onChangeText={setCustomerAddress}
            multiline
          />

          <Text className="text-sm font-medium text-gray-700 mb-2">Phone</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
            placeholder="Phone number"
            placeholderTextColor="#9CA3AF"
            value={customerPhone}
            onChangeText={setCustomerPhone}
            keyboardType="phone-pad"
          />

          <Text className="text-sm font-medium text-gray-700 mb-2">Email</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
            placeholder="Email address"
            placeholderTextColor="#9CA3AF"
            value={customerEmail}
            onChangeText={setCustomerEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Collection Details */}
        <View className="bg-white rounded-2xl p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">Collection Details</Text>

          <Text className="text-sm font-medium text-gray-700 mb-2">Pickup Address *</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
            placeholder="Where to collect items"
            placeholderTextColor="#9CA3AF"
            value={pickupAddress}
            onChangeText={setPickupAddress}
            multiline
          />

          <Text className="text-sm font-medium text-gray-700 mb-2">Delivery Address</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
            placeholder="Optional delivery destination"
            placeholderTextColor="#9CA3AF"
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
            multiline
          />

          <Text className="text-sm font-medium text-gray-700 mb-2">Collector Name *</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
            placeholder="Employee handling collection"
            placeholderTextColor="#9CA3AF"
            value={employeeName}
            onChangeText={setEmployeeName}
          />

          <Text className="text-sm font-medium text-gray-700 mb-2">Notes</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
            placeholder="Additional notes about this collection"
            placeholderTextColor="#9CA3AF"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <Text className="text-xs text-gray-500 text-center mb-4">* Required fields</Text>
      </ScrollView>

      {/* Create Button */}
      <View className="bg-white border-t border-gray-200 px-6 py-4" style={{ paddingBottom: insets.bottom + 16 }}>
        <Pressable
          onPress={handleCreate}
          disabled={!canCreate}
          className={`rounded-xl py-4 items-center ${
            canCreate ? "bg-blue-600 active:bg-blue-700" : "bg-gray-300"
          }`}
        >
          <Text className="text-white text-lg font-semibold">Create Collection</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
