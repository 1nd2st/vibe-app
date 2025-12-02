import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Image, TextInput, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useCollectionStore } from "../state/collectionStore";
import { useSettingsStore } from "../state/settingsStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/RootNavigator";
import { analyzeImageForDamage } from "../services/aiDamageDetection";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "ItemDetail">;
  route: RouteProp<RootStackParamList, "ItemDetail">;
};

export default function ItemDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { itemId, collectionId } = route.params;

  const item = useCollectionStore((s) => s.getItem(itemId));
  const updateItem = useCollectionStore((s) => s.updateItem);
  const aiEnabled = useSettingsStore((s) => s.settings.aiEnabled);

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  if (!item) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Ionicons name="alert-circle-outline" size={64} color="#DC2626" />
        <Text className="text-gray-900 text-lg font-semibold mt-4">Item not found</Text>
        <Pressable onPress={() => navigation.goBack()} className="mt-4">
          <Text className="text-blue-600 text-base">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const openNoteModal = (index: number) => {
    setSelectedPhotoIndex(index);
    setNoteText(item.photos[index].conditionNotes || "");
    setShowNoteModal(true);
  };

  const saveNote = () => {
    if (selectedPhotoIndex !== null) {
      const updatedPhotos = [...item.photos];
      updatedPhotos[selectedPhotoIndex] = {
        ...updatedPhotos[selectedPhotoIndex],
        conditionNotes: noteText.trim(),
      };
      updateItem(itemId, { photos: updatedPhotos });
    }
    setShowNoteModal(false);
    setNoteText("");
    setSelectedPhotoIndex(null);
  };

  const analyzeWithAI = async () => {
    if (selectedPhotoIndex === null) return;

    setIsAnalyzing(true);
    try {
      const photo = item.photos[selectedPhotoIndex];
      const result = await analyzeImageForDamage(photo.uri);

      if (result) {
        // Append AI analysis to existing note or set as new note
        const currentNote = noteText.trim();
        if (currentNote) {
          setNoteText(`${currentNote}\n\n[AI Analysis]\n${result}`);
        } else {
          setNoteText(`[AI Analysis]\n${result}`);
        }
      }
    } catch (error) {
      console.error("AI analysis failed:", error);
      // Show error to user
      setNoteText((prev) => {
        const currentNote = prev.trim();
        return currentNote
          ? `${currentNote}\n\n[AI Analysis Failed - Please try again]`
          : "[AI Analysis Failed - Please try again]";
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <View className="flex-row items-center">
          <Pressable onPress={() => navigation.goBack()} className="mr-4 active:opacity-70">
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900">{item.title}</Text>
            <Text className="text-sm text-gray-500">{item.id}</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Photos */}
        <View className="bg-white rounded-2xl p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Photos ({item.photos.length})</Text>
          {item.photos.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {item.photos.map((photo, index) => (
                <Pressable
                  key={photo.id}
                  onPress={() => openNoteModal(index)}
                  className="relative"
                >
                  <Image
                    source={{ uri: photo.uri }}
                    style={{ width: 100, height: 100 }}
                    className="rounded-xl"
                  />
                  {photo.conditionNotes && (
                    <View className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full items-center justify-center">
                      <Ionicons name="document-text" size={14} color="#FFFFFF" />
                    </View>
                  )}
                  {photo.annotationData && (
                    <View className="absolute top-2 left-2 w-6 h-6 bg-orange-600 rounded-full items-center justify-center">
                      <Ionicons name="brush" size={12} color="#FFFFFF" />
                    </View>
                  )}
                  <View className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded">
                    <Text className="text-white text-xs">{index + 1}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text className="text-gray-400 text-center py-4">No photos</Text>
          )}
        </View>

        {/* Item Details */}
        <View className="bg-white rounded-2xl p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Item Details</Text>

          {item.artistName && (
            <View className="mb-3">
              <Text className="text-sm text-gray-500 mb-1">Artist</Text>
              <Text className="text-base text-gray-900">{item.artistName}</Text>
            </View>
          )}

          {item.description && (
            <View className="mb-3">
              <Text className="text-sm text-gray-500 mb-1">Description</Text>
              <Text className="text-base text-gray-900">{item.description}</Text>
            </View>
          )}

          <View className="mb-3">
            <Text className="text-sm text-gray-500 mb-1">Dimensions</Text>
            <Text className="text-base text-gray-900">
              {item.dimensions.length} × {item.dimensions.width} × {item.dimensions.height} {item.dimensions.unit}
            </Text>
          </View>

          {item.dimensions.weight && (
            <View className="mb-3">
              <Text className="text-sm text-gray-500 mb-1">Weight</Text>
              <Text className="text-base text-gray-900">
                {item.dimensions.weight} {item.dimensions.weightUnit}
              </Text>
            </View>
          )}

          <View className="mb-3">
            <Text className="text-sm text-gray-500 mb-1">Estimated Value</Text>
            <Text className="text-base text-gray-900">
              {item.currency} {item.estimatedValue.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Condition Report */}
        <View className="bg-white rounded-2xl p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Condition Report</Text>

          <View className="mb-3">
            <Text className="text-sm text-gray-500 mb-2">Overall Condition</Text>
            <View
              className={`self-start px-4 py-2 rounded-xl ${
                item.overallCondition === "Excellent"
                  ? "bg-green-100"
                  : item.overallCondition === "Good"
                  ? "bg-blue-100"
                  : item.overallCondition === "Fair"
                  ? "bg-yellow-100"
                  : "bg-red-100"
              }`}
            >
              <Text
                className={`text-base font-semibold ${
                  item.overallCondition === "Excellent"
                    ? "text-green-700"
                    : item.overallCondition === "Good"
                    ? "text-blue-700"
                    : item.overallCondition === "Fair"
                    ? "text-yellow-700"
                    : "text-red-700"
                }`}
              >
                {item.overallCondition}
              </Text>
            </View>
          </View>

          {item.conditionNotes && (
            <View>
              <Text className="text-sm text-gray-500 mb-1">General Notes</Text>
              <Text className="text-base text-gray-900">{item.conditionNotes}</Text>
            </View>
          )}
        </View>

        {/* Photo-Specific Notes */}
        {item.photos.some((p) => p.conditionNotes) && (
          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="text-lg font-semibold text-gray-900 mb-3">Photo Notes</Text>
            {item.photos.map((photo, index) =>
              photo.conditionNotes ? (
                <View key={photo.id} className="mb-3 pb-3 border-b border-gray-100 last:border-b-0">
                  <Text className="text-sm text-gray-500 mb-1">Photo {index + 1}</Text>
                  <Text className="text-base text-gray-900">{photo.conditionNotes}</Text>
                </View>
              ) : null
            )}
          </View>
        )}
      </ScrollView>

      {/* Note Modal */}
      <Modal visible={showNoteModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl p-6" style={{ paddingBottom: insets.bottom + 24 }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-gray-900">
                Photo {selectedPhotoIndex !== null ? selectedPhotoIndex + 1 : ""} Note
              </Text>
              <Pressable onPress={() => setShowNoteModal(false)} className="active:opacity-70">
                <Ionicons name="close" size={28} color="#111827" />
              </Pressable>
            </View>

            {selectedPhotoIndex !== null && (
              <View>
                <Image
                  source={{ uri: item.photos[selectedPhotoIndex].uri }}
                  style={{ width: "100%", height: 200 }}
                  className="rounded-xl mb-2"
                  resizeMode="contain"
                />
                {item.photos[selectedPhotoIndex].annotationData && (
                  <Text className="text-xs text-orange-600 text-center mb-2">✓ This photo has annotations</Text>
                )}
              </View>
            )}

            <Pressable
              onPress={() => {
                if (selectedPhotoIndex !== null) {
                  setShowNoteModal(false);
                  navigation.navigate("PhotoAnnotation", {
                    itemId,
                    photoId: item.photos[selectedPhotoIndex].id,
                  });
                }
              }}
              className="flex-row items-center justify-center bg-orange-600 rounded-xl py-3 mb-3 active:bg-orange-700"
            >
              <Ionicons name="brush" size={20} color="#FFFFFF" />
              <Text className="text-white text-base font-semibold ml-2">Annotate Photo</Text>
            </Pressable>

            <Text className="text-sm text-gray-600 mb-3">
              Describe any damage, wear, or notable features visible in this photo
            </Text>

            {aiEnabled && (
              <Pressable
                onPress={analyzeWithAI}
                disabled={isAnalyzing}
                className={`flex-row items-center justify-center border-2 border-blue-600 rounded-xl py-3 mb-3 ${
                  isAnalyzing ? "opacity-50" : "active:bg-blue-50"
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <ActivityIndicator size="small" color="#2563EB" />
                    <Text className="text-blue-600 text-base font-semibold ml-2">Analyzing with AI...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={20} color="#2563EB" />
                    <Text className="text-blue-600 text-base font-semibold ml-2">Analyze with AI</Text>
                  </>
                )}
              </Pressable>
            )}

            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
              placeholder="e.g., Small scratch on upper left corner..."
              placeholderTextColor="#9CA3AF"
              value={noteText}
              onChangeText={setNoteText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoFocus
            />

            <Pressable
              onPress={saveNote}
              className="bg-blue-600 rounded-xl py-4 items-center active:bg-blue-700"
            >
              <Text className="text-white text-base font-semibold">Save Note</Text>
            </Pressable>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
