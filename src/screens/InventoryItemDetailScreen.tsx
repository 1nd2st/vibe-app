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
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { HomeStackParamList } from "../navigation/HomeNavigator";
import {
  getItemById,
  getItemHistory,
  getItemPhotos,
  addItemNote,
  updateItemStatus,
  updateItemLocation,
  deleteItemPhoto,
  type InventoryItem,
  type ItemHistory,
  type ItemPhoto,
  type ItemStatus,
} from "../database/db-enhanced";
import { useAuthStore } from "../state/authStore";
import LocationPicker from "../components/LocationPicker";
import { format } from "date-fns";
import {
  generateInventoryItemLabel,
  type LabelSize,
  type InventoryItemLabelData,
} from "../utils/zpl-generator";

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
  const [photos, setPhotos] = useState<ItemPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showPhotosModal, setShowPhotosModal] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [noteText, setNoteText] = useState("");
  const [labelSize, setLabelSize] = useState<LabelSize>("4x4");
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    loadItem();
  }, [itemId]);

  const loadItem = async () => {
    setIsLoading(true);
    try {
      const [itemData, historyData, photosData] = await Promise.all([
        getItemById(itemId),
        getItemHistory(itemId),
        getItemPhotos(itemId),
      ]);

      if (itemData) {
        setItem(itemData);
        setNoteText(itemData.notes || "");
      }
      setHistory(historyData);
      setPhotos(photosData);
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

  const handleDeletePhoto = async () => {
    if (!user || photos.length === 0) return;

    const currentPhoto = photos[selectedPhotoIndex];

    Alert.alert(
      "Delete Photo",
      "Are you sure you want to delete this photo?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteItemPhoto(currentPhoto.uuid, user.id);
              await loadItem();
              setShowPhotosModal(false);
              Alert.alert("Success", "Photo deleted successfully");
            } catch (error) {
              console.error("Failed to delete photo:", error);
              Alert.alert("Error", "Failed to delete photo");
            }
          },
        },
      ]
    );
  };

  const handlePrintLabel = async () => {
    if (!item) return;

    setIsPrinting(true);
    try {
      // Prepare label data
      const labelData: InventoryItemLabelData = {
        inventoryNumber: item.inventory_number,
        description: item.description || undefined,
        customerName: item.customer_name || undefined,
        currentLocation: item.current_location_path || undefined,
      };

      // Generate ZPL
      const zpl = generateInventoryItemLabel(labelData, labelSize);

      // For now, show preview/success (printer integration coming soon)
      Alert.alert(
        "Label Generated",
        `✓ Generated label for ${item.inventory_number}\n\n` +
        `Size: ${labelSize}\n` +
        `ZPL code generated successfully.\n\n` +
        `To print:\n` +
        `1. Configure printer in Settings\n` +
        `2. ZPL will be sent to printer automatically\n\n` +
        `(Printer integration coming soon)`,
        [
          {
            text: "Copy ZPL",
            onPress: () => {
              console.log("ZPL Code:\n", zpl);
              Alert.alert("Success", "ZPL copied to logs. Check console for ZPL code.");
            },
          },
          { text: "Done", style: "default" },
        ]
      );

      setShowPrintModal(false);
    } catch (error: any) {
      console.error("Failed to generate label:", error);
      Alert.alert("Error", error.message || "Failed to generate label");
    } finally {
      setIsPrinting(false);
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
        <View className="mb-4">
          {/* First Row - 3 buttons */}
          <View className="flex-row space-x-3 mb-3">
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
            <Pressable
              onPress={() => setShowPrintModal(true)}
              className="flex-1 bg-orange-100 rounded-xl p-4 items-center active:bg-orange-200"
            >
              <Ionicons name="print" size={24} color="#EA580C" />
              <Text className="text-sm font-semibold text-orange-900 mt-1">Print Label</Text>
            </Pressable>
          </View>

          {/* Second Row - Pictures Button (Full Width, Always Visible) */}
          <Pressable
            onPress={() => {
              setSelectedPhotoIndex(0);
              setShowPhotosModal(true);
            }}
            className="bg-green-100 rounded-xl p-4 items-center active:bg-green-200"
          >
            <View className="flex-row items-center">
              <Ionicons name="images" size={24} color="#16A34A" />
              <Text className="text-sm font-semibold text-green-900 ml-2">
                Item Pictures ({photos.length})
              </Text>
            </View>
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

      {/* Print Label Modal */}
      <Modal visible={showPrintModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white">
          <View className="px-6 py-4 border-b border-gray-200">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-bold text-gray-900">Print Label</Text>
              <Pressable onPress={() => setShowPrintModal(false)}>
                <Ionicons name="close" size={28} color="#374151" />
              </Pressable>
            </View>
          </View>

          <View className="flex-1 px-6 py-6">
            {/* Label Size Selection */}
            <View className="mb-6">
              <Text className="text-base font-semibold text-gray-900 mb-3">Label Size</Text>
              <View className="flex-row space-x-3">
                <Pressable
                  onPress={() => setLabelSize("4x4")}
                  className={`flex-1 py-3 rounded-xl border-2 ${labelSize === "4x4" ? "bg-blue-50 border-blue-500" : "bg-gray-50 border-gray-200"}`}
                >
                  <Text className={`text-center font-semibold ${labelSize === "4x4" ? "text-blue-900" : "text-gray-700"}`}>
                    4&quot; x 4&quot;
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setLabelSize("4x6")}
                  className={`flex-1 py-3 rounded-xl border-2 ${labelSize === "4x6" ? "bg-blue-50 border-blue-500" : "bg-gray-50 border-gray-200"}`}
                >
                  <Text className={`text-center font-semibold ${labelSize === "4x6" ? "text-blue-900" : "text-gray-700"}`}>
                    4&quot; x 6&quot;
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Label Preview Info */}
            <View className="bg-gray-50 rounded-xl p-4 mb-4">
              <Text className="text-sm font-semibold text-gray-900 mb-2">Label will include:</Text>
              <View className="space-y-2">
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                  <Text className="text-sm text-gray-700 ml-2">Large QR code for scanning</Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                  <Text className="text-sm text-gray-700 ml-2">Inventory number (large text)</Text>
                </View>
                {item?.description && (
                  <View className="flex-row items-center">
                    <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                    <Text className="text-sm text-gray-700 ml-2">Item description</Text>
                  </View>
                )}
                {item?.customer_name && (
                  <View className="flex-row items-center">
                    <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                    <Text className="text-sm text-gray-700 ml-2">Customer name</Text>
                  </View>
                )}
                {item?.current_location_path && (
                  <View className="flex-row items-center">
                    <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                    <Text className="text-sm text-gray-700 ml-2">Current location</Text>
                  </View>
                )}
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                  <Text className="text-sm text-gray-700 ml-2">Barcode (Code 128)</Text>
                </View>
              </View>
            </View>

            {/* Info Notice */}
            <View className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <View className="flex-row">
                <Ionicons name="information-circle" size={20} color="#2563EB" />
                <View className="flex-1 ml-3">
                  <Text className="text-sm text-blue-900">
                    Labels are generated in ZPL format for Zebra printers. Configure your printer in Settings to enable automatic printing.
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View className="px-6 py-4 border-t border-gray-200">
            <Pressable
              onPress={handlePrintLabel}
              disabled={isPrinting}
              className={`rounded-xl py-4 ${isPrinting ? "bg-gray-400" : "bg-blue-600 active:bg-blue-700"}`}
            >
              {isPrinting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center font-semibold">Generate Label</Text>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Photos Modal */}
      <Modal visible={showPhotosModal} animationType="fade" transparent={false}>
        <SafeAreaView className="flex-1 bg-black">
          <StatusBar style="light" />

          {/* Header */}
          <View className="px-6 py-4 flex-row items-center justify-between">
            <Pressable onPress={() => setShowPhotosModal(false)}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </Pressable>
            <Text className="text-lg font-semibold text-white">
              {photos.length > 0 ? `${selectedPhotoIndex + 1} / ${photos.length}` : "No Photos"}
            </Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Photo Viewer or Empty State */}
          {photos.length > 0 ? (
            <>
              {/* Photo Viewer with Swipe */}
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) => {
                  const newIndex = Math.round(
                    event.nativeEvent.contentOffset.x / Dimensions.get("window").width
                  );
                  setSelectedPhotoIndex(newIndex);
                }}
                scrollEventThrottle={16}
              >
                {photos.map((photo, index) => (
                  <View
                    key={photo.id}
                    style={{ width: Dimensions.get("window").width }}
                    className="flex-1 items-center justify-center"
                  >
                    <Image
                      source={{ uri: photo.annotated_uri || photo.uri }}
                      style={{
                        width: Dimensions.get("window").width,
                        height: Dimensions.get("window").height * 0.6,
                      }}
                      resizeMode="contain"
                    />

                    {/* Photo Info */}
                    <View className="px-6 py-4 w-full">
                      {photo.condition_notes && (
                        <View className="bg-gray-900 rounded-xl p-4 mb-3">
                          <Text className="text-xs text-gray-400 mb-1">NOTES</Text>
                          <Text className="text-sm text-white">{photo.condition_notes}</Text>
                        </View>
                      )}

                      {photo.ai_analyzed && photo.ai_detected_damage && (
                        <View className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-3">
                          <View className="flex-row items-center mb-2">
                            <Ionicons name="warning" size={16} color="#EF4444" />
                            <Text className="text-xs font-semibold text-red-400 ml-2">
                              AI DETECTED DAMAGE
                            </Text>
                          </View>
                          <Text className="text-sm text-red-200">{photo.ai_detected_damage}</Text>
                        </View>
                      )}

                      <Text className="text-xs text-gray-400 text-center mt-2">
                        {format(new Date(photo.timestamp), "MMM d, yyyy h:mm a")}
                      </Text>

                      {/* Delete Button */}
                      <Pressable
                        onPress={handleDeletePhoto}
                        className="bg-red-600 rounded-xl py-3 mt-4 items-center active:bg-red-700"
                      >
                        <View className="flex-row items-center">
                          <Ionicons name="trash" size={18} color="#FFFFFF" />
                          <Text className="text-white font-semibold ml-2">Delete Photo</Text>
                        </View>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </ScrollView>

              {/* Thumbnail Navigation */}
              {photos.length > 1 && (
                <View className="px-6 py-4 border-t border-gray-800">
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {photos.map((photo, index) => (
                      <Pressable
                        key={photo.id}
                        onPress={() => setSelectedPhotoIndex(index)}
                        className={`mr-2 rounded-lg overflow-hidden border-2 ${
                          index === selectedPhotoIndex ? "border-blue-500" : "border-transparent"
                        }`}
                      >
                        <Image
                          source={{ uri: photo.annotated_uri || photo.uri }}
                          style={{ width: 60, height: 60 }}
                          resizeMode="cover"
                        />
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </>
          ) : (
            // Empty State
            <View className="flex-1 items-center justify-center px-6">
              <Ionicons name="images-outline" size={80} color="#4B5563" />
              <Text className="text-gray-400 text-xl font-semibold mt-4 text-center">
                No Photos Yet
              </Text>
              <Text className="text-gray-500 text-center mt-2 mb-6">
                Photos were not taken during collection
              </Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
