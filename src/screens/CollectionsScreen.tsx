import React, { useState } from "react";
import { View, Text, FlatList, Pressable, TextInput } from "react-native";
import { useCollectionStore } from "../state/collectionStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Collections">;
};

export default function CollectionsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const collections = useCollectionStore((s) => s.collections);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "in_progress" | "completed" | "signed">("all");

  const filteredCollections = collections.filter((col) => {
    const matchesSearch =
      col.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      col.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || col.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-3xl font-bold text-gray-900 mb-1">Collections</Text>
            <Text className="text-sm text-gray-500">Art logistics & condition reports</Text>
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
        <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 mb-3">
          <Ionicons name="search" size={20} color="#6B7280" />
          <TextInput
            className="flex-1 ml-2 text-base text-gray-900"
            placeholder="Search by customer or ID..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Status Filter */}
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => setStatusFilter("all")}
            className={`flex-1 rounded-lg py-2 items-center ${
              statusFilter === "all" ? "bg-blue-600" : "bg-gray-100"
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                statusFilter === "all" ? "text-white" : "text-gray-700"
              }`}
            >
              All
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setStatusFilter("in_progress")}
            className={`flex-1 rounded-lg py-2 items-center ${
              statusFilter === "in_progress" ? "bg-amber-600" : "bg-gray-100"
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                statusFilter === "in_progress" ? "text-white" : "text-gray-700"
              }`}
            >
              In Progress
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setStatusFilter("completed")}
            className={`flex-1 rounded-lg py-2 items-center ${
              statusFilter === "completed" ? "bg-blue-600" : "bg-gray-100"
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                statusFilter === "completed" ? "text-white" : "text-gray-700"
              }`}
            >
              Completed
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setStatusFilter("signed")}
            className={`flex-1 rounded-lg py-2 items-center ${
              statusFilter === "signed" ? "bg-green-600" : "bg-gray-100"
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                statusFilter === "signed" ? "text-white" : "text-gray-700"
              }`}
            >
              Signed
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Collections List */}
      <FlatList
        data={filteredCollections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Ionicons name="cube-outline" size={64} color="#D1D5DB" />
            <Text className="text-gray-400 text-lg font-medium mt-4">No collections yet</Text>
            <Text className="text-gray-400 text-sm mt-1">Tap + to create your first collection</Text>
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
                  <Text className="text-lg font-semibold text-gray-900">{item.customerName}</Text>
                  <Text className="text-sm text-gray-500 mt-0.5">{item.id}</Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name={statusIcon} size={18} color={iconColor} />
                  <Text className={`text-sm font-medium ml-1 ${getStatusColor(item.status)}`}>
                    {item.status === "in_progress" ? "In Progress" : item.status === "completed" ? "Completed" : "Signed"}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-sm text-gray-600">{item.pickupAddress}</Text>
                  <Text className="text-xs text-gray-400 mt-1">
                    {new Date(item.collectionDate).toLocaleDateString()} • {item.items.length} items
                  </Text>
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

      {/* Floating Action Button */}
      <Pressable
        onPress={() => navigation.navigate("NewCollection", {})}
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
