import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/RootNavigator";
import { getCustomerById, createCollection } from "../database/db-collections";
import type { Customer } from "../types/collection";
import { useAuthStore } from "../state/authStore";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "NewCollection">;
  route: RouteProp<RootStackParamList, "NewCollection">;
};

export default function NewCollectionScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { customerId } = route.params;
  const user = useAuthStore((s) => s.user);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [pickupAddress, setPickupAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [notes, setNotes] = useState("");

  // Load customer data
  useEffect(() => {
    const loadCustomer = async () => {
      if (!customerId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const customerData = await getCustomerById(customerId);
        if (customerData) {
          setCustomer(customerData);
          setPickupAddress(customerData.address || "");
        }
      } catch (error) {
        console.error("Failed to load customer:", error);
        Alert.alert("Error", "Failed to load customer");
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomer();
  }, [customerId]);

  const handleCreate = async () => {
    if (!customer || !pickupAddress.trim() || !employeeName.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      const collectionUuid = await createCollection({
        customerName: customer.name,
        customerId: customer.id,
        collectionDate: Date.now(),
        pickupAddress: pickupAddress.trim(),
        deliveryAddress: deliveryAddress.trim() || undefined,
        employeeName: employeeName.trim(),
        notes: notes.trim() || undefined,
      });

      navigation.replace("CollectionDetail", { collectionId: collectionUuid });
    } catch (error) {
      console.error("Failed to create collection:", error);
      Alert.alert("Error", "Failed to create collection");
    } finally {
      setIsSaving(false);
    }
  };

  const canCreate = customer && pickupAddress.trim() && employeeName.trim();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50" style={{ paddingTop: insets.top }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!customer) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50" style={{ paddingTop: insets.top }}>
        <Ionicons name="alert-circle-outline" size={64} color="#DC2626" />
        <Text className="text-gray-900 text-lg font-semibold mt-4">Customer not found</Text>
        <Pressable onPress={() => navigation.goBack()} className="mt-4">
          <Text className="text-blue-600 text-base">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-gray-50"
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-200 flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <Pressable onPress={() => navigation.goBack()} className="mr-4 active:opacity-70">
            <Ionicons name="close" size={28} color="#111827" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900">New Collection</Text>
          </View>
        </View>
        <Pressable
          onPress={() => navigation.navigate("Home" as any)}
          className="ml-2 active:opacity-70"
        >
          <Ionicons name="home-outline" size={24} color="#2563EB" />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        {/* Customer Information */}
        <View className="bg-white rounded-2xl p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">Customer</Text>

          <View className="bg-blue-50 rounded-xl p-4">
            <Text className="text-blue-900 font-semibold text-base">{customer.name}</Text>
            {customer.email && (
              <Text className="text-blue-700 text-sm mt-1">{customer.email}</Text>
            )}
            {customer.phone && (
              <Text className="text-blue-700 text-sm mt-0.5">{customer.phone}</Text>
            )}
          </View>
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
          disabled={!canCreate || isSaving}
          className={`rounded-xl py-4 items-center ${
            canCreate && !isSaving ? "bg-blue-600 active:bg-blue-700" : "bg-gray-300"
          }`}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white text-lg font-semibold">Create Collection</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
