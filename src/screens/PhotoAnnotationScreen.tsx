import React, { useRef, useState, useEffect } from "react";
import { View, Text, Pressable, Alert, Dimensions, TextInput, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/RootNavigator";
import { Canvas, Path, Skia, Image as SkiaImage, useImage, makeImageFromView } from "@shopify/react-native-skia";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSharedValue, runOnJS } from "react-native-reanimated";
import * as FileSystem from "expo-file-system";
import { useCollectionStore } from "../state/collectionStore";
import { captureRef } from "react-native-view-shot";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "PhotoAnnotation">;
  route: RouteProp<RootStackParamList, "PhotoAnnotation">;
};

export default function PhotoAnnotationScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { itemId, photoId } = route.params;
  const canvasRef = useRef<any>(null);

  const item = useCollectionStore((s) => s.getItem(itemId));
  const updateItem = useCollectionStore((s) => s.updateItem);

  const photo = item?.photos.find((p) => p.id === photoId);
  const image = useImage(photo?.uri || "");

  const [paths, setPaths] = useState<Array<{ path: string; color: string; width: number; label?: string }>>([]);
  const [drawColor, setDrawColor] = useState("#FF0000");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [canvasSize, setCanvasSize] = useState({ width: Dimensions.get("window").width, height: 600 });
  const [showCustomTextModal, setShowCustomTextModal] = useState(false);
  const [customText, setCustomText] = useState("");
  const [pendingPath, setPendingPath] = useState<{ path: string; color: string; width: number } | null>(null);
  const [currentDrawing, setCurrentDrawing] = useState("");

  const currentPathString = useSharedValue("");

  const annotationTypes = [
    { name: "Damage", value: "#FF0000", label: "Damage" },
    { name: "Scratch", value: "#FFA500", label: "Scratch" },
    { name: "Missing Part", value: "#00FF00", label: "Missing" },
    { name: "Custom", value: "#0000FF", label: "Custom" },
  ];

  const strokeWidths = [2, 3, 5, 8];

  // Load existing annotations when screen opens
  useEffect(() => {
    if (photo?.annotationData) {
      try {
        const data = JSON.parse(photo.annotationData);
        if (data.paths && Array.isArray(data.paths)) {
          setPaths(data.paths);
        }
      } catch (error) {
        console.error("Error loading annotation data:", error);
      }
    }
  }, [photo?.annotationData]);

  if (!item || !photo) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Ionicons name="alert-circle-outline" size={64} color="#DC2626" />
        <Text className="text-gray-900 text-lg font-semibold mt-4">Photo not found</Text>
        <Pressable onPress={() => navigation.goBack()} className="mt-4">
          <Text className="text-blue-600 text-base">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const updateDrawing = (pathStr: string) => {
    setCurrentDrawing(pathStr);
  };

  const addPathToList = (newPath: { path: string; color: string; width: number; label?: string }) => {
    setPaths((prev) => [...prev, newPath]);
  };

  const pan = Gesture.Pan()
    .onStart((e) => {
      currentPathString.value = `M ${e.x} ${e.y}`;
      runOnJS(updateDrawing)(currentPathString.value);
    })
    .onUpdate((e) => {
      currentPathString.value = currentPathString.value + ` L ${e.x} ${e.y}`;
      runOnJS(updateDrawing)(currentPathString.value);
    })
    .onEnd(() => {
      if (currentPathString.value) {
        const newPath = { path: currentPathString.value, color: drawColor, width: strokeWidth };

        // If custom (blue) color is selected, show modal for text input
        if (drawColor === "#0000FF") {
          setPendingPath(newPath);
          setShowCustomTextModal(true);
        } else {
          // Add label based on color for non-custom annotations
          const label = annotationTypes.find(t => t.value === drawColor)?.label;
          runOnJS(addPathToList)({ ...newPath, label });
        }
        currentPathString.value = "";
        runOnJS(updateDrawing)("");
      }
    })
    .runOnJS(true);

  const handleSaveCustomText = () => {
    if (pendingPath && customText.trim()) {
      setPaths([...paths, { ...pendingPath, label: customText.trim() }]);
      setCustomText("");
      setPendingPath(null);
      setShowCustomTextModal(false);
    }
  };

  const handleCancelCustomText = () => {
    setCustomText("");
    setPendingPath(null);
    setShowCustomTextModal(false);
  };

  const clearAll = () => {
    setPaths([]);
    setCurrentDrawing("");
    currentPathString.value = "";
  };

  const undoLast = () => {
    if (paths.length > 0) {
      setPaths((prev) => prev.slice(0, -1));
    }
  };

  const handleSave = async () => {
    if (paths.length === 0) {
      Alert.alert("No Annotations", "Please draw on the photo before saving.");
      return;
    }

    try {
      // Capture the annotated image as a composite
      const annotatedImageUri = await captureRef(canvasRef, {
        format: "png",
        quality: 1,
      });

      // Save the annotation paths data so we can recreate them later
      const annotationData = {
        paths: paths,
        timestamp: Date.now(),
        canvasSize: canvasSize,
      };

      // Update the photo with both annotation data and the composite image
      const updatedPhotos = item.photos.map((p) =>
        p.id === photoId
          ? {
              ...p,
              annotationData: JSON.stringify(annotationData),
              annotatedImageUri: annotatedImageUri, // Save the composite
            }
          : p
      );

      updateItem(itemId, { photos: updatedPhotos });

      Alert.alert("Saved", "Annotations have been saved successfully!", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error("Error saving annotation:", error);
      Alert.alert("Error", "Failed to save annotation. Please try again.");
    }
  };

  return (
    <View className="flex-1 bg-black" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-black/90 px-6 py-4 border-b border-gray-700">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => navigation.goBack()} className="active:opacity-70">
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </Pressable>
          <Text className="text-white text-lg font-semibold">Annotate Photo</Text>
          <Pressable onPress={handleSave} className="active:opacity-70">
            <Ionicons name="checkmark" size={32} color="#10B981" />
          </Pressable>
        </View>
      </View>

      {/* Annotation Canvas */}
      <View
        className="flex-1"
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setCanvasSize({ width, height });
        }}
      >
        <GestureDetector gesture={pan}>
          <Canvas ref={canvasRef} style={{ flex: 1 }}>
            {image && (
              <SkiaImage
                image={image}
                fit="contain"
                x={0}
                y={0}
                width={canvasSize.width}
                height={canvasSize.height}
              />
            )}
            {paths.map((pathData, index) => {
              const path = Skia.Path.MakeFromSVGString(pathData.path);
              return path ? (
                <Path
                  key={index}
                  path={path}
                  color={pathData.color}
                  style="stroke"
                  strokeWidth={pathData.width}
                />
              ) : null;
            })}
            {currentDrawing && (() => {
              const path = Skia.Path.MakeFromSVGString(currentDrawing);
              return path ? (
                <Path path={path} color={drawColor} style="stroke" strokeWidth={strokeWidth} />
              ) : null;
            })()}
          </Canvas>
        </GestureDetector>
      </View>

      {/* Tools */}
      <View className="bg-black/90 px-6 py-4" style={{ paddingBottom: insets.bottom + 16 }}>
        {/* Annotation Type Picker */}
        <View className="mb-4">
          <Text className="text-white text-sm font-medium mb-2">Annotation Type</Text>
          <View className="flex-row justify-between">
            {annotationTypes.map((type) => (
              <Pressable
                key={type.value}
                onPress={() => setDrawColor(type.value)}
                className="flex-1 mx-1"
              >
                <View
                  className={`rounded-xl p-3 items-center ${
                    drawColor === type.value ? "border-2 border-white" : "border border-gray-600"
                  }`}
                  style={{ backgroundColor: type.value + "40" }}
                >
                  <View
                    className="w-8 h-8 rounded-full mb-1"
                    style={{ backgroundColor: type.value }}
                  />
                  <Text className="text-white text-xs font-medium text-center">{type.name}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Stroke Width */}
        <View className="mb-4">
          <Text className="text-white text-sm font-medium mb-2">Brush Size</Text>
          <View className="flex-row justify-between">
            {strokeWidths.map((width) => (
              <Pressable
                key={width}
                onPress={() => setStrokeWidth(width)}
                className={`px-4 py-2 rounded-lg ${
                  strokeWidth === width ? "bg-blue-600" : "bg-gray-700"
                }`}
              >
                <Text className="text-white text-sm font-medium">{width}px</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-row space-x-3">
          <Pressable
            onPress={undoLast}
            disabled={paths.length === 0}
            className={`flex-1 rounded-xl py-3 items-center ${
              paths.length > 0 ? "bg-orange-600 active:bg-orange-700" : "bg-gray-700"
            }`}
          >
            <View className="flex-row items-center">
              <Ionicons name="arrow-undo" size={20} color="#FFFFFF" />
              <Text className="text-white text-base font-semibold ml-2">Undo</Text>
            </View>
          </Pressable>
          <Pressable
            onPress={clearAll}
            disabled={paths.length === 0}
            className={`flex-1 rounded-xl py-3 items-center ${
              paths.length > 0 ? "bg-red-600 active:bg-red-700" : "bg-gray-700"
            }`}
          >
            <View className="flex-row items-center">
              <Ionicons name="trash" size={20} color="#FFFFFF" />
              <Text className="text-white text-base font-semibold ml-2">Clear</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* Custom Text Modal */}
      <Modal visible={showCustomTextModal} transparent animationType="fade">
        <Pressable
          className="flex-1 bg-black/70 justify-center items-center"
          onPress={handleCancelCustomText}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="bg-white rounded-3xl p-6 mx-6 w-80">
              <Text className="text-xl font-bold text-gray-900 mb-4">Custom Annotation</Text>
              <Text className="text-sm text-gray-600 mb-3">
                Enter a description for this annotation:
              </Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
                placeholder="e.g., Water damage, Dent, etc."
                placeholderTextColor="#9CA3AF"
                value={customText}
                onChangeText={setCustomText}
                autoFocus
              />
              <View className="flex-row gap-3">
                <Pressable
                  onPress={handleCancelCustomText}
                  className="flex-1 bg-gray-200 rounded-xl py-3 items-center active:bg-gray-300"
                >
                  <Text className="text-gray-700 text-base font-semibold">Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveCustomText}
                  disabled={!customText.trim()}
                  className={`flex-1 rounded-xl py-3 items-center ${
                    customText.trim() ? "bg-blue-600 active:bg-blue-700" : "bg-gray-300"
                  }`}
                >
                  <Text className="text-white text-base font-semibold">Save</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
