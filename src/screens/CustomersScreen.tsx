import React, { useState } from "react";
import { View, Text, FlatList, Pressable, TextInput, Modal, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useCollectionStore } from "../state/collectionStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Customers">;
};

export default function CustomersScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const customers = useCollectionStore((s) => s.customers);
  const collections = useCollectionStore((s) => s.collections);
  const addCustomer = useCollectionStore((s) => s.addCustomer);

  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  const filteredCustomers = customers.filter((cust) =>
    cust.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cust.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCustomerCollections = (customerId: string) => {
    return collections.filter((col) => col.customerId === customerId);
  };

  const handleAddCustomer = () => {
    if (!customerName.trim()) return;

    addCustomer({
      name: customerName.trim(),
      phone: customerPhone.trim(),
      email: customerEmail.trim(),
      address: customerAddress.trim(),
    });

    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setCustomerAddress("");
    setShowAddModal(false);
  };

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-3xl font-bold text-gray-900 mb-1">Customers</Text>
            <Text className="text-sm text-gray-500">Manage customers & collections</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => navigation.navigate("QRScanner")}
              className="w-10 h-10 items-center justify-center active:opacity-70"
            >
              <Ionicons name="qr-code-outline" size={24} color="#111827" />
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("Settings")}
              className="w-10 h-10 items-center justify-center active:opacity-70"
            >
              <Ionicons name="settings-outline" size={24} color="#111827" />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View className="bg-white px-6 py-3 border-b border-gray-200">
        <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3">
          <Ionicons name="search" size={20} color="#6B7280" />
          <TextInput
            className="flex-1 ml-2 text-base text-gray-900"
            placeholder="Search by name or email..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Customers List */}
      <FlatList
        data={filteredCustomers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Ionicons name="people-outline" size={64} color="#D1D5DB" />
            <Text className="text-gray-400 text-lg font-medium mt-4">No customers yet</Text>
            <Text className="text-gray-400 text-sm mt-1">Tap + to add your first customer</Text>
          </View>
        }
        renderItem={({ item }) => {
          const customerCollections = getCustomerCollections(item.id);
          const activeCollections = customerCollections.filter((c) => c.status !== "signed").length;
          const completedCollections = customerCollections.filter((c) => c.status === "signed").length;

          return (
            <Pressable
              onPress={() => navigation.navigate("CustomerDetail", { customerId: item.id })}
              className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 active:bg-gray-50"
            >
              <View className="flex-row items-start justify-between mb-3">
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-900">{item.name}</Text>
                  {item.email && (
                    <Text className="text-sm text-gray-600 mt-1">{item.email}</Text>
                  )}
                  {item.phone && (
                    <Text className="text-sm text-gray-600 mt-0.5">{item.phone}</Text>
                  )}
                </View>
                <View className="bg-blue-100 w-12 h-12 rounded-full items-center justify-center">
                  <Text className="text-blue-700 text-lg font-bold">
                    {customerCollections.length}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-4">
                <View className="flex-row items-center">
                  <Ionicons name="time-outline" size={16} color="#F59E0B" />
                  <Text className="text-amber-700 text-xs font-medium ml-1">
                    {activeCollections} active
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                  <Text className="text-green-700 text-xs font-medium ml-1">
                    {completedCollections} completed
                  </Text>
                </View>
              </View>

              {item.address && (
                <View className="mt-3 pt-3 border-t border-gray-100">
                  <Text className="text-xs text-gray-500">{item.address}</Text>
                </View>
              )}
            </Pressable>
          );
        }}
      />

      {/* Floating Add Customer Button */}
      <Pressable
        onPress={() => setShowAddModal(true)}
        className="absolute bottom-8 right-6 bg-blue-600 rounded-full w-16 h-16 items-center justify-center shadow-lg active:bg-blue-700"
        style={{
          shadowColor: "#2563EB",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </Pressable>

      {/* Add Customer Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={() => setShowAddModal(false)}
          />
          <View style={{ flex: 1, justifyContent: "flex-end" }}>
            <View className="bg-white rounded-t-3xl p-6" style={{ maxHeight: "85%", paddingBottom: insets.bottom + 24 }}>
              <View className="flex-row items-center justify-between mb-6">
                <Text className="text-2xl font-bold text-gray-900">New Customer</Text>
                <Pressable onPress={() => setShowAddModal(false)} className="active:opacity-70">
                  <Ionicons name="close" size={28} color="#111827" />
                </Pressable>
              </View>

              <ScrollView
                contentContainerStyle={{ paddingBottom: 16 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View className="gap-4">
                  <View>
                    <Text className="text-sm font-medium text-gray-700 mb-2">Customer Name *</Text>
                    <TextInput
                      className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                      placeholder="Enter customer name"
                      placeholderTextColor="#9CA3AF"
                      value={customerName}
                      onChangeText={setCustomerName}
                      autoFocus
                    />
                  </View>

                  <View>
                    <Text className="text-sm font-medium text-gray-700 mb-2">Phone</Text>
                    <TextInput
                      className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                      placeholder="Enter phone number"
                      placeholderTextColor="#9CA3AF"
                      value={customerPhone}
                      onChangeText={setCustomerPhone}
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View>
                    <Text className="text-sm font-medium text-gray-700 mb-2">Email</Text>
                    <TextInput
                      className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                      placeholder="Enter email address"
                      placeholderTextColor="#9CA3AF"
                      value={customerEmail}
                      onChangeText={setCustomerEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <View>
                    <Text className="text-sm font-medium text-gray-700 mb-2">Address</Text>
                    <TextInput
                      className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                      placeholder="Enter address"
                      placeholderTextColor="#9CA3AF"
                      value={customerAddress}
                      onChangeText={setCustomerAddress}
                      multiline
                      numberOfLines={2}
                      textAlignVertical="top"
                      style={{ minHeight: 80 }}
                    />
                  </View>
                </View>
              </ScrollView>

              <View className="mt-6">
                <Pressable
                  onPress={handleAddCustomer}
                  disabled={!customerName.trim()}
                  className={`rounded-xl py-4 items-center ${
                    customerName.trim() ? "bg-blue-600 active:bg-blue-700" : "bg-gray-300"
                  }`}
                >
                  <Text className="text-white text-base font-semibold">Add Customer</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
