import React, { useRef, useState, useEffect } from "react";
import { View, Text, Pressable, Alert, ScrollView, Share, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/RootNavigator";
import QRCode from "react-native-qrcode-svg";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { getCollectionByUuid } from "../database/db-collections";
import type { Collection, CollectionItem } from "../types/collection";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "QRCodeDisplay">;
  route: RouteProp<RootStackParamList, "QRCodeDisplay">;
};

export default function QRCodeDisplayScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { collectionId, itemIds } = route.params;
  const qrRef = useRef<View>(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);

  // SQLite state
  const [collection, setCollection] = useState<Collection | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load collection from SQLite
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const collectionData = await getCollectionByUuid(collectionId);
        setCollection(collectionData);
      } catch (error) {
        console.error("Failed to load collection:", error);
        Alert.alert("Error", "Failed to load collection");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [collectionId]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="text-gray-600 text-base mt-4">Loading collection...</Text>
      </View>
    );
  }

  if (!collection) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Ionicons name="alert-circle-outline" size={64} color="#DC2626" />
        <Text className="text-gray-900 text-lg font-semibold mt-4">Collection not found</Text>
        <Pressable onPress={() => navigation.goBack()} className="mt-4">
          <Text className="text-blue-600 text-base">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const itemsToShow = itemIds
    ? collection.items.filter((item: CollectionItem) => itemIds.includes(item.id))
    : collection.items;

  const currentItem = itemsToShow[selectedItemIndex];

  const handleShare = async () => {
    try {
      const uri = await captureRef(qrRef, {
        format: "png",
        quality: 1,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: `QR Code - ${currentItem.displayId}`,
        });
      } else {
        Alert.alert("Sharing Not Available", "Sharing is not available on this device.");
      }
    } catch (error) {
      console.error("Error sharing QR code:", error);
      Alert.alert("Error", "Failed to share QR code.");
    }
  };

  const handleShareText = async () => {
    try {
      await Share.share({
        message: `Item: ${currentItem.title}\nID: ${currentItem.displayId}\nCollection: ${collection.displayId}`,
      });
    } catch (error) {
      console.error("Error sharing text:", error);
    }
  };

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => navigation.goBack()} className="active:opacity-70">
            <Ionicons name="close" size={28} color="#111827" />
          </Pressable>
          <Text className="text-lg font-semibold text-gray-900">QR Codes</Text>
          <View className="flex-row items-center gap-3">
            <Pressable onPress={() => navigation.navigate("Home" as any)} className="active:opacity-70">
              <Ionicons name="home-outline" size={24} color="#2563EB" />
            </Pressable>
            <Pressable onPress={handleShare} className="active:opacity-70">
              <Ionicons name="share-outline" size={28} color="#2563EB" />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* QR Code Display */}
        <View className="bg-white rounded-2xl p-6 mb-4 items-center" ref={qrRef}>
          <View className="bg-blue-600 w-full px-4 py-3 rounded-t-xl items-center mb-4">
            <Text className="text-white text-2xl font-bold">{currentItem.displayId}</Text>
          </View>

          <QRCode value={currentItem.displayId} size={250} />

          <View className="mt-4 w-full">
            <Text className="text-center text-lg font-bold text-gray-900 mb-2">{currentItem.title}</Text>
            {currentItem.artistName && (
              <Text className="text-center text-sm text-gray-600 mb-2">by {currentItem.artistName}</Text>
            )}
            <Text className="text-center text-xs text-gray-500">
              Collection: {collection.displayId}
            </Text>
          </View>
        </View>

        {/* Item Details */}
        <View className="bg-white rounded-2xl p-4 mb-4">
          <Text className="text-base font-semibold text-gray-900 mb-3">Item Details</Text>
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Dimensions:</Text>
            <Text className="text-gray-900 font-medium">
              {currentItem.dimensions.length} × {currentItem.dimensions.width} × {currentItem.dimensions.height} {currentItem.dimensions.unit}
            </Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Value:</Text>
            <Text className="text-gray-900 font-medium">
              {currentItem.currency} {currentItem.estimatedValue.toLocaleString()}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-600">Condition:</Text>
            <Text className="text-gray-900 font-medium">{currentItem.overallCondition}</Text>
          </View>
        </View>

        {/* Item Navigation */}
        {itemsToShow.length > 1 && (
          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              Item {selectedItemIndex + 1} of {itemsToShow.length}
            </Text>
            <View className="flex-row space-x-3">
              <Pressable
                onPress={() => setSelectedItemIndex(Math.max(0, selectedItemIndex - 1))}
                disabled={selectedItemIndex === 0}
                className={`flex-1 rounded-xl py-3 items-center ${
                  selectedItemIndex === 0 ? "bg-gray-200" : "bg-blue-600 active:bg-blue-700"
                }`}
              >
                <View className="flex-row items-center">
                  <Ionicons name="arrow-back" size={20} color={selectedItemIndex === 0 ? "#9CA3AF" : "#FFFFFF"} />
                  <Text className={`text-base font-semibold ml-2 ${selectedItemIndex === 0 ? "text-gray-500" : "text-white"}`}>
                    Previous
                  </Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => setSelectedItemIndex(Math.min(itemsToShow.length - 1, selectedItemIndex + 1))}
                disabled={selectedItemIndex === itemsToShow.length - 1}
                className={`flex-1 rounded-xl py-3 items-center ${
                  selectedItemIndex === itemsToShow.length - 1 ? "bg-gray-200" : "bg-blue-600 active:bg-blue-700"
                }`}
              >
                <View className="flex-row items-center">
                  <Text className={`text-base font-semibold mr-2 ${selectedItemIndex === itemsToShow.length - 1 ? "text-gray-500" : "text-white"}`}>
                    Next
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color={selectedItemIndex === itemsToShow.length - 1 ? "#9CA3AF" : "#FFFFFF"} />
                </View>
              </Pressable>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View className="space-y-3">
          <Pressable
            onPress={handleShareText}
            className="bg-green-600 rounded-xl py-4 items-center active:bg-green-700"
          >
            <View className="flex-row items-center">
              <Ionicons name="text" size={20} color="#FFFFFF" />
              <Text className="text-white text-base font-semibold ml-2">Share Item Info</Text>
            </View>
          </Pressable>
        </View>

        <Text className="text-xs text-gray-500 text-center mt-6">
          Scan this QR code to quickly access item information
        </Text>
      </ScrollView>
    </View>
  );
}
