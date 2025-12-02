import React, { useRef, useState } from "react";
import { View, Text, Pressable, TextInput, Alert, ScrollView, Image } from "react-native";
import { useCollectionStore } from "../state/collectionStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/RootNavigator";
import { captureRef } from "react-native-view-shot";
import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSharedValue, runOnJS } from "react-native-reanimated";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "SignCollection">;
  route: RouteProp<RootStackParamList, "SignCollection">;
};

export default function SignCollectionScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { collectionId } = route.params;
  const signatureRef = useRef<View>(null);

  const collection = useCollectionStore((s) =>
    s.collections.find((c) => c.id === collectionId)
  );
  const signCollection = useCollectionStore((s) => s.signCollection);

  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState("");

  // Calculate total value
  const totalValue = collection?.items.reduce((sum, item) => {
    const valueInUSD = item.currency === "USD" ? item.estimatedValue :
                       item.currency === "EUR" ? item.estimatedValue * 1.1 :
                       item.estimatedValue * 1.25;
    return sum + valueInUSD;
  }, 0) || 0;

  // Use shared values for gesture handling
  const pathString = useSharedValue("");

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
      setPaths((prev) => [...prev, pathString.value]);
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
    setCurrentPath("");
    pathString.value = "";
  };

  const handleSign = async () => {
    if (paths.length === 0 && !currentPath) {
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

      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 20 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View className="bg-white rounded-2xl p-4 my-4">
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
            <Text className="text-gray-600">Total Photos:</Text>
            <Text className="text-gray-900 font-medium">
              {collection.items.reduce((sum, item) => sum + item.photos.length, 0)}
            </Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Total Value:</Text>
            <Text className="text-gray-900 font-semibold">
              USD {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
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

        <View className="bg-white rounded-2xl p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Items Collected</Text>
          {collection.items.map((item, index) => (
            <View key={item.id} className="mb-4 pb-4 border-b border-gray-100 last:border-b-0">
              <View className="flex-row mb-2">
                <View className="bg-blue-100 w-8 h-8 rounded-full items-center justify-center mr-3">
                  <Text className="text-blue-700 font-semibold">{index + 1}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900">{item.title}</Text>
                  {item.artistName && (
                    <Text className="text-sm text-gray-600">by {item.artistName}</Text>
                  )}
                </View>
              </View>

              <View className="ml-11">
                <Text className="text-sm text-gray-600 mb-1">
                  {item.dimensions.length} × {item.dimensions.width} × {item.dimensions.height} {item.dimensions.unit}
                </Text>
                <Text className="text-sm text-gray-600 mb-1">
                  Value: {item.currency} {item.estimatedValue.toLocaleString()}
                </Text>
                <View className="flex-row items-center mb-2">
                  <View
                    className={`px-2 py-1 rounded-md ${
                      item.overallCondition === "Excellent" ? "bg-green-100" :
                      item.overallCondition === "Good" ? "bg-blue-100" :
                      item.overallCondition === "Fair" ? "bg-yellow-100" : "bg-red-100"
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        item.overallCondition === "Excellent" ? "text-green-700" :
                        item.overallCondition === "Good" ? "text-blue-700" :
                        item.overallCondition === "Fair" ? "text-yellow-700" : "text-red-700"
                      }`}
                    >
                      {item.overallCondition}
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-500 ml-2">
                    {item.photos.length} photo{item.photos.length !== 1 ? "s" : ""}
                  </Text>
                </View>

                {item.photos.length > 0 && (
                  <View className="flex-row flex-wrap gap-1">
                    {item.photos.slice(0, 4).map((photo) => (
                      <Image
                        key={photo.id}
                        source={{ uri: photo.uri }}
                        style={{ width: 50, height: 50 }}
                        className="rounded-lg"
                      />
                    ))}
                    {item.photos.length > 4 && (
                      <View className="w-12 h-12 bg-gray-200 rounded-lg items-center justify-center">
                        <Text className="text-xs text-gray-600">+{item.photos.length - 4}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

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

        <View className="bg-white rounded-2xl p-4 mb-4">
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
            className="border-2 border-dashed border-gray-300 rounded-xl bg-white overflow-hidden"
            style={{ height: 200 }}
          >
            <GestureDetector gesture={pan}>
              <Canvas style={{ flex: 1 }}>
                {paths.map((pathString, index) => {
                  const path = Skia.Path.MakeFromSVGString(pathString);
                  return path ? (
                    <Path key={index} path={path} color="#000000" style="stroke" strokeWidth={3} />
                  ) : null;
                })}
                {currentPath && (() => {
                  const path = Skia.Path.MakeFromSVGString(currentPath);
                  return path ? (
                    <Path path={path} color="#000000" style="stroke" strokeWidth={3} />
                  ) : null;
                })()}
              </Canvas>
            </GestureDetector>
          </View>
        </View>
      </ScrollView>

      <View className="bg-white border-t border-gray-200 px-6 py-4" style={{ paddingBottom: insets.bottom + 16 }}>
        <Pressable
          onPress={handleSign}
          disabled={(paths.length === 0 && !currentPath) || !signerName.trim() || !signerRole.trim()}
          className={`rounded-xl py-4 items-center ${
            (paths.length > 0 || currentPath) && signerName.trim() && signerRole.trim()
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
