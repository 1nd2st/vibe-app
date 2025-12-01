import React from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { useCollectionStore } from "../state/collectionStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/RootNavigator";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "CustomerDetail">;
  route: RouteProp<RootStackParamList, "CustomerDetail">;
};

export default function CustomerDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { customerId } = route.params;

  const customers = useCollectionStore((s) => s.customers);
  const allCollections = useCollectionStore((s) => s.collections);
  const customer = customers.find((c) => c.id === customerId);
  const collections = allCollections.filter((c) => c.customerId === customerId);

  if (!customer) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
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
        <View className="flex-row items-center mb-3">
          <Pressable onPress={() => navigation.goBack()} className="mr-4 active:opacity-70">
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900">{customer.name}</Text>
            <Text className="text-sm text-gray-500">{customer.id}</Text>
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
    </View>
  );
}
