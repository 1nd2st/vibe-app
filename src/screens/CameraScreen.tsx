import React, { useState, useRef } from "react";
import { View, Text, Pressable, TextInput, Modal, FlatList, Image } from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { useCollectionStore } from "../state/collectionStore";
import { useSettingsStore } from "../state/settingsStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/RootNavigator";
import type { ItemPhoto } from "../types/collection";
import { analyzeImageForDamage } from "../services/aiDamageDetection";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Camera">;
  route: RouteProp<RootStackParamList, "Camera">;
};

export default function CameraScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { collectionId, itemId } = route.params;
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [flash, setFlash] = useState(false);
  const [photos, setPhotos] = useState<ItemPhoto[]>([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");
  const [cameraReady, setCameraReady] = useState(false);

  const item = useCollectionStore((s) => s.getItem(itemId || ""));
  const updateItem = useCollectionStore((s) => s.updateItem);
  const aiAutoDetect = useSettingsStore((s) => s.settings.aiAutoDetect);
  const aiEnabled = useSettingsStore((s) => s.settings.aiEnabled);

  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center px-6">
        <Ionicons name="camera-outline" size={64} color="#9CA3AF" />
        <Text className="text-gray-900 text-xl font-bold mt-4 text-center">Camera Permission Required</Text>
        <Text className="text-gray-600 text-base mt-2 text-center">
          We need your permission to use the camera for documenting items
        </Text>
        <Pressable onPress={requestPermission} className="bg-blue-600 rounded-xl px-6 py-4 mt-6 active:bg-blue-700">
          <Text className="text-white text-base font-semibold">Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  const takePicture = async () => {
    if (!cameraRef.current || !cameraReady) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      if (photo) {
        const newPhoto: ItemPhoto = {
          id: `PHOTO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          uri: photo.uri,
          timestamp: Date.now(),
          aiAnalyzed: false,
        };

        // Add photo to array immediately
        setPhotos((prevPhotos) => [...prevPhotos, newPhoto]);

        // Run AI analysis in background without blocking
        if (aiEnabled && aiAutoDetect) {
          // Use setTimeout to run AI analysis asynchronously without blocking UI
          setTimeout(async () => {
            try {
              const aiResult = await analyzeImageForDamage(photo.uri);
              if (aiResult) {
                // Update the specific photo with AI analysis
                setPhotos((prevPhotos) => {
                  const photoIndex = prevPhotos.findIndex((p) => p.id === newPhoto.id);
                  if (photoIndex === -1) return prevPhotos;

                  const updated = [...prevPhotos];
                  updated[photoIndex] = {
                    ...updated[photoIndex],
                    aiDetectedDamage: aiResult,
                    aiAnalyzed: true,
                    conditionNotes: `[AI Analysis]\n${aiResult}`,
                  };
                  return updated;
                });
              }
            } catch (aiError) {
              console.error("Auto AI analysis failed:", aiError);
              // Silently fail - don't block photo capture
            }
          }, 100);
        }
      }
    } catch (error) {
      console.error("Error taking picture:", error);
    }
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  const deletePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const openNoteModal = (index: number) => {
    setCurrentPhotoIndex(index);
    setNoteText(photos[index].conditionNotes || "");
    setShowNoteModal(true);
  };

  const saveNote = () => {
    if (currentPhotoIndex !== null) {
      const updatedPhotos = [...photos];
      updatedPhotos[currentPhotoIndex] = {
        ...updatedPhotos[currentPhotoIndex],
        conditionNotes: noteText.trim(),
      };
      setPhotos(updatedPhotos);
    }
    setShowNoteModal(false);
    setNoteText("");
    setCurrentPhotoIndex(null);
  };

  const handleFinish = () => {
    if (itemId && photos.length > 0) {
      updateItem(itemId, { photos });
    }
    // Use goBack instead of navigate to properly unmount the camera
    navigation.goBack();
  };

  return (
    <View className="flex-1 bg-black">
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing={facing}
        enableTorch={flash}
        onCameraReady={() => setCameraReady(true)}
      >
        {/* Camera Overlay UI */}
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

              <View className="flex-row space-x-3">
                <Pressable
                  onPress={() => setFlash(!flash)}
                  className={`w-10 h-10 rounded-full items-center justify-center active:bg-yellow-600 ${
                    flash ? "bg-yellow-500" : "bg-black/50"
                  }`}
                >
                  <Ionicons name={flash ? "flash" : "flash-off"} size={20} color="#FFFFFF" />
                </Pressable>

                <Pressable
                  onPress={toggleCameraFacing}
                  className="w-10 h-10 rounded-full bg-black/50 items-center justify-center active:bg-black/70"
                >
                  <Ionicons name="camera-reverse" size={20} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>

            {item && (
              <View className="mt-4 bg-black/50 rounded-2xl p-4">
                <Text className="text-white text-base font-semibold">{item.title}</Text>
                <Text className="text-white/70 text-sm mt-1">
                  {photos.length} photo{photos.length !== 1 ? "s" : ""} taken
                </Text>
              </View>
            )}
          </View>

          {/* Bottom Bar */}
          <View
            className="absolute bottom-0 left-0 right-0"
            style={{ paddingBottom: insets.bottom + 24, paddingHorizontal: 24 }}
          >
            {/* Photo Strip */}
            {photos.length > 0 && (
              <View className="mb-4">
                <FlatList
                  horizontal
                  data={photos}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ gap: 8 }}
                  renderItem={({ item: photo, index }) => (
                    <View className="relative">
                      <Image source={{ uri: photo.uri }} style={{ width: 60, height: 60 }} className="rounded-lg" />
                      <Pressable
                        onPress={() => openNoteModal(index)}
                        className="absolute top-1 left-1 w-6 h-6 bg-blue-600 rounded-full items-center justify-center"
                      >
                        <Ionicons name="create" size={12} color="#FFFFFF" />
                      </Pressable>
                      <Pressable
                        onPress={() => deletePhoto(index)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-600 rounded-full items-center justify-center"
                      >
                        <Ionicons name="trash" size={12} color="#FFFFFF" />
                      </Pressable>
                      {photo.conditionNotes && (
                        <View className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full items-center justify-center">
                          <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                  )}
                />
              </View>
            )}

            {/* Controls */}
            <View className="flex-row items-center justify-between">
              {photos.length > 0 ? (
                <Pressable
                  onPress={handleFinish}
                  className="bg-green-600 rounded-full px-6 py-3 active:bg-green-700"
                >
                  <Text className="text-white text-base font-semibold">Done ({photos.length})</Text>
                </Pressable>
              ) : (
                <View />
              )}

              <Pressable
                onPress={takePicture}
                className="w-20 h-20 rounded-full border-4 border-white bg-white/30 items-center justify-center active:bg-white/50"
              >
                <View className="w-16 h-16 rounded-full bg-white" />
              </Pressable>

              {photos.length > 0 ? (
                <Text className="text-white text-sm">{photos.length} photo{photos.length !== 1 ? "s" : ""}</Text>
              ) : (
                <View />
              )}
            </View>
          </View>
        </View>
      </CameraView>

      {/* Note Modal */}
      <Modal visible={showNoteModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6" style={{ paddingBottom: insets.bottom + 24 }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-gray-900">Add Condition Note</Text>
              <Pressable onPress={() => setShowNoteModal(false)} className="active:opacity-70">
                <Ionicons name="close" size={28} color="#111827" />
              </Pressable>
            </View>

            <Text className="text-sm text-gray-600 mb-3">
              Describe any damage, wear, or notable features visible in this photo
            </Text>

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
      </Modal>
    </View>
  );
}
