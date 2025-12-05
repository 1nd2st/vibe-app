import React, { useState, useRef, useEffect } from "react";
import { View, Text, Pressable, TextInput, Modal, FlatList, Image, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { useSettingsStore } from "../state/settingsStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/RootNavigator";
import type { ItemPhoto, CollectionItem } from "../types/collection";
import { analyzeImageForDamage } from "../services/aiDamageDetection";
import { addPhotoToCollectionItem, getCollectionItemByUuid, getCollectionByUuid } from "../database/db-collections";
import { getItemPhotos } from "../database/db-enhanced";
import { useAuthStore } from "../state/authStore";
import * as FileSystem from "expo-file-system";
import * as SQLite from "expo-sqlite";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Camera">;
  route: RouteProp<RootStackParamList, "Camera">;
};

export default function CameraScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { collectionId, itemId, context = "collection" } = route.params;
  const cameraRef = useRef<CameraView>(null);
  const isMountedRef = useRef(true);
  const isCapturingRef = useRef(false);

  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [flash, setFlash] = useState(false);
  const [photos, setPhotos] = useState<ItemPhoto[]>([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [item, setItem] = useState<CollectionItem | null>(null);
  const [collection, setCollection] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const aiAutoDetect = useSettingsStore((s) => s.settings.aiAutoDetect);
  const aiEnabled = useSettingsStore((s) => s.settings.aiEnabled);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load item and collection details (only for collection context)
  useEffect(() => {
    const loadData = async () => {
      if (context !== "collection") return;
      try {
        if (itemId) {
          const itemData = await getCollectionItemByUuid(String(itemId));
          setItem(itemData);
        }
        if (collectionId) {
          const collectionData = await getCollectionByUuid(collectionId);
          setCollection(collectionData);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      }
    };
    loadData();
  }, [itemId, collectionId, context]);

  // Check if collection is locked
  const collectionIsLocked = collection?.status === "completed" || collection?.status === "signed";

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
    // Prevent multiple simultaneous captures
    if (!cameraRef.current || !cameraReady || isCapturingRef.current || !isMountedRef.current) {
      return;
    }

    try {
      isCapturingRef.current = true;

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      // Check if component is still mounted after async operation
      if (!isMountedRef.current) {
        return;
      }

      if (photo) {
        console.log("[CAMERA] Photo captured:", photo.uri);

        // Capture GPS location if permission granted
        let latitude: number | undefined;
        let longitude: number | undefined;

        if (locationPermission?.granted) {
          try {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            latitude = location.coords.latitude;
            longitude = location.coords.longitude;
            console.log("[CAMERA] GPS captured:", latitude, longitude);
          } catch (locationError) {
            console.log("[CAMERA] Failed to get GPS location:", locationError);
            // Continue without GPS - not critical
          }
        }

        // Copy photo to permanent location
        const photoId = `PHOTO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const permanentFileName = `${photoId}.jpg`;
        const permanentUri = `${FileSystem.documentDirectory}${permanentFileName}`;

        console.log("[CAMERA] Copying photo to permanent location:", permanentUri);

        try {
          await FileSystem.copyAsync({
            from: photo.uri,
            to: permanentUri,
          });

          // Verify the file was copied successfully
          const fileInfo = await FileSystem.getInfoAsync(permanentUri);
          if (!fileInfo.exists) {
            throw new Error("Failed to copy photo to permanent storage");
          }

          console.log("[CAMERA] Photo saved successfully, size:", fileInfo.size);

          const newPhoto: ItemPhoto = {
            id: photoId,
            uri: permanentUri,
            timestamp: Date.now(),
            aiAnalyzed: false,
            latitude,
            longitude,
            source: collectionIsLocked ? "added_later" : "collection_flow",
            isLocked: !collectionIsLocked, // Locked if from collection_flow, unlocked if added_later
          };

          // Add photo to array immediately
          setPhotos((prevPhotos) => [...prevPhotos, newPhoto]);

          // Run AI analysis in background without blocking
          if (aiEnabled && aiAutoDetect) {
            // Use setTimeout to run AI analysis asynchronously without blocking UI
            setTimeout(async () => {
              if (!isMountedRef.current) return;

              try {
                const aiResult = await analyzeImageForDamage(permanentUri);

                // Check mount status again after async operation
                if (!isMountedRef.current) return;

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
                // Silently fail - don't block photo capture
                console.error("[CAMERA] AI analysis failed:", aiError);
              }
            }, 100);
          }
        } catch (copyError) {
          console.error("[CAMERA] Failed to copy photo:", copyError);
          if (isMountedRef.current) {
            Alert.alert("Error", "Failed to save photo. Please try again.");
          }
        }
      }
    } catch (error) {
      if (isMountedRef.current) {
        // Only log error if component is still mounted
        console.error("[CAMERA] Error taking picture:", error);
        Alert.alert("Error", `Failed to take photo: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    } finally {
      isCapturingRef.current = false;
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

  const handleFinish = async () => {
    if (!itemId || photos.length === 0) {
      // Navigate back based on context
      if (context === "inventory") {
        navigation.goBack();
      } else {
        navigation.reset({
          index: 0,
          routes: [
            { name: "CollectionDetail" as const, params: { collectionId: collectionId! } },
          ],
        });
      }
      return;
    }

    setIsSaving(true);
    const { user } = useAuthStore.getState();

    try {
      // Verify file URIs exist before saving
      console.log(`[CAMERA] Saving ${photos.length} photos for item ${itemId} (context: ${context})`);

      if (context === "inventory") {
        // Save to ItemPhoto table for inventory
        const database = SQLite.openDatabaseSync("inventory.db");

        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          console.log(`[CAMERA] Saving inventory photo ${i + 1}/${photos.length}: ${photo.uri}`);

          try {
            // Check if file exists before saving
            const fileInfo = await FileSystem.getInfoAsync(photo.uri);
            if (!fileInfo.exists) {
              console.error(`[CAMERA] Photo file does not exist: ${photo.uri}`);
              continue;
            }

            const photoUuid = `PHOTO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const timestamp = new Date().toISOString();

            await database.runAsync(
              `INSERT INTO ItemPhoto (uuid, item_id, uri, timestamp, latitude, longitude)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [photoUuid, Number(itemId), photo.uri, timestamp, photo.latitude || null, photo.longitude || null]
            );

            // Log to history
            await database.runAsync(
              `INSERT INTO ItemHistory (item_id, user_id, action_type, notes)
               VALUES (?, ?, 'PHOTO_ADDED', 'Photo added via camera')`,
              [Number(itemId), user?.id || null]
            );

            console.log(`[CAMERA] Successfully saved inventory photo ${i + 1}`);
          } catch (photoError) {
            console.error(`[CAMERA] Failed to save photo ${i + 1}:`, photoError);
          }
        }
      } else {
        // Save to CollectionItemPhoto table for collections
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          console.log(`[CAMERA] Saving collection photo ${i + 1}/${photos.length}: ${photo.uri}`);

          try {
            // Check if file exists before saving
            const fileInfo = await FileSystem.getInfoAsync(photo.uri);
            if (!fileInfo.exists) {
              console.error(`[CAMERA] Photo file does not exist: ${photo.uri}`);
              continue;
            }

            await addPhotoToCollectionItem(String(itemId), {
              uri: photo.uri,
              timestamp: photo.timestamp,
              conditionNotes: photo.conditionNotes,
              aiDetectedDamage: photo.aiDetectedDamage,
              aiAnalyzed: photo.aiAnalyzed,
              annotationData: photo.annotationData,
              annotatedImageUri: photo.annotatedImageUri,
              latitude: photo.latitude,
              longitude: photo.longitude,
              source: photo.source,
              isLocked: photo.isLocked,
            });

            console.log(`[CAMERA] Successfully saved collection photo ${i + 1}`);
          } catch (photoError) {
            console.error(`[CAMERA] Failed to save photo ${i + 1}:`, photoError);
          }
        }
      }

      console.log("[CAMERA] All photos saved, navigating back");

      // Navigate back based on context
      if (context === "inventory") {
        navigation.goBack();
      } else {
        navigation.reset({
          index: 0,
          routes: [
            { name: "CollectionDetail" as const, params: { collectionId: collectionId! } },
          ],
        });
      }
    } catch (error) {
      console.error("[CAMERA] Failed to save photos:", error);
      Alert.alert("Error", `Failed to save photos: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`);
    } finally {
      setIsSaving(false);
    }
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
            <View className="flex-row items-center justify-between mb-3">
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

              <Pressable
                onPress={() => navigation.navigate("Home" as any)}
                className="w-10 h-10 rounded-full bg-black/50 items-center justify-center active:bg-black/70"
              >
                <Ionicons name="home-outline" size={24} color="#FFFFFF" />
              </Pressable>
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
                  disabled={isSaving}
                  className={`rounded-full px-6 py-3 ${
                    isSaving ? "bg-green-500" : "bg-green-600 active:bg-green-700"
                  }`}
                >
                  {isSaving ? (
                    <View className="flex-row items-center">
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text className="text-white text-base font-semibold ml-2">Saving...</Text>
                    </View>
                  ) : (
                    <Text className="text-white text-base font-semibold">Done ({photos.length})</Text>
                  )}
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
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={() => setShowNoteModal(false)}
          />
          <View style={{ flex: 1, justifyContent: "flex-end" }}>
            <View className="bg-white rounded-t-3xl p-6" style={{ maxHeight: "70%", paddingBottom: insets.bottom + 24 }}>
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-xl font-bold text-gray-900">Add Condition Note</Text>
                <Pressable onPress={() => setShowNoteModal(false)} className="active:opacity-70">
                  <Ionicons name="close" size={28} color="#111827" />
                </Pressable>
              </View>

              {currentPhotoIndex !== null && photos[currentPhotoIndex] && (
                <View className="mb-4">
                  <Image
                    source={{ uri: photos[currentPhotoIndex].uri }}
                    style={{ width: "100%", height: 150 }}
                    className="rounded-xl"
                    resizeMode="cover"
                  />
                </View>
              )}

              <Text className="text-sm text-gray-600 mb-3">
                Describe any damage, wear, or notable features visible in this photo
              </Text>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 8 }}
              >
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
                  placeholder="e.g., Small scratch on upper left corner..."
                  placeholderTextColor="#9CA3AF"
                  value={noteText}
                  onChangeText={setNoteText}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={{ minHeight: 100 }}
                  autoFocus
                />
              </ScrollView>

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
