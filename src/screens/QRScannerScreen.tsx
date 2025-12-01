import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useCollectionStore } from "../state/collectionStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/RootNavigator";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "QRScanner">;
  route: RouteProp<RootStackParamList, "QRScanner">;
};

export default function QRScannerScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const collections = useCollectionStore((s) => s.collections);

  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center px-6">
        <Ionicons name="qr-code-outline" size={64} color="#9CA3AF" />
        <Text className="text-gray-900 text-xl font-bold mt-4 text-center">Camera Permission Required</Text>
        <Text className="text-gray-600 text-base mt-2 text-center">
          We need camera permission to scan QR codes
        </Text>
        <Pressable onPress={requestPermission} className="bg-blue-600 rounded-xl px-6 py-4 mt-6 active:bg-blue-700">
          <Text className="text-white text-base font-semibold">Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  const handleBarCodeScanned = ({ data }: { type: string; data: string }) => {
    if (scanned) return;

    setScanned(true);

    // Check if it's a collection ID
    if (data.startsWith("COL-")) {
      const collection = collections.find((c) => c.id === data);
      if (collection) {
        navigation.replace("CollectionDetail", { collectionId: data });
        return;
      }
    }

    // Check if it's an item ID
    if (data.startsWith("ITEM-")) {
      // Find which collection this item belongs to
      for (const collection of collections) {
        const item = collection.items.find((i) => i.id === data);
        if (item) {
          navigation.replace("ItemDetail", { itemId: data, collectionId: collection.id });
          return;
        }
      }
    }

    // If not found, show error and allow retry
    setTimeout(() => {
      setScanned(false);
    }, 2000);
  };

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      >
        {/* Overlay UI */}
        <View className="absolute top-0 left-0 right-0 bottom-0 z-10">
          {/* Top Bar */}
          <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 24 }}>
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={() => navigation.goBack()}
                className="w-10 h-10 rounded-full bg-black/50 items-center justify-center active:bg-black/70"
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </Pressable>
            </View>

            <View className="mt-6 bg-black/50 rounded-2xl p-4">
              <Text className="text-white text-xl font-bold">Scan QR Code</Text>
              <Text className="text-white/80 text-sm mt-2">
                Point your camera at a collection or item QR code
              </Text>
            </View>
          </View>

          {/* Scanning Frame */}
          <View className="flex-1 items-center justify-center">
            <View
              className="border-4 border-white rounded-3xl"
              style={{
                width: 250,
                height: 250,
                backgroundColor: "transparent",
              }}
            >
              {/* Corner indicators */}
              <View className="absolute -top-1 -left-1 w-16 h-16 border-t-8 border-l-8 border-blue-500 rounded-tl-3xl" />
              <View className="absolute -top-1 -right-1 w-16 h-16 border-t-8 border-r-8 border-blue-500 rounded-tr-3xl" />
              <View className="absolute -bottom-1 -left-1 w-16 h-16 border-b-8 border-l-8 border-blue-500 rounded-bl-3xl" />
              <View className="absolute -bottom-1 -right-1 w-16 h-16 border-b-8 border-r-8 border-blue-500 rounded-br-3xl" />
            </View>

            {scanned && (
              <View className="mt-6 bg-green-500 rounded-2xl px-6 py-3">
                <Text className="text-white text-base font-semibold">QR Code Detected!</Text>
              </View>
            )}
          </View>

          {/* Bottom Instructions */}
          <View style={{ paddingBottom: insets.bottom + 24, paddingHorizontal: 24 }}>
            <View className="bg-black/50 rounded-2xl p-4">
              <Text className="text-white/80 text-sm text-center">
                Align the QR code within the frame to scan
              </Text>
            </View>
          </View>
        </View>
      </CameraView>
    </View>
  );
}
