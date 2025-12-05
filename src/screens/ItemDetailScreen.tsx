import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, ScrollView, Image, TextInput, Modal, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system";
import { useAuthStore } from "../state/authStore";
import { useSettingsStore } from "../state/settingsStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/RootNavigator";
import { analyzeImageForDamage } from "../services/aiDamageDetection";
import Breadcrumb from "../components/Breadcrumb";
import PhotoViewerModal from "../components/PhotoViewerModal";
import { printItemLabel } from "../utils/zebraPrinter";
import { logNoteChange, logPhotoChange, formatPhotoDetails } from "../utils/itemHistoryLogger";
import {
  getCollectionItemByUuid,
  getCollectionByUuid,
  updateCollectionItemPhoto,
  deleteCollectionItemPhoto,
  addPhotoToCollectionItem
} from "../database/db-collections";
import type { CollectionItem, Collection, ItemPhoto } from "../types/collection";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "ItemDetail">;
  route: RouteProp<RootStackParamList, "ItemDetail">;
};

export default function ItemDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { itemId, collectionId } = route.params;

  // Auth state
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";

  // SQLite state
  const [item, setItem] = useState<CollectionItem | null>(null);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const aiEnabled = useSettingsStore((s) => s.settings.aiEnabled);

  // Printer settings - individual selectors to avoid infinite loop
  const printerEnabled = useSettingsStore((s) => s.settings.printerEnabled);
  const printerIp = useSettingsStore((s) => s.settings.printerIp);
  const printerPort = useSettingsStore((s) => s.settings.printerPort);
  const labelWidth = useSettingsStore((s) => s.settings.labelWidth);
  const labelHeight = useSettingsStore((s) => s.settings.labelHeight);
  const printerDpi = useSettingsStore((s) => s.settings.printerDpi);

  // UI state
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0);
  const [noteText, setNoteText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);

  // Permissions
  const [cameraPermission, requestCameraPermission] = ImagePicker.useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();

  // Permission checks
  const collectionIsLocked = collection?.status === "completed" || collection?.status === "signed";
  const canAddPhotos = !collectionIsLocked; // Can add photos anytime EXCEPT after signature
  const canEditNotes = true; // Notes can ALWAYS be edited (per requirements)

  // Load item and collection from SQLite
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [itemData, collectionData] = await Promise.all([
        getCollectionItemByUuid(itemId),
        getCollectionByUuid(collectionId),
      ]);
      setItem(itemData);
      setCollection(collectionData);
    } catch (error) {
      console.error("Failed to load data:", error);
      Alert.alert("Error", "Failed to load item details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [itemId, collectionId]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [itemId, collectionId])
  );

  // Check if user can delete a specific photo
  const canDeletePhoto = (photo: ItemPhoto): boolean => {
    if (collectionIsLocked) return false;
    if (isAdmin) return true; // Admin can delete anything
    return photo.source === "added_later" && !photo.isLocked; // Regular users can only delete unlocked added_later photos
  };

  const handlePrintLabel = async () => {
    if (!printerEnabled) {
      Alert.alert(
        "Printer Not Configured",
        "Please enable and configure the Zebra printer in Settings first.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Go to Settings", onPress: () => navigation.navigate("Settings") },
        ]
      );
      return;
    }

    if (!printerIp) {
      Alert.alert(
        "Printer IP Required",
        "Please set the printer IP address in Settings.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Go to Settings", onPress: () => navigation.navigate("Settings") },
        ]
      );
      return;
    }

    setIsPrinting(true);
    const success = await printItemLabel(
      item!,
      collectionId,
      printerIp,
      printerPort,
      labelWidth,
      labelHeight,
      printerDpi
    );
    setIsPrinting(false);

    if (success) {
      Alert.alert("Label Printed", `Label for "${item!.title}" has been sent to the printer.`);
    }
  };

  const openPhotoViewer = (index: number) => {
    setPhotoViewerIndex(index);
    setShowPhotoViewer(true);
  };

  const openNoteModal = (index: number) => {
    setSelectedPhotoIndex(index);
    setNoteText(item!.photos[index].conditionNotes || "");
    setShowNoteModal(true);
  };

  const saveNote = async () => {
    if (selectedPhotoIndex !== null && item) {
      const photo = item.photos[selectedPhotoIndex];
      try {
        await updateCollectionItemPhoto(photo.id, {
          conditionNotes: noteText.trim(),
        });

        // Log to ItemHistory
        const action = photo.conditionNotes ? "NOTE_EDITED" : "NOTE_ADDED";
        await logNoteChange(itemId, user?.id || null, action, photo.id, noteText.trim());

        await loadData();
      } catch (error) {
        console.error("Failed to save note:", error);
        Alert.alert("Error", "Failed to save note");
      }
    }
    setShowNoteModal(false);
    setNoteText("");
    setSelectedPhotoIndex(null);
  };

  const deleteNote = async () => {
    if (selectedPhotoIndex !== null && item) {
      const photo = item.photos[selectedPhotoIndex];

      Alert.alert(
        "Delete Note",
        "Are you sure you want to delete this note?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await updateCollectionItemPhoto(photo.id, {
                  conditionNotes: undefined,
                });

                // Log to ItemHistory
                await logNoteChange(itemId, user?.id || null, "NOTE_DELETED", photo.id);

                await loadData();
                setShowNoteModal(false);
                setNoteText("");
                setSelectedPhotoIndex(null);
              } catch (error) {
                console.error("Failed to delete note:", error);
                Alert.alert("Error", "Failed to delete note");
              }
            },
          },
        ]
      );
    }
  };

  const analyzeWithAI = async () => {
    if (selectedPhotoIndex === null) return;

    setIsAnalyzing(true);
    try {
      const photo = item!.photos[selectedPhotoIndex];
      const result = await analyzeImageForDamage(photo.uri);

      if (result) {
        const currentNote = noteText.trim();
        if (currentNote) {
          setNoteText(`${currentNote}\n\n[AI Analysis]\n${result}`);
        } else {
          setNoteText(`[AI Analysis]\n${result}`);
        }
      }
    } catch (error) {
      console.error("AI analysis failed:", error);
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

  const handleDeletePhoto = async (photoId: string) => {
    const photo = item!.photos.find((p) => p.id === photoId);
    if (!photo) return;

    if (!canDeletePhoto(photo)) {
      Alert.alert(
        "Cannot Delete",
        photo.isLocked
          ? "This photo was taken during collection and is locked. Only administrators can delete it."
          : "Collection is locked. No photos can be deleted.",
        [{ text: "OK" }]
      );
      return;
    }

    Alert.alert(
      "Delete Photo",
      `Are you sure you want to delete this photo${photo.source === "collection_flow" ? " (from collection)" : ""}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCollectionItemPhoto(photo.id);

              // Log to ItemHistory
              const details = formatPhotoDetails(
                photo.source,
                !!(photo.latitude && photo.longitude),
                !!photo.conditionNotes
              );
              await logPhotoChange(itemId, user?.id || null, "PHOTO_DELETED", details);

              await loadData();
              setShowPhotoViewer(false);
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

  const addPhotoFromCamera = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert("Permission Required", "Camera permission is required to take photos");
        return;
      }
    }

    if (!locationPermission?.granted) {
      await requestLocationPermission();
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        await processAndAddPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Failed to take photo:", error);
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const addPhotoFromGallery = async () => {
    if (!mediaPermission?.granted) {
      const result = await requestMediaPermission();
      if (!result.granted) {
        Alert.alert("Permission Required", "Media library permission is required to select photos");
        return;
      }
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
        allowsMultipleSelection: true,
      });

      if (!result.canceled) {
        for (const asset of result.assets) {
          await processAndAddPhoto(asset.uri);
        }
      }
    } catch (error) {
      console.error("Failed to select photo:", error);
      Alert.alert("Error", "Failed to select photo");
    }
  };

  const processAndAddPhoto = async (sourceUri: string) => {
    setIsAddingPhoto(true);
    try {
      // Capture GPS if permission granted
      let latitude: number | undefined;
      let longitude: number | undefined;

      if (locationPermission?.granted) {
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          latitude = location.coords.latitude;
          longitude = location.coords.longitude;
        } catch (locationError) {
          console.log("Failed to get GPS:", locationError);
        }
      }

      // Copy to permanent storage
      const photoId = `PHOTO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const permanentUri = `${FileSystem.documentDirectory}${photoId}.jpg`;

      await FileSystem.copyAsync({
        from: sourceUri,
        to: permanentUri,
      });

      // Add to database
      await addPhotoToCollectionItem(itemId, {
        uri: permanentUri,
        timestamp: Date.now(),
        latitude,
        longitude,
        source: "added_later",
        isLocked: false, // Photos added later can be deleted by users
        aiAnalyzed: false,
      });

      // Log to ItemHistory
      const details = formatPhotoDetails("added_later", !!(latitude && longitude), false);
      await logPhotoChange(itemId, user?.id || null, "PHOTO_ADDED", details);

      await loadData();
      Alert.alert("Success", "Photo added successfully");
    } catch (error) {
      console.error("Failed to add photo:", error);
      Alert.alert("Error", "Failed to add photo");
    } finally {
      setIsAddingPhoto(false);
    }
  };

  const showAddPhotoOptions = () => {
    Alert.alert(
      "Add Photo",
      "Choose a source for the photo",
      [
        {
          text: "Take Photo",
          onPress: addPhotoFromCamera,
        },
        {
          text: "Choose from Library",
          onPress: addPhotoFromGallery,
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="text-gray-600 text-base mt-4">Loading item...</Text>
      </View>
    );
  }

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

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <Pressable onPress={() => navigation.goBack()} className="mr-4 active:opacity-70">
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900">{item.title}</Text>
              <Text className="text-sm text-gray-500">{item.displayId}</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={handlePrintLabel}
              disabled={isPrinting}
              className="w-10 h-10 items-center justify-center active:opacity-70"
            >
              <Ionicons
                name={isPrinting ? "hourglass-outline" : "barcode-outline"}
                size={28}
                color={isPrinting ? "#9CA3AF" : "#2563EB"}
              />
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("Home" as any)}
              className="w-10 h-10 items-center justify-center active:opacity-70"
            >
              <Ionicons name="home-outline" size={24} color="#2563EB" />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Home", screen: "Customers" },
          { label: collection?.customerName || "Customer", screen: "CollectionDetail", params: { collectionId } },
          { label: item.title },
        ]}
      />

      {/* Lock Banner */}
      {collectionIsLocked && (
        <View className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex-row items-center">
          <Ionicons name="lock-closed" size={18} color="#D97706" />
          <Text className="text-amber-800 text-sm font-medium ml-2 flex-1">
            Collection is locked - Limited editing allowed
          </Text>
        </View>
      )}

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Photos Section */}
        <View className="bg-white rounded-2xl p-4 mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-semibold text-gray-900">
              Photos ({item.photos.length})
            </Text>
            <View className="flex-row gap-2">
              {canAddPhotos && (
                <Pressable
                  onPress={showAddPhotoOptions}
                  disabled={isAddingPhoto}
                  className="bg-blue-600 rounded-lg px-3 py-2 active:bg-blue-700"
                >
                  {isAddingPhoto ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <View className="flex-row items-center">
                      <Ionicons name="add" size={18} color="#FFFFFF" />
                      <Text className="text-white text-sm font-semibold ml-1">Add</Text>
                    </View>
                  )}
                </Pressable>
              )}
              {item.photos.length > 0 && (
                <Pressable
                  onPress={() => openPhotoViewer(0)}
                  className="bg-purple-600 rounded-lg px-3 py-2 active:bg-purple-700"
                >
                  <View className="flex-row items-center">
                    <Ionicons name="images-outline" size={18} color="#FFFFFF" />
                    <Text className="text-white text-sm font-semibold ml-1">View All</Text>
                  </View>
                </Pressable>
              )}
            </View>
          </View>

          {item.photos.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {item.photos.map((photo, index) => (
                <Pressable
                  key={photo.id}
                  onPress={() => openPhotoViewer(index)}
                  className="relative"
                >
                  <Image
                    source={{ uri: photo.annotatedImageUri || photo.uri }}
                    style={{ width: 100, height: 100 }}
                    className="rounded-xl"
                  />

                  {/* Photo badges */}
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
                  {photo.latitude && photo.longitude && (
                    <View className="absolute bottom-2 right-2 w-5 h-5 bg-green-600 rounded-full items-center justify-center">
                      <Ionicons name="location" size={12} color="#FFFFFF" />
                    </View>
                  )}
                  {photo.source === "added_later" && (
                    <View className="absolute bottom-2 left-2 bg-purple-600 rounded px-1.5 py-0.5">
                      <Text className="text-white text-xs font-semibold">+</Text>
                    </View>
                  )}

                  <View className="absolute bottom-1 left-1 bg-black/60 px-2 py-1 rounded">
                    <Text className="text-white text-xs">{index + 1}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <View className="items-center py-8">
              <Ionicons name="images-outline" size={48} color="#D1D5DB" />
              <Text className="text-gray-400 text-center mt-2">No photos yet</Text>
              {canAddPhotos && (
                <Pressable
                  onPress={showAddPhotoOptions}
                  className="bg-blue-600 rounded-lg px-4 py-2 mt-3 active:bg-blue-700"
                >
                  <Text className="text-white text-sm font-semibold">Add First Photo</Text>
                </Pressable>
              )}
            </View>
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
                <Pressable
                  key={photo.id}
                  onPress={() => openNoteModal(index)}
                  className="mb-3 pb-3 border-b border-gray-100 last:border-b-0 active:bg-gray-50 rounded-lg p-2"
                >
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-sm text-gray-500">Photo {index + 1}</Text>
                    {canEditNotes && (
                      <Ionicons name="create-outline" size={16} color="#3B82F6" />
                    )}
                  </View>
                  <Text className="text-base text-gray-900">{photo.conditionNotes}</Text>
                </Pressable>
              ) : null
            )}
          </View>
        )}
      </ScrollView>

      {/* Photo Viewer Modal */}
      {item.photos.length > 0 && (
        <PhotoViewerModal
          visible={showPhotoViewer}
          photos={item.photos}
          initialIndex={photoViewerIndex}
          onClose={() => setShowPhotoViewer(false)}
          onEdit={(photoId) => {
            const index = item.photos.findIndex((p) => p.id === photoId);
            if (index !== -1) {
              setShowPhotoViewer(false);
              openNoteModal(index);
            }
          }}
          onDelete={handleDeletePhoto}
          canEdit={canEditNotes}
          canDelete={true} // Permission check is done in handleDeletePhoto
        />
      )}

      {/* Note Edit Modal */}
      <Modal visible={showNoteModal} animationType="slide" transparent={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 bg-white"
          style={{ paddingTop: insets.top }}
        >
          {/* Header */}
          <View className="bg-white px-6 py-4 border-b border-gray-200">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <Pressable
                  onPress={() => {
                    if (!isAnalyzing) {
                      setShowNoteModal(false);
                    }
                  }}
                  className="mr-4 active:opacity-70"
                  disabled={isAnalyzing}
                >
                  <Ionicons name="close" size={28} color={isAnalyzing ? "#9CA3AF" : "#111827"} />
                </Pressable>
                <Text className="text-2xl font-bold text-gray-900">
                  Photo {selectedPhotoIndex !== null ? selectedPhotoIndex + 1 : ""} Note
                </Text>
              </View>
              <Pressable
                onPress={() => navigation.navigate("Customers")}
                className="ml-2 active:opacity-70"
                disabled={isAnalyzing}
              >
                <Ionicons name="home-outline" size={24} color={isAnalyzing ? "#9CA3AF" : "#2563EB"} />
              </Pressable>
            </View>
          </View>

          {/* Lock Banner */}
          {collectionIsLocked && (
            <View className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex-row items-center">
              <Ionicons name="lock-closed" size={18} color="#D97706" />
              <Text className="text-amber-800 text-sm font-medium ml-2 flex-1">
                Collection is locked - Notes can still be edited
              </Text>
            </View>
          )}

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 24 }}
            keyboardShouldPersistTaps="handled"
          >
            {selectedPhotoIndex !== null && item.photos[selectedPhotoIndex] && (
              <View className="mb-6">
                <Image
                  source={{
                    uri: item.photos[selectedPhotoIndex].annotatedImageUri ||
                         item.photos[selectedPhotoIndex].uri
                  }}
                  style={{ width: "100%", height: 300 }}
                  className="rounded-2xl mb-3"
                  resizeMode="contain"
                />
                {item.photos[selectedPhotoIndex].annotationData && (
                  <View className="bg-orange-50 rounded-xl p-3 mb-3 flex-row items-center">
                    <Ionicons name="brush" size={16} color="#EA580C" />
                    <Text className="text-sm text-orange-700 font-medium ml-2">
                      This photo has annotations
                    </Text>
                  </View>
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
              disabled={isAnalyzing || collectionIsLocked}
              className={`flex-row items-center justify-center bg-orange-600 rounded-xl py-4 mb-4 ${
                isAnalyzing || collectionIsLocked ? "opacity-50" : "active:bg-orange-700"
              }`}
            >
              <Ionicons name="brush" size={20} color="#FFFFFF" />
              <Text className="text-white text-lg font-semibold ml-2">
                {collectionIsLocked ? "Locked - Cannot Annotate" : "Annotate Photo"}
              </Text>
            </Pressable>

            {aiEnabled && (
              <Pressable
                onPress={analyzeWithAI}
                disabled={isAnalyzing}
                className={`flex-row items-center justify-center border-2 border-blue-600 rounded-xl py-4 mb-4 ${
                  isAnalyzing ? "opacity-50" : "active:bg-blue-50"
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <ActivityIndicator size="small" color="#2563EB" />
                    <Text className="text-blue-600 text-lg font-semibold ml-2">Analyzing with AI...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={20} color="#2563EB" />
                    <Text className="text-blue-600 text-lg font-semibold ml-2">Analyze with AI</Text>
                  </>
                )}
              </Pressable>
            )}

            <Text className="text-base text-gray-600 mb-3 leading-6">
              Describe any damage, wear, or notable features visible in this photo.
            </Text>

            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900 mb-2"
              placeholder="e.g., Small scratch on upper left corner, approximately 2 inches long..."
              placeholderTextColor="#9CA3AF"
              value={noteText}
              onChangeText={setNoteText}
              multiline
              numberOfLines={10}
              textAlignVertical="top"
              style={{ minHeight: 200 }}
              editable={!isAnalyzing}
              maxLength={1000}
            />
            <Text className="text-sm text-gray-400 text-right mb-6">
              {noteText.length}/1000 characters
            </Text>

            {/* Delete Note Button */}
            {noteText.trim().length > 0 && canEditNotes && (
              <Pressable
                onPress={deleteNote}
                disabled={isAnalyzing}
                className={`flex-row items-center justify-center border-2 border-red-600 rounded-xl py-3 mb-4 ${
                  isAnalyzing ? "opacity-50" : "active:bg-red-50"
                }`}
              >
                <Ionicons name="trash-outline" size={20} color="#DC2626" />
                <Text className="text-red-600 text-base font-semibold ml-2">Delete Note</Text>
              </Pressable>
            )}
          </ScrollView>

          {/* Fixed Footer */}
          <View
            className="px-6 py-4 border-t border-gray-200 bg-white"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <Pressable
              onPress={saveNote}
              disabled={isAnalyzing}
              className={`rounded-xl py-4 items-center ${
                isAnalyzing ? "bg-gray-300" : "bg-blue-600 active:bg-blue-700"
              }`}
            >
              <Text className="text-white text-lg font-semibold">Save Note</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
