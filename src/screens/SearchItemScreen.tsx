// Search Item screen with status filter
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { HomeStackParamList } from "../navigation/HomeNavigator";
import { searchItems, type InventoryItem, type ItemStatus } from "../database/db-enhanced";

type Props = NativeStackScreenProps<HomeStackParamList, "SearchItem">;

const STATUS_OPTIONS: (ItemStatus | "All")[] = [
  "All",
  "Collected",
  "In transit",
  "In storage",
  "Packed",
  "Shipped",
  "Delivered",
  "Cancelled",
];

export default function SearchItemScreen({ navigation }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<ItemStatus | "All">("All");
  const [results, setResults] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    setHasSearched(true);
    try {
      const items = await searchItems(
        searchTerm.trim(),
        selectedStatus === "All" ? undefined : selectedStatus
      );
      setResults(items);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: ItemStatus) => {
    switch (status) {
      case "In storage":
        return "bg-green-100 text-green-800";
      case "In transit":
        return "bg-blue-100 text-blue-800";
      case "Packed":
        return "bg-purple-100 text-purple-800";
      case "Shipped":
        return "bg-indigo-100 text-indigo-800";
      case "Delivered":
        return "bg-gray-100 text-gray-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-6 py-4 border-b border-gray-200">
        <View className="flex-row items-center mb-4">
          <Pressable onPress={() => navigation.goBack()} className="mr-4 p-2 -ml-2">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
          <Text className="text-2xl font-bold text-gray-900">Search Items</Text>
        </View>

        {/* Search Input */}
        <View className="flex-row items-center bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-3">
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search by ID, description, or customer"
            placeholderTextColor="#9CA3AF"
            className="flex-1 ml-2 text-base text-gray-900"
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>

        {/* Status Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-2">
          {STATUS_OPTIONS.map((status) => (
            <Pressable
              key={status}
              onPress={() => setSelectedStatus(status)}
              className={`px-4 py-2 rounded-full ${
                selectedStatus === status ? "bg-blue-600" : "bg-gray-100"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  selectedStatus === status ? "text-white" : "text-gray-700"
                }`}
              >
                {status}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Results */}
      <ScrollView className="flex-1 px-6 py-4">
        {isLoading ? (
          <View className="py-12">
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : !hasSearched ? (
          <View className="py-12">
            <Ionicons name="search-outline" size={64} color="#D1D5DB" style={{ alignSelf: "center" }} />
            <Text className="text-center text-gray-500 mt-4">
              Enter a search term to find items
            </Text>
          </View>
        ) : results.length === 0 ? (
          <View className="py-12">
            <Ionicons name="file-tray-outline" size={64} color="#D1D5DB" style={{ alignSelf: "center" }} />
            <Text className="text-center text-gray-500 mt-4">No items found</Text>
          </View>
        ) : (
          <View className="space-y-3">
            {results.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => navigation.navigate("InventoryItemDetail", { itemId: item.id })}
                className="bg-gray-50 rounded-xl p-4 border border-gray-200 active:bg-gray-100"
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-base font-bold text-gray-900">
                    {item.inventory_number}
                  </Text>
                  <View className={`px-3 py-1 rounded-full ${getStatusColor(item.status)}`}>
                    <Text className="text-xs font-medium">{item.status}</Text>
                  </View>
                </View>

                {item.description && (
                  <Text className="text-sm text-gray-600 mb-1" numberOfLines={2}>
                    {item.description}
                  </Text>
                )}

                {item.customer_name && (
                  <View className="flex-row items-center mb-1">
                    <Ionicons name="person-outline" size={14} color="#6B7280" />
                    <Text className="text-sm text-gray-600 ml-1">{item.customer_name}</Text>
                  </View>
                )}

                <View className="flex-row items-center">
                  <Ionicons name="location-outline" size={14} color="#6B7280" />
                  <Text className="text-sm text-gray-600 ml-1" numberOfLines={1}>
                    {item.current_location_path || "Unknown"}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Search Button */}
      <View className="px-6 py-4 border-t border-gray-200">
        <Pressable
          onPress={handleSearch}
          disabled={!searchTerm.trim() || isLoading}
          className={`rounded-xl py-4 ${
            searchTerm.trim() ? "bg-blue-600 active:bg-blue-700" : "bg-gray-300"
          }`}
        >
          <Text className="text-white text-center font-semibold">Search</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
