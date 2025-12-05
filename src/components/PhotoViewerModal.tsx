import React, { useState } from "react";
import { View, Text, Modal, Pressable, Image, ScrollView, Dimensions, Linking, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ItemPhoto } from "../types/collection";

interface PhotoViewerModalProps {
  visible: boolean;
  photos: ItemPhoto[];
  initialIndex: number;
  onClose: () => void;
  onEdit?: (photoId: string) => void;
  onDelete?: (photoId: string) => void;
  onAdd?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
  canAdd?: boolean;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function PhotoViewerModal({
  visible,
  photos,
  initialIndex,
  onClose,
  onEdit,
  onDelete,
  onAdd,
  canEdit = false,
  canDelete = false,
  canAdd = false,
}: PhotoViewerModalProps) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const currentPhoto = photos[currentIndex];

  if (!currentPhoto) return null;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatGPS = (lat?: number, lon?: number) => {
    if (!lat || !lon) return null;
    const latDir = lat >= 0 ? "N" : "S";
    const lonDir = lon >= 0 ? "E" : "W";
    return `${Math.abs(lat).toFixed(6)}° ${latDir}, ${Math.abs(lon).toFixed(6)}° ${lonDir}`;
  };

  const openInMaps = () => {
    if (currentPhoto.latitude && currentPhoto.longitude) {
      const lat = currentPhoto.latitude;
      const lon = currentPhoto.longitude;
      const label = "Photo Location";

      const url = Platform.select({
        ios: `maps:0,0?q=${label}@${lat},${lon}`,
        android: `geo:0,0?q=${lat},${lon}(${label})`,
        default: `https://maps.google.com/?q=${lat},${lon}`
      });

      Linking.openURL(url!).catch(err => {
        // Fallback to Google Maps web if native app fails
        Linking.openURL(`https://maps.google.com/?q=${lat},${lon}`);
      });
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View className="flex-1 bg-black">
        {/* Header */}
        <View
          className="absolute top-0 left-0 right-0 z-10 bg-black/80"
          style={{ paddingTop: insets.top + 8 }}
        >
          <View className="flex-row items-center justify-between px-4 py-3">
            <Pressable onPress={onClose} className="active:opacity-70">
              <Ionicons name="close" size={32} color="#FFFFFF" />
            </Pressable>
            <Text className="text-white text-lg font-semibold">
              {currentIndex + 1} / {photos.length}
            </Text>
            {canAdd && onAdd ? (
              <Pressable onPress={onAdd} className="active:opacity-70">
                <Ionicons name="add-circle" size={32} color="#10B981" />
              </Pressable>
            ) : (
              <View className="w-8" />
            )}
          </View>
        </View>

        {/* Main Image */}
        <View className="flex-1 items-center justify-center">
          <Image
            source={{ uri: currentPhoto.annotatedImageUri || currentPhoto.uri }}
            style={{
              width: SCREEN_WIDTH,
              height: SCREEN_HEIGHT * 0.7,
            }}
            resizeMode="contain"
          />

          {/* Navigation Arrows */}
          {currentIndex > 0 && (
            <Pressable
              onPress={goToPrevious}
              className="absolute left-4 bg-black/60 rounded-full p-3 active:bg-black/80"
              style={{ top: SCREEN_HEIGHT * 0.35 }}
            >
              <Ionicons name="chevron-back" size={32} color="#FFFFFF" />
            </Pressable>
          )}

          {currentIndex < photos.length - 1 && (
            <Pressable
              onPress={goToNext}
              className="absolute right-4 bg-black/60 rounded-full p-3 active:bg-black/80"
              style={{ top: SCREEN_HEIGHT * 0.35 }}
            >
              <Ionicons name="chevron-forward" size={32} color="#FFFFFF" />
            </Pressable>
          )}
        </View>

        {/* Metadata Panel */}
        <View
          className="absolute bottom-0 left-0 right-0 bg-black/90"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <ScrollView className="px-4 py-4" style={{ maxHeight: SCREEN_HEIGHT * 0.3 }}>
            {/* Timestamp */}
            <View className="flex-row items-center mb-3">
              <Ionicons name="time-outline" size={20} color="#9CA3AF" />
              <Text className="text-gray-300 text-sm ml-2">
                {formatDate(currentPhoto.timestamp)}
              </Text>
            </View>

            {/* GPS Location */}
            {currentPhoto.latitude && currentPhoto.longitude && (
              <Pressable
                onPress={openInMaps}
                className="flex-row items-center mb-3 active:opacity-70"
              >
                <Ionicons name="location-outline" size={20} color="#3B82F6" />
                <Text className="text-blue-400 text-sm ml-2 underline">
                  {formatGPS(currentPhoto.latitude, currentPhoto.longitude)}
                </Text>
              </Pressable>
            )}

            {/* Photo Source */}
            <View className="flex-row items-center mb-3">
              <Ionicons
                name={currentPhoto.source === "collection_flow" ? "camera-outline" : "add-circle-outline"}
                size={20}
                color="#9CA3AF"
              />
              <Text className="text-gray-300 text-sm ml-2">
                {currentPhoto.source === "collection_flow" ? "Collection Photo" : "Added Later"}
              </Text>
              {currentPhoto.isLocked && (
                <View className="ml-2 flex-row items-center">
                  <Ionicons name="lock-closed" size={16} color="#F59E0B" />
                  <Text className="text-amber-400 text-xs ml-1">Locked</Text>
                </View>
              )}
            </View>

            {/* Annotations */}
            {currentPhoto.annotationData && (
              <View className="flex-row items-center mb-3">
                <Ionicons name="brush-outline" size={20} color="#EA580C" />
                <Text className="text-orange-400 text-sm ml-2">Has annotations</Text>
              </View>
            )}

            {/* AI Analysis */}
            {currentPhoto.aiDetectedDamage && (
              <View className="bg-blue-900/30 rounded-lg p-3 mb-3 border border-blue-600/30">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="sparkles" size={16} color="#60A5FA" />
                  <Text className="text-blue-300 text-sm font-semibold ml-2">AI Analysis</Text>
                </View>
                <Text className="text-gray-300 text-sm">{currentPhoto.aiDetectedDamage}</Text>
              </View>
            )}

            {/* Condition Notes */}
            {(currentPhoto.conditionNotes || currentPhoto.originalNote) && (
              <View className="mb-3">
                {/* Original Note (if edited after signature) */}
                {currentPhoto.originalNote && (
                  <View className="bg-amber-900/30 rounded-lg p-3 mb-2 border border-amber-600/30">
                    <View className="flex-row items-center mb-1">
                      <Ionicons name="lock-closed" size={14} color="#FCD34D" />
                      <Text className="text-amber-300 text-xs font-semibold ml-1">Original Note (Signed)</Text>
                    </View>
                    <Text className="text-gray-300 text-sm">{currentPhoto.originalNote}</Text>
                  </View>
                )}

                {/* Current/Edited Note */}
                {currentPhoto.conditionNotes && (
                  <View className="bg-gray-800 rounded-lg p-3">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-gray-400 text-xs">
                        {currentPhoto.originalNote ? "Edited Note" : "Condition Notes"}
                      </Text>
                      {currentPhoto.noteEditedAt && (
                        <Text className="text-gray-500 text-xs">
                          Edited {new Date(currentPhoto.noteEditedAt).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                    <Text className="text-gray-200 text-sm">{currentPhoto.conditionNotes}</Text>
                    {currentPhoto.noteEditedAt && currentPhoto.originalNote && (
                      <View className="mt-2 pt-2 border-t border-gray-700">
                        <Text className="text-amber-400 text-xs">
                          📝 Note edited after collection was signed
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Action Buttons */}
            <View className="flex-row gap-3 mt-2">
              {canEdit && onEdit && (
                <Pressable
                  onPress={() => onEdit(currentPhoto.id)}
                  className="flex-1 bg-blue-600 rounded-lg py-3 items-center active:bg-blue-700"
                >
                  <Text className="text-white text-sm font-semibold">Edit Note</Text>
                </Pressable>
              )}
              {canDelete && onDelete && !currentPhoto.isLocked && (
                <Pressable
                  onPress={() => onDelete(currentPhoto.id)}
                  className="flex-1 bg-red-600 rounded-lg py-3 items-center active:bg-red-700"
                >
                  <Text className="text-white text-sm font-semibold">Delete</Text>
                </Pressable>
              )}
            </View>
          </ScrollView>

          {/* Thumbnail Navigation */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-3 px-4"
            contentContainerStyle={{ gap: 8 }}
          >
            {photos.map((photo, index) => (
              <Pressable
                key={photo.id}
                onPress={() => setCurrentIndex(index)}
                className={`relative ${index === currentIndex ? "opacity-100" : "opacity-50"}`}
              >
                <Image
                  source={{ uri: photo.annotatedImageUri || photo.uri }}
                  style={{ width: 60, height: 60 }}
                  className="rounded-lg"
                />
                {index === currentIndex && (
                  <View className="absolute inset-0 border-2 border-blue-500 rounded-lg" />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
