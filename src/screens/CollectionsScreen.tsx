import React, { useState, useRef, useCallback } from "react";
import { View, Text, FlatList, Pressable, TextInput, Modal, NativeSyntheticEvent, TextInputKeyPressEventData } from "react-native";
import { useCollectionStore } from "../state/collectionStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";

type BufferedDigit = { time: number; digit: string };

const MIN_BARCODE_LENGTH = 3;
const EXPECTED_BARCODE_LENGTH = 12;
const MAX_INPUT_DELAY_MS = 500;

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Collections">;
};

export default function CollectionsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const collections = useCollectionStore((s) => s.collections);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "in_progress" | "completed" | "signed">("all");
  const [scannedBarcode, setScannedBarcode] = useState<string>("");
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);

  // Barcode scanner refs
  const scannerInputRef = useRef<TextInput | null>(null);
  const keyBuffer = useRef<BufferedDigit[]>([]);
  const lastKeyTime = useRef<number>(0);
  const timeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Barcode scanner helper functions
  const getLatestBarcode = (raw: string): string => {
    if (!raw) return raw;
    if (raw.length >= EXPECTED_BARCODE_LENGTH) {
      const latest = raw.slice(-EXPECTED_BARCODE_LENGTH);
      console.log("[SCANNER] Using last", EXPECTED_BARCODE_LENGTH, "digits:", latest);
      return latest;
    }
    return raw;
  };

  const resetScanState = useCallback(() => {
    keyBuffer.current = [];
    lastKeyTime.current = 0;
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
      timeoutId.current = null;
    }
  }, []);

  const focusScannerInput = useCallback(() => {
    console.log("[SCANNER] focusScannerInput called. hasRef:", !!scannerInputRef.current);
    if (scannerInputRef.current) {
      scannerInputRef.current.focus();
      console.log("[SCANNER] focusScannerInput -> requested focus");
    }
  }, []);

  const finishScan = useCallback(() => {
    console.log("[SCANNER] finishScan called. buffer length:", keyBuffer.current.length);

    if (keyBuffer.current.length >= MIN_BARCODE_LENGTH) {
      const rawDigits = keyBuffer.current.map((e) => e.digit).join("");
      console.log("[SCANNER] raw scanned digits:", rawDigits);

      const latest = getLatestBarcode(rawDigits);
      console.log("[SCANNER] SCAN COMPLETE:", latest);

      setScannedBarcode(latest);
      setShowBarcodeModal(true);
    } else {
      console.log("[SCANNER] buffer too short, ignoring.");
    }

    keyBuffer.current = [];
    scannerInputRef.current?.clear();
    focusScannerInput();
  }, [focusScannerInput]);

  const handleScannerChangeText = useCallback((value: string) => {
    console.log("[SCANNER] onChangeText value:", JSON.stringify(value));

    if (!value) return;

    // Only keep digits
    if (!/^\d+$/.test(value)) {
      console.log("[SCANNER] non-digit text, clearing input.");
      scannerInputRef.current?.clear();
      return;
    }

    const now = Date.now();

    // New text replaces the previous buffer
    keyBuffer.current = [];
    for (const digit of value) {
      keyBuffer.current.push({ time: now, digit });
    }
    lastKeyTime.current = now;

    console.log(
      "[SCANNER] buffered digits:",
      keyBuffer.current.map((d) => d.digit).join(""),
      "length:",
      keyBuffer.current.length
    );

    // Clear visible text so next scan starts fresh visually
    scannerInputRef.current?.clear();

    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }

    // Fallback: if Enter doesn't come, finish after a short delay
    timeoutId.current = setTimeout(() => {
      console.log("[SCANNER] timeout fired, finishing scan.");
      finishScan();
    }, MAX_INPUT_DELAY_MS);
  }, [finishScan]);

  const handleScannerKeyPress = useCallback((e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    const key = e.nativeEvent.key;
    console.log("[SCANNER] onKeyPress key:", key);

    if (key === "Enter") {
      console.log("[SCANNER] Enter key detected, finishing scan immediately.");
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
        timeoutId.current = null;
      }
      finishScan();
    }
  }, [finishScan]);

  // Focus scanner input when screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log("[COLLECTIONS] Screen focused. Resetting scanner state.");
      resetScanState();

      const id = setTimeout(() => {
        focusScannerInput();
      }, 50);

      return () => {
        console.log("[COLLECTIONS] Screen blurred. Cleaning up scanner state.");
        clearTimeout(id);
        resetScanState();
      };
    }, [resetScanState, focusScannerInput])
  );

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

      {/* Hidden Scanner Input (for Android hardware scanner) */}
      <TextInput
        ref={scannerInputRef}
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          opacity: 0,
        }}
        autoFocus
        onChangeText={handleScannerChangeText}
        onKeyPress={handleScannerKeyPress}
        keyboardType="default"
        autoCapitalize="none"
        autoCorrect={false}
        blurOnSubmit={false}
        showSoftInputOnFocus={false}
        caretHidden={true}
        contextMenuHidden={true}
        onFocus={() => {
          console.log("[SCANNER] TextInput FOCUS");
        }}
      />

      {/* Barcode Scanned Modal */}
      <Modal visible={showBarcodeModal} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <View className="items-center mb-6">
              <View className="bg-green-100 w-16 h-16 rounded-full items-center justify-center mb-4">
                <Ionicons name="barcode-outline" size={32} color="#16A34A" />
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-2">Barcode Scanned</Text>
              <Text className="text-gray-600 text-center">Successfully scanned barcode</Text>
            </View>

            <View className="bg-gray-50 rounded-2xl p-4 mb-6">
              <Text className="text-sm text-gray-500 mb-1">Barcode Value</Text>
              <Text className="text-2xl font-mono font-bold text-gray-900 text-center">
                {scannedBarcode}
              </Text>
            </View>

            <Pressable
              onPress={() => {
                setShowBarcodeModal(false);
                focusScannerInput();
              }}
              className="bg-blue-600 rounded-xl py-4 items-center active:bg-blue-700"
            >
              <Text className="text-white text-lg font-semibold">OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
