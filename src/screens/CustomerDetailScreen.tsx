import React, { useState, useEffect } from "react";
import { View, Text, FlatList, Pressable, Alert, Modal, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/RootNavigator";
import { getCustomerById, getAllCollections, updateCustomer, deleteCustomer } from "../database/db-collections";
import type { Customer, Collection } from "../types/collection";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "CustomerDetail">;
  route: RouteProp<RootStackParamList, "CustomerDetail">;
};

export default function CustomerDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { customerId } = route.params;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  // Load customer and collections
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [customerData, allCollections] = await Promise.all([
          getCustomerById(customerId),
          getAllCollections(),
        ]);

        setCustomer(customerData);
        if (customerData) {
          const customerCollections = allCollections.filter((c) => c.customerId === customerData.id);
          setCollections(customerCollections);
        }
      } catch (error) {
        console.error("Failed to load customer:", error);
        Alert.alert("Error", "Failed to load customer");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [customerId]);

  const handleEdit = () => {
    if (!customer) return;
    setCustomerName(customer.name || "");
    setCustomerPhone(customer.phone || "");
    setCustomerEmail(customer.email || "");
    setCustomerAddress(customer.address || "");
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!customerName.trim()) return;

    setIsSaving(true);
    try {
      await updateCustomer(customerId, {
        name: customerName.trim(),
        phone: customerPhone.trim(),
        email: customerEmail.trim(),
        address: customerAddress.trim(),
      });

      // Reload customer data
      const updatedCustomer = await getCustomerById(customerId);
      setCustomer(updatedCustomer);
      setShowEditModal(false);
    } catch (error) {
      console.error("Failed to update customer:", error);
      Alert.alert("Error", "Failed to update customer");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (collections.length > 0) {
      Alert.alert(
        "Cannot Delete Customer",
        `This customer has ${collections.length} collection${collections.length > 1 ? "s" : ""}. Please delete all collections first before deleting the customer.`,
        [{ text: "OK" }]
      );
      return;
    }

    Alert.alert(
      "Delete Customer",
      `Are you sure you want to delete ${customer?.name}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCustomer(customerId);
              navigation.navigate("Customers");
            } catch (error) {
              console.error("Failed to delete customer:", error);
              Alert.alert("Error", "Failed to delete customer");
            }
          },
        },
      ]
    );
  };

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "signed":
        return "text-green-600";
      case "completed":
        return "text-blue-600";
      default:
        return "text-amber-600";
    }
  };

  const getStatusIcon = (status: string): keyof typeof Ionicons.glyphMap => {
    switch (status) {
      case "signed":
        return "checkmark-circle";
      case "completed":
        return "cube-outline";
      default:
        return "time-outline";
    }
  };

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center flex-1">
            <Pressable onPress={() => navigation.goBack()} className="mr-4 active:opacity-70">
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900">{customer.name}</Text>
              <Text className="text-sm text-gray-500">{customer.id}</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={handleEdit}
              className="w-10 h-10 items-center justify-center active:opacity-70"
            >
              <Ionicons name="create-outline" size={24} color="#2563EB" />
            </Pressable>
            <Pressable
              onPress={handleDelete}
              className="w-10 h-10 items-center justify-center active:opacity-70"
            >
              <Ionicons name="trash-outline" size={24} color="#DC2626" />
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("Customers")}
              className="w-10 h-10 items-center justify-center active:opacity-70"
            >
              <Ionicons name="home-outline" size={24} color="#2563EB" />
            </Pressable>
          </View>
        </View>

        {/* Customer Info Card */}
        <View className="bg-blue-50 rounded-xl p-4">
          {customer.email && (
            <View className="flex-row items-center mb-2">
              <Ionicons name="mail-outline" size={16} color="#2563EB" />
              <Text className="text-blue-900 text-sm ml-2">{customer.email}</Text>
            </View>
          )}
          {customer.phone && (
            <View className="flex-row items-center mb-2">
              <Ionicons name="call-outline" size={16} color="#2563EB" />
              <Text className="text-blue-900 text-sm ml-2">{customer.phone}</Text>
            </View>
          )}
          {customer.address && (
            <View className="flex-row items-start">
              <Ionicons name="location-outline" size={16} color="#2563EB" />
              <Text className="text-blue-900 text-sm ml-2 flex-1">{customer.address}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Collections Header */}
      <View className="bg-white px-6 py-3 border-b border-gray-200">
        <Text className="text-lg font-semibold text-gray-900">
          Collections ({collections.length})
        </Text>
      </View>

      {/* Collections List */}
      <FlatList
        data={collections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Ionicons name="cube-outline" size={64} color="#D1D5DB" />
            <Text className="text-gray-400 text-lg font-medium mt-4">No collections yet</Text>
            <Text className="text-gray-400 text-sm mt-1">Tap + to create a new collection</Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusIcon = getStatusIcon(item.status);
          const iconColor = getStatusColor(item.status).includes("green") ? "#16A34A" : getStatusColor(item.status).includes("blue") ? "#2563EB" : "#D97706";

          return (
            <Pressable
              onPress={() => navigation.navigate("CollectionDetail", { collectionId: item.id })}
              className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 active:bg-gray-50"
            >
              <View className="flex-row items-start justify-between mb-3">
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900">{item.id}</Text>
                  <Text className="text-sm text-gray-600 mt-1">{item.pickupAddress}</Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name={statusIcon} size={18} color={iconColor} />
                  <Text className={`text-sm font-medium ml-1 ${getStatusColor(item.status)}`}>
                    {item.status === "in_progress" ? "In Progress" : item.status === "completed" ? "Completed" : "Signed"}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-gray-400">
                  {new Date(item.collectionDate).toLocaleDateString()}
                </Text>
                <View className="flex-row items-center gap-3">
                  <View className="flex-row items-center">
                    <Ionicons name="cube-outline" size={14} color="#6B7280" />
                    <Text className="text-xs text-gray-600 ml-1">{item.items.length} items</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="camera-outline" size={14} color="#6B7280" />
                    <Text className="text-xs text-gray-600 ml-1">
                      {item.items.reduce((sum, i) => sum + i.photos.length, 0)} photos
                    </Text>
                  </View>
                </View>
              </View>

              {item.employeeName && (
                <View className="mt-3 pt-3 border-t border-gray-100">
                  <Text className="text-xs text-gray-500">Collector: {item.employeeName}</Text>
                </View>
              )}
            </Pressable>
          );
        }}
      />

      {/* Floating Add Collection Button */}
      <Pressable
        onPress={() => navigation.navigate("NewCollection", { customerId })}
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

      {/* Edit Customer Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 bg-white"
          style={{ paddingTop: insets.top }}
        >
          {/* Header */}
          <View className="bg-white px-6 py-4 border-b border-gray-200">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <Pressable
                  onPress={() => setShowEditModal(false)}
                  className="mr-4 active:opacity-70"
                >
                  <Ionicons name="close" size={28} color="#111827" />
                </Pressable>
                <Text className="text-2xl font-bold text-gray-900">Edit Customer</Text>
              </View>
            </View>
          </View>

          {/* Scrollable Content */}
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 24 }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="gap-5">
              <View>
                <Text className="text-base font-semibold text-gray-900 mb-2">Customer Name *</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900"
                  placeholder="Enter customer name"
                  placeholderTextColor="#9CA3AF"
                  value={customerName}
                  onChangeText={setCustomerName}
                  autoFocus
                />
              </View>

              <View>
                <Text className="text-base font-semibold text-gray-900 mb-2">Phone</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900"
                  placeholder="Enter phone number"
                  placeholderTextColor="#9CA3AF"
                  value={customerPhone}
                  onChangeText={setCustomerPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <View>
                <Text className="text-base font-semibold text-gray-900 mb-2">Email</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900"
                  placeholder="Enter email address"
                  placeholderTextColor="#9CA3AF"
                  value={customerEmail}
                  onChangeText={setCustomerEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View>
                <Text className="text-base font-semibold text-gray-900 mb-2">Address</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900"
                  placeholder="Enter address"
                  placeholderTextColor="#9CA3AF"
                  value={customerAddress}
                  onChangeText={setCustomerAddress}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={{ minHeight: 100 }}
                />
              </View>
            </View>
          </ScrollView>

          {/* Fixed Footer */}
          <View
            className="px-6 py-4 border-t border-gray-200 bg-white"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <Pressable
              onPress={handleSaveEdit}
              disabled={!customerName.trim() || isSaving}
              className={`rounded-xl py-4 items-center ${
                customerName.trim() && !isSaving ? "bg-blue-600 active:bg-blue-700" : "bg-gray-300"
              }`}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white text-lg font-semibold">Save Changes</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
