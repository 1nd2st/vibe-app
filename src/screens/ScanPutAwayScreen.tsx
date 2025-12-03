// Scan & Put Away screen - main workflow for inventory
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { HomeStackParamList } from "../navigation/HomeNavigator";
import {
  getItemByInventoryNumber,
  createItem,
  updateItemLocation,
  getTransitLocation,
  type InventoryItem,
} from "../database/db-enhanced";
import { useAuthStore } from "../state/authStore";
import LocationPicker from "../components/LocationPicker";

type Props = NativeStackScreenProps<HomeStackParamList, "ScanPutAway">;

type Step = "scan" | "item-detail" | "create-item";

export default function ScanPutAwayScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<Step>("scan");
  const [scannedCode, setScannedCode] = useState("");
  const [manualEntry, setManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [currentItem, setCurrentItem] = useState<InventoryItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchLocation, setBatchLocation] = useState<{
    id: number;
    path: string;
  } | null>(null);
  const [batchCount, setBatchCount] = useState(0);

  // New item form
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemCustomer, setNewItemCustomer] = useState("");

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scannedCode === data) return; // Prevent duplicate scans
    setScannedCode(data);
    await processInventoryNumber(data);
  };

  const handleManualEntry = async () => {
    if (!manualCode.trim()) {
      Alert.alert("Error", "Please enter an inventory number");
      return;
    }
    await processInventoryNumber(manualCode.trim());
  };

  const processInventoryNumber = async (inventoryNumber: string) => {
    setIsLoading(true);
    try {
      const item = await getItemByInventoryNumber(inventoryNumber);

      if (item) {
        // Item exists - show detail
        setCurrentItem(item);
        setStep("item-detail");

        // If batch mode is active, move item automatically
        if (batchMode && batchLocation) {
          await moveItemToBatchLocation(item);
        }
      } else {
        // Item doesn't exist - show create form
        setScannedCode(inventoryNumber);
        setStep("create-item");
      }
    } catch (error) {
      console.error("Error processing inventory number:", error);
      Alert.alert("Error", "Failed to process inventory number");
    } finally {
      setIsLoading(false);
    }
  };

  const moveItemToBatchLocation = async (item: InventoryItem) => {
    if (!batchLocation || !user) return;

    try {
      await updateItemLocation(
        item.id,
        batchLocation.id,
        "In storage",
        user.id
      );

      setBatchCount(batchCount + 1);
      Alert.alert(
        "Success",
        `Item moved to ${batchLocation.path}\n\nBatch count: ${batchCount + 1}`,
        [{ text: "OK", onPress: () => resetScan() }]
      );
    } catch (error) {
      console.error("Error moving item:", error);
      Alert.alert("Error", "Failed to move item");
    }
  };

  const handleCreateItem = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in");
      return;
    }

    setIsLoading(true);
    try {
      // Get transit location
      const transitLocation = await getTransitLocation();
      if (!transitLocation) {
        Alert.alert("Error", "Transit location not found. Please contact admin.");
        return;
      }

      // Create new item in transit
      const itemId = await createItem(
        {
          inventory_number: scannedCode,
          description: newItemDescription || undefined,
          customer_name: newItemCustomer || undefined,
          status: "Collected",
          location_id: transitLocation.id,
        },
        user.id
      );

      // Load the newly created item
      const newItem = await getItemByInventoryNumber(scannedCode);
      if (newItem) {
        setCurrentItem(newItem);
        setStep("item-detail");
        setNewItemDescription("");
        setNewItemCustomer("");
      }
    } catch (error) {
      console.error("Error creating item:", error);
      Alert.alert("Error", "Failed to create item");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectLocation = async (locationId: number, fullPath: string) => {
    if (!currentItem || !user) return;

    setIsLoading(true);
    try {
      await updateItemLocation(
        currentItem.id,
        locationId,
        "In storage",
        user.id
      );

      Alert.alert("Success", `Item moved to ${fullPath}`, [
        { text: "OK", onPress: () => resetScan() },
      ]);
    } catch (error) {
      console.error("Error moving item:", error);
      Alert.alert("Error", "Failed to move item");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchModeToggle = () => {
    if (batchMode) {
      // Turn off batch mode
      setBatchMode(false);
      setBatchLocation(null);
      setBatchCount(0);
    } else {
      // Turn on batch mode - prompt for location
      setShowLocationPicker(true);
    }
  };

  const handleBatchLocationSelect = (locationId: number, fullPath: string) => {
    setBatchLocation({ id: locationId, path: fullPath });
    setBatchMode(true);
    setBatchCount(0);
  };

  const resetScan = () => {
    setStep("scan");
    setScannedCode("");
    setManualCode("");
    setCurrentItem(null);
    setManualEntry(false);
  };

  if (!permission) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="camera-outline" size={64} color="#9CA3AF" />
          <Text className="text-xl font-bold text-gray-900 mt-4 mb-2">
            Camera Permission Required
          </Text>
          <Text className="text-center text-gray-600 mb-6">
            We need camera access to scan barcodes
          </Text>
          <Pressable
            onPress={requestPermission}
            className="bg-blue-600 rounded-xl px-6 py-3"
          >
            <Text className="text-white font-semibold">Grant Permission</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Render based on step
  if (step === "scan") {
    return (
      <View className="flex-1 bg-black">
        <StatusBar style="light" />
        {!manualEntry ? (
          <CameraView
            style={{ flex: 1 }}
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: [
                "qr",
                "ean13",
                "ean8",
                "code128",
                "code39",
                "code93",
                "codabar",
                "upc_a",
                "upc_e",
              ],
            }}
          >
            {/* Overlay UI */}
            <SafeAreaView className="flex-1">
              {/* Header */}
              <View className="px-6 py-4">
                <View className="flex-row items-center justify-between">
                  <Pressable onPress={() => navigation.goBack()}>
                    <Ionicons name="close" size={32} color="white" />
                  </Pressable>
                  <Text className="text-white text-lg font-semibold">
                    Scan Barcode
                  </Text>
                  <View style={{ width: 32 }} />
                </View>
              </View>

              {/* Batch Mode Indicator */}
              {batchMode && batchLocation && (
                <View className="mx-6 bg-green-600 rounded-xl p-4 mb-4">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-white font-semibold mb-1">
                        Batch Mode Active
                      </Text>
                      <Text className="text-white/90 text-sm">
                        Destination: {batchLocation.path}
                      </Text>
                      <Text className="text-white/90 text-sm mt-1">
                        Items moved: {batchCount}
                      </Text>
                    </View>
                    <Pressable
                      onPress={handleBatchModeToggle}
                      className="bg-white/20 rounded-lg px-3 py-2"
                    >
                      <Text className="text-white font-semibold text-sm">
                        Change
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Scanning Frame */}
              <View className="flex-1 justify-center items-center">
                <View className="w-64 h-64 border-2 border-white rounded-2xl" />
                <Text className="text-white text-center mt-6 text-base">
                  Point camera at barcode or QR code
                </Text>
              </View>

              {/* Bottom Actions */}
              <View className="px-6 pb-6 space-y-3">
                {!batchMode && (
                  <Pressable
                    onPress={handleBatchModeToggle}
                    className="bg-white/20 rounded-xl py-4"
                  >
                    <Text className="text-white text-center font-semibold">
                      Enable Batch Mode
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => setManualEntry(true)}
                  className="bg-white rounded-xl py-4"
                >
                  <Text className="text-gray-900 text-center font-semibold">
                    Enter ID Manually
                  </Text>
                </Pressable>
              </View>
            </SafeAreaView>
          </CameraView>
        ) : (
          // Manual Entry Screen
          <SafeAreaView className="flex-1 bg-white">
            <View className="px-6 py-4 border-b border-gray-200">
              <View className="flex-row items-center justify-between">
                <Pressable onPress={() => setManualEntry(false)}>
                  <Ionicons name="arrow-back" size={24} color="#374151" />
                </Pressable>
                <Text className="text-xl font-bold text-gray-900">
                  Enter Inventory Number
                </Text>
                <View style={{ width: 24 }} />
              </View>
            </View>

            <View className="flex-1 px-6 py-8">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Inventory Number
              </Text>
              <TextInput
                value={manualCode}
                onChangeText={setManualCode}
                placeholder="Enter inventory number"
                placeholderTextColor="#9CA3AF"
                autoFocus
                className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-4 text-base text-gray-900 mb-6"
              />

              <Pressable
                onPress={handleManualEntry}
                disabled={isLoading}
                className="bg-blue-600 rounded-xl py-4 active:bg-blue-700"
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white text-center font-semibold">
                    Continue
                  </Text>
                )}
              </Pressable>
            </View>
          </SafeAreaView>
        )}

        {/* Location Picker for Batch Mode */}
        {!batchMode && (
          <LocationPicker
            visible={showLocationPicker}
            onClose={() => setShowLocationPicker(false)}
            onSelectLocation={handleBatchLocationSelect}
          />
        )}
      </View>
    );
  }

  if (step === "create-item") {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar style="dark" />
        <View className="px-6 py-4 border-b border-gray-200">
          <Text className="text-2xl font-bold text-gray-900">New Item</Text>
        </View>

        <ScrollView className="flex-1 px-6 py-6">
          <View className="bg-blue-50 rounded-xl p-4 mb-6">
            <Text className="text-sm text-blue-900">
              Item not found. Creating new item:
            </Text>
            <Text className="text-lg font-bold text-blue-900 mt-1">
              {scannedCode}
            </Text>
            <Text className="text-sm text-blue-700 mt-2">
              Will be placed in Transit Room
            </Text>
          </View>

          <View className="space-y-4">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </Text>
              <TextInput
                value={newItemDescription}
                onChangeText={setNewItemDescription}
                placeholder="Item description"
                placeholderTextColor="#9CA3AF"
                className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Customer Name (Optional)
              </Text>
              <TextInput
                value={newItemCustomer}
                onChangeText={setNewItemCustomer}
                placeholder="Customer name"
                placeholderTextColor="#9CA3AF"
                className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
              />
            </View>
          </View>
        </ScrollView>

        <View className="px-6 py-4 border-t border-gray-200 space-y-3">
          <Pressable
            onPress={handleCreateItem}
            disabled={isLoading}
            className="bg-blue-600 rounded-xl py-4 active:bg-blue-700"
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-semibold">
                Create Item
              </Text>
            )}
          </Pressable>
          <Pressable
            onPress={resetScan}
            className="bg-gray-100 rounded-xl py-4 active:bg-gray-200"
          >
            <Text className="text-gray-900 text-center font-semibold">
              Cancel
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Item Detail Step
  if (step === "item-detail" && currentItem) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar style="dark" />
        <View className="px-6 py-4 border-b border-gray-200">
          <Text className="text-2xl font-bold text-gray-900">Item Found</Text>
        </View>

        <ScrollView className="flex-1 px-6 py-6">
          <View className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
            <View>
              <Text className="text-sm text-gray-600">Inventory Number</Text>
              <Text className="text-lg font-bold text-gray-900">
                {currentItem.inventory_number}
              </Text>
            </View>

            {currentItem.description && (
              <View>
                <Text className="text-sm text-gray-600">Description</Text>
                <Text className="text-base text-gray-900">
                  {currentItem.description}
                </Text>
              </View>
            )}

            {currentItem.customer_name && (
              <View>
                <Text className="text-sm text-gray-600">Customer</Text>
                <Text className="text-base text-gray-900">
                  {currentItem.customer_name}
                </Text>
              </View>
            )}

            <View>
              <Text className="text-sm text-gray-600">Current Location</Text>
              <Text className="text-base font-medium text-gray-900">
                {currentItem.current_location_path || "Unknown"}
              </Text>
            </View>

            <View>
              <Text className="text-sm text-gray-600">Status</Text>
              <View className="mt-1">
                <View
                  className={`self-start px-3 py-1 rounded-full ${
                    currentItem.status === "In storage"
                      ? "bg-green-100"
                      : currentItem.status === "In transit"
                        ? "bg-blue-100"
                        : "bg-gray-100"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      currentItem.status === "In storage"
                        ? "text-green-800"
                        : currentItem.status === "In transit"
                          ? "text-blue-800"
                          : "text-gray-800"
                    }`}
                  >
                    {currentItem.status}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        <View className="px-6 py-4 border-t border-gray-200 space-y-3">
          <Pressable
            onPress={() => setShowLocationPicker(true)}
            className="bg-blue-600 rounded-xl py-4 active:bg-blue-700"
          >
            <Text className="text-white text-center font-semibold">
              Choose Location
            </Text>
          </Pressable>
          <Pressable
            onPress={resetScan}
            className="bg-gray-100 rounded-xl py-4 active:bg-gray-200"
          >
            <Text className="text-gray-900 text-center font-semibold">
              Back to Scanner
            </Text>
          </Pressable>
        </View>

        <LocationPicker
          visible={showLocationPicker}
          onClose={() => setShowLocationPicker(false)}
          onSelectLocation={handleSelectLocation}
        />
      </SafeAreaView>
    );
  }

  return null;
}
