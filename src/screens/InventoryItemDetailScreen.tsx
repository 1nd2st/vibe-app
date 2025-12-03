// Inventory Item Detail screen with history and notes
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { HomeStackParamList } from "../navigation/HomeNavigator";
import {
  getItemById,
  getItemHistory,
  addItemNote,
  updateItemStatus,
  updateItemLocation,
  type InventoryItem,
  type ItemHistory,
  type ItemStatus,
} from "../database/db-enhanced";
import { useAuthStore } from "../state/authStore";
import LocationPicker from "../components/LocationPicker";
import { format } from "date-fns";

type Props = NativeStackScreenProps<HomeStackParamList, "InventoryItemDetail">;

const STATUS_OPTIONS: ItemStatus[] = [
  "Collected",
  "In transit",
  "In storage",
  "Packed",
  "Shipped",
  "Delivered",
  "Cancelled",
];

export default function InventoryItemDetailScreen({ route, navigation }: Props) {
  const { itemId } = route.params;
  const { user } = useAuthStore();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [history, setHistory] = useState<ItemHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    loadItem();
  }, [itemId]);

  const loadItem = async () => {
    setIsLoading(true);
    try {
      const [itemData, historyData] = await Promise.all([
        getItemById(itemId),
        getItemHistory(itemId),
      ]);

      if (itemData) {
        setItem(itemData);
        setNoteText(itemData.notes || "");
      }
      setHistory(historyData);
    } catch (error) {
      console.error("Failed to load item:", error);
      Alert.alert("Error", "Failed to load item");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!user) return;

    try {
      await addItemNote(itemId, noteText, user.id);
      setShowNoteModal(false);
      Alert.alert("Success", "Note saved");
      loadItem();
    } catch (error) {
      console.error("Failed to save note:", error);
      Alert.alert("Error", "Failed to save note");
    }
  };

  const handleStatusChange = async (newStatus: ItemStatus) => {
    if (!user) return;

    try {
      await updateItemStatus(itemId, newStatus, user.id);
      setShowStatusModal(false);
      Alert.alert("Success", "Status updated");
      loadItem();
    } catch (error) {
      console.error("Failed to update status:", error);
      Alert.alert("Error", "Failed to update status");
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

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "COLLECTED":
        return "add-circle-outline";
      case "MOVED":
        return "swap-horizontal-outline";
      case "STATUS_CHANGE":
        return "refresh-outline";
      case "NOTE":
        return "document-text-outline";
      default:
        return "ellipse-outline";
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!item) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-xl font-bold text-gray-900 mb-2">Item Not Found</Text>
          <Pressable onPress={() => navigation.goBack()} className="bg-blue-600 rounded-xl px-6 py-3 mt-4">
            <Text className="text-white font-semibold">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-6 py-4 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => navigation.goBack()} className="p-2 -ml-2">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
          <Text className="text-xl font-bold text-gray-900">Item Detail</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-4">
        {/* Item Info Card */}
        <View className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
          <View>
            <Text className="text-sm text-gray-600">Inventory Number</Text>
            <Text className="text-xl font-bold text-gray-900">{item.inventory_number}</Text>
          </View>

          {item.description && (
            <View>
              <Text className="text-sm text-gray-600">Description</Text>
              <Text className="text-base text-gray-900">{item.description}</Text>
            </View>
          )}

          {item.customer_name && (
            <View>
              <Text className="text-sm text-gray-600">Customer</Text>
              <Text className="text-base text-gray-900">{item.customer_name}</Text>
            </View>
          )}

          <View>
            <Text className="text-sm text-gray-600 mb-1">Status</Text>
            <Pressable
              onPress={() => setShowStatusModal(true)}
              className="flex-row items-center"
            >
              <View className={`px-3 py-1 rounded-full ${getStatusColor(item.status)}`}>
                <Text className="text-sm font-medium">{item.status}</Text>
              </View>
              <Ionicons name="chevron-down" size={20} color="#9CA3AF" style={{ marginLeft: 8 }} />
            </Pressable>
          </View>

          <View>
            <Text className="text-sm text-gray-600">Current Location</Text>
            <Text className="text-base font-medium text-gray-900">
              {item.current_location_path || "Unknown"}
            </Text>
          </View>

          {item.notes && (
            <View>
              <Text className="text-sm text-gray-600">Notes</Text>
              <Text className="text-base text-gray-900">{item.notes}</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View className="flex-row space-x-3 mb-4">
          <Pressable
            onPress={() => setShowLocationPicker(true)}
            className="flex-1 bg-blue-100 rounded-xl p-4 items-center active:bg-blue-200"
          >
            <Ionicons name="location" size={24} color="#2563EB" />
            <Text className="text-sm font-semibold text-blue-900 mt-1">Move Item</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowNoteModal(true)}
            className="flex-1 bg-purple-100 rounded-xl p-4 items-center active:bg-purple-200"
          >
            <Ionicons name="create" size={24} color="#9333EA" />
            <Text className="text-sm font-semibold text-purple-900 mt-1">Add Note</Text>
          </Pressable>
        </View>

        {/* History Section */}
        <View className="mb-4">
          <Text className="text-lg font-bold text-gray-900 mb-3">History</Text>
          {history.length === 0 ? (
            <Text className="text-center text-gray-500 py-4">No history available</Text>
          ) : (
            <View className="space-y-2">
              {history.map((entry) => (
                <View key={entry.id} className="bg-gray-50 rounded-xl p-4">
                  <View className="flex-row items-start">
                    <Ionicons
                      name={getActionIcon(entry.action_type) as any}
                      size={20}
                      color="#6B7280"
                      style={{ marginTop: 2 }}
                    />
                    <View className="flex-1 ml-3">
                      <Text className="text-sm font-semibold text-gray-900">
                        {entry.action_type.replace("_", " ")}
                      </Text>
                      <Text className="text-xs text-gray-600 mt-1">
                        {format(new Date(entry.timestamp), "MMM d, yyyy h:mm a")}
                      </Text>
                      {entry.user_name && (
                        <Text className="text-xs text-gray-600">By: {entry.user_name}</Text>
                      )}
                      {entry.from_location_path && entry.to_location_path && (
                        <Text className="text-xs text-gray-700 mt-1">
                          {entry.from_location_path} → {entry.to_location_path}
                        </Text>
                      )}
                      {entry.from_status && entry.to_status && (
                        <Text className="text-xs text-gray-700 mt-1">
                          {entry.from_status} → {entry.to_status}
                        </Text>
                      )}
                      {entry.notes && (
                        <Text className="text-xs text-gray-700 mt-1">{entry.notes}</Text>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Location Picker */}
      <LocationPicker
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onSelectLocation={async (locationId, fullPath) => {
          if (!user) return;
          try {
            await updateItemLocation(itemId, locationId, "In storage", user.id);
            Alert.alert("Success", `Item moved to ${fullPath}`);
            loadItem();
          } catch (error) {
            Alert.alert("Error", "Failed to move item");
          }
        }}
      />

      {/* Note Modal */}
      <Modal visible={showNoteModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white">
          <View className="px-6 py-4 border-b border-gray-200">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-bold text-gray-900">Add Note</Text>
              <Pressable onPress={() => setShowNoteModal(false)}>
                <Ionicons name="close" size={28} color="#374151" />
              </Pressable>
            </View>
          </View>

          <View className="flex-1 px-6 py-4">
            <TextInput
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Enter notes about this item..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={10}
              textAlignVertical="top"
              className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 h-48"
            />
          </View>

          <View className="px-6 py-4 border-t border-gray-200">
            <Pressable onPress={handleSaveNote} className="bg-blue-600 rounded-xl py-4">
              <Text className="text-white text-center font-semibold">Save Note</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Status Modal */}
      <Modal visible={showStatusModal} animationType="fade" transparent>
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <Text className="text-xl font-bold text-gray-900 mb-4">Change Status</Text>
            <ScrollView className="max-h-80">
              {STATUS_OPTIONS.map((status) => (
                <Pressable
                  key={status}
                  onPress={() => handleStatusChange(status)}
                  className="py-3 border-b border-gray-200"
                >
                  <Text className="text-base text-gray-900">{status}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => setShowStatusModal(false)}
              className="bg-gray-100 rounded-xl py-3 mt-4"
            >
              <Text className="text-gray-900 text-center font-semibold">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
