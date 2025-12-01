import React, { useRef, useState } from "react";
import { View, Text, Pressable, TextInput, Alert } from "react-native";
import { useCollectionStore } from "../state/collectionStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/RootNavigator";
import { captureRef } from "react-native-view-shot";
import { Canvas, Path, Skia, SkPath } from "@shopify/react-native-skia";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "SignCollection">;
  route: RouteProp<RootStackParamList, "SignCollection">;
};

interface PathData {
  path: SkPath;
  color: string;
}

export default function SignCollectionScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { collectionId } = route.params;
  const signatureRef = useRef<View>(null);

  const collection = useCollectionStore((s) =>
    s.collections.find((c) => c.id === collectionId)
  );
  const signCollection = useCollectionStore((s) => s.signCollection);

  const [paths, setPaths] = useState<PathData[]>([]);
  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState("");

  const pan = Gesture.Pan()
    .onStart((e) => {
      const newPath = Skia.Path.Make();
      newPath.moveTo(e.x, e.y);
      setPaths((prev) => [...prev, { path: newPath, color: "#000000" }]);
    })
    .onUpdate((e) => {
      setPaths((prev) => {
        const currentPath = prev[prev.length - 1];
        if (currentPath) {
          const updatedPath = currentPath.path.copy();
          updatedPath.lineTo(e.x, e.y);
          const updatedPaths = [...prev];
          updatedPaths[updatedPaths.length - 1] = { ...currentPath, path: updatedPath };
          return updatedPaths;
        }
        return prev;
      });
    });

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

  const clearSignature = () => {
    setPaths([]);
  };

  const handleSign = async () => {
    if (paths.length === 0) {
      Alert.alert("No Signature", "Please provide a signature before submitting.");
      return;
    }

    if (!signerName.trim()) {
      Alert.alert("Name Required", "Please enter the signer name.");
      return;
    }

    if (!signerRole.trim()) {
      Alert.alert("Role Required", "Please enter the signer role.");
      return;
    }

    try {
      // Capture signature as image
      const uri = await captureRef(signatureRef, {
        format: "png",
        quality: 1,
      });

      signCollection(collectionId, {
        signatureUri: uri,
        signerName: signerName.trim(),
        signerRole: signerRole.trim(),
        timestamp: Date.now(),
      });

      Alert.alert(
        "Collection Signed",
        "The collection has been successfully signed and completed.",
        [
          {
            text: "OK",
            onPress: () => navigation.navigate("CollectionDetail", { collectionId }),
          },
        ]
      );
    } catch (error) {
      console.error("Error capturing signature:", error);
      Alert.alert("Error", "Failed to capture signature. Please try again.");
    }
  };

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <View className="flex-row items-center">
          <Pressable onPress={() => navigation.goBack()} className="mr-4 active:opacity-70">
            <Ionicons name="close" size={28} color="#111827" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900">Sign Collection</Text>
            <Text className="text-sm text-gray-500">{collection.customerName}</Text>
          </View>
        </View>
      </View>

      <View className="flex-1 p-6">
        {/* Collection Summary */}
        <View className="bg-white rounded-2xl p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Collection Summary</Text>
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Collection ID:</Text>
            <Text className="text-gray-900 font-medium">{collection.id}</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Total Items:</Text>
            <Text className="text-gray-900 font-medium">{collection.items.length}</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Collector:</Text>
            <Text className="text-gray-900 font-medium">{collection.employeeName}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-600">Date:</Text>
            <Text className="text-gray-900 font-medium">
              {new Date(collection.collectionDate).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Signer Information */}
        <View className="bg-white rounded-2xl p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Signer Information</Text>

          <Text className="text-sm font-medium text-gray-700 mb-2">Full Name *</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
            placeholder="Enter your full name"
            placeholderTextColor="#9CA3AF"
            value={signerName}
            onChangeText={setSignerName}
          />

          <Text className="text-sm font-medium text-gray-700 mb-2">Role/Title *</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
            placeholder="e.g., Owner, Manager, Authorized Representative"
            placeholderTextColor="#9CA3AF"
            value={signerRole}
            onChangeText={setSignerRole}
          />
        </View>

        {/* Signature Pad */}
        <View className="bg-white rounded-2xl p-4 mb-4 flex-1">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-semibold text-gray-900">Signature *</Text>
            <Pressable onPress={clearSignature} className="active:opacity-70">
              <Text className="text-blue-600 text-sm font-medium">Clear</Text>
            </Pressable>
          </View>

          <Text className="text-sm text-gray-600 mb-3">
            Sign below to confirm the condition of all items
          </Text>

          <View
            ref={signatureRef}
            className="flex-1 border-2 border-dashed border-gray-300 rounded-xl bg-white overflow-hidden"
            style={{ minHeight: 200 }}
          >
            <GestureDetector gesture={pan}>
              <Canvas style={{ flex: 1 }}>
                {paths.map((p, index) => (
                  <Path key={index} path={p.path} color={p.color} style="stroke" strokeWidth={3} />
                ))}
              </Canvas>
            </GestureDetector>
          </View>
        </View>
      </View>

      {/* Submit Button */}
      <View className="bg-white border-t border-gray-200 px-6 py-4" style={{ paddingBottom: insets.bottom + 16 }}>
        <Pressable
          onPress={handleSign}
          disabled={paths.length === 0 || !signerName.trim() || !signerRole.trim()}
          className={`rounded-xl py-4 items-center ${
            paths.length > 0 && signerName.trim() && signerRole.trim()
              ? "bg-green-600 active:bg-green-700"
              : "bg-gray-300"
          }`}
        >
          <Text className="text-white text-lg font-semibold">Complete & Sign</Text>
        </Pressable>
      </View>
    </View>
  );
}
