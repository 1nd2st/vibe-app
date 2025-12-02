import React, { useRef, useState, useEffect } from "react";
import { View, Text, Pressable, Alert, Dimensions } from "react-native";
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

  const [paths, setPaths] = useState<Array<{ path: string; color: string; width: number }>>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [drawColor, setDrawColor] = useState("#FF0000");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [canvasSize, setCanvasSize] = useState({ width: Dimensions.get("window").width, height: 600 });

  const pathString = useSharedValue("");
  const currentColor = useSharedValue("#FF0000");
  const currentStrokeWidth = useSharedValue(3);

  // Update shared values when state changes
  useEffect(() => {
    currentColor.value = drawColor;
  }, [drawColor]);

  useEffect(() => {
    currentStrokeWidth.value = strokeWidth;
  }, [strokeWidth]);

  const colors = [
    { name: "Red", value: "#FF0000" },
    { name: "Yellow", value: "#FFFF00" },
    { name: "Green", value: "#00FF00" },
    { name: "Blue", value: "#0000FF" },
    { name: "White", value: "#FFFFFF" },
    { name: "Black", value: "#000000" },
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

  const startPath = (x: number, y: number) => {
    setCurrentPath(`M ${x} ${y}`);
    pathString.value = `M ${x} ${y}`;
  };

  const addToPath = (x: number, y: number) => {
    const newPath = pathString.value + ` L ${x} ${y}`;
    pathString.value = newPath;
    setCurrentPath(newPath);
  };

  const finishPath = () => {
    if (pathString.value) {
      const color = currentColor.value;
      const width = currentStrokeWidth.value;
      setPaths((prev) => [...prev, { path: pathString.value, color, width }]);
    }
    setCurrentPath("");
    pathString.value = "";
  };

  const pan = Gesture.Pan()
    .onBegin((e) => {
      runOnJS(startPath)(e.x, e.y);
    })
    .onUpdate((e) => {
      runOnJS(addToPath)(e.x, e.y);
    })
    .onEnd(() => {
      runOnJS(finishPath)();
    });

  const clearAll = () => {
    setPaths([]);
    setCurrentPath("");
    pathString.value = "";
  };

  const undoLast = () => {
    if (paths.length > 0) {
      setPaths((prev) => prev.slice(0, -1));
    }
  };

  const handleSave = async () => {
    if (paths.length === 0 && !currentPath) {
      Alert.alert("No Annotations", "Please draw on the photo before saving.");
      return;
    }

    try {
      // Save the annotation paths data so we can recreate them later
      const annotationData = {
        paths: paths,
        timestamp: Date.now(),
        canvasSize: canvasSize,
      };

      // Update the photo with annotation data
      const updatedPhotos = item.photos.map((p) =>
        p.id === photoId
          ? { ...p, annotationData: JSON.stringify(annotationData) }
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
            {currentPath && (() => {
              const path = Skia.Path.MakeFromSVGString(currentPath);
              return path ? (
                <Path path={path} color={drawColor} style="stroke" strokeWidth={strokeWidth} />
              ) : null;
            })()}
          </Canvas>
        </GestureDetector>
      </View>

      {/* Tools */}
      <View className="bg-black/90 px-6 py-4" style={{ paddingBottom: insets.bottom + 16 }}>
        {/* Color Picker */}
        <View className="mb-4">
          <Text className="text-white text-sm font-medium mb-2">Color</Text>
          <View className="flex-row justify-between">
            {colors.map((color) => (
              <Pressable
                key={color.value}
                onPress={() => setDrawColor(color.value)}
                className={`w-12 h-12 rounded-full items-center justify-center ${
                  drawColor === color.value ? "border-4 border-white" : "border-2 border-gray-600"
                }`}
                style={{ backgroundColor: color.value }}
              />
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
            disabled={paths.length === 0 && !currentPath}
            className={`flex-1 rounded-xl py-3 items-center ${
              paths.length > 0 || currentPath ? "bg-red-600 active:bg-red-700" : "bg-gray-700"
            }`}
          >
            <View className="flex-row items-center">
              <Ionicons name="trash" size={20} color="#FFFFFF" />
              <Text className="text-white text-base font-semibold ml-2">Clear</Text>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
