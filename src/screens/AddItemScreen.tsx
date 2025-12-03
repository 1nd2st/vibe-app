import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useCollectionStore } from "../state/collectionStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/RootNavigator";
import type { ItemDimensions } from "../types/collection";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "AddItem">;
  route: RouteProp<RootStackParamList, "AddItem">;
};

export default function AddItemScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { collectionId } = route.params;
  const addItem = useCollectionStore((s) => s.addItem);
  const collection = useCollectionStore((s) =>
    s.collections.find((c) => c.id === collectionId)
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [artistName, setArtistName] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [unit, setUnit] = useState<"cm" | "in">("cm");
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [currency, setCurrency] = useState<"USD" | "EUR" | "GBP">("USD");
  const [condition, setCondition] = useState<"Excellent" | "Good" | "Fair" | "Poor" | "Damaged">("Good");
  const [conditionNotes, setConditionNotes] = useState("");

  const handleContinueToPhotos = () => {
    if (!title.trim()) {
      return;
    }

    const dimensions: ItemDimensions = {
      length: length ? parseFloat(length) : 0,
      width: width ? parseFloat(width) : 0,
      height: height ? parseFloat(height) : 0,
      unit,
      weight: weight ? parseFloat(weight) : undefined,
      weightUnit: weight ? weightUnit : undefined,
    };

    const itemId = addItem(collectionId, {
      title: title.trim(),
      description: description.trim(),
      artistName: artistName.trim() || undefined,
      dimensions,
      estimatedValue: estimatedValue ? parseFloat(estimatedValue) : 0,
      currency,
      photos: [],
      overallCondition: condition,
      conditionNotes: conditionNotes.trim(),
    });

    navigation.navigate("Camera", { collectionId, itemId });
  };

  const canContinue = title.trim().length > 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-gray-50"
      style={{ paddingTop: insets.top }}
    >
      <View className="bg-white px-6 py-4 border-b border-gray-200 flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <Pressable onPress={() => navigation.goBack()} className="mr-4 active:opacity-70">
            <Ionicons name="close" size={28} color="#111827" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900">Add Item</Text>
          </View>
        </View>
        <Pressable
          onPress={() => navigation.navigate("Customers")}
          className="ml-2 active:opacity-70"
        >
          <Ionicons name="home-outline" size={24} color="#2563EB" />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        {/* Basic Information */}
        <View className="bg-white rounded-2xl p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">Basic Information</Text>

          <Text className="text-sm font-medium text-gray-700 mb-2">Item Title *</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
            placeholder="e.g., Oil Painting, Sculpture"
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
          />

          <Text className="text-sm font-medium text-gray-700 mb-2">Description</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
            placeholder="Detailed description"
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <Text className="text-sm font-medium text-gray-700 mb-2">Artist Name</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
            placeholder="Artist or creator name"
            placeholderTextColor="#9CA3AF"
            value={artistName}
            onChangeText={setArtistName}
          />
        </View>

        {/* Dimensions */}
        <View className="bg-white rounded-2xl p-4 mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-gray-900">Dimensions</Text>
            <View className="flex-row bg-gray-100 rounded-lg p-1">
              <Pressable
                onPress={() => setUnit("cm")}
                className={`px-3 py-1.5 rounded ${unit === "cm" ? "bg-white" : ""}`}
              >
                <Text className={`text-sm font-medium ${unit === "cm" ? "text-blue-600" : "text-gray-600"}`}>
                  cm
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setUnit("in")}
                className={`px-3 py-1.5 rounded ${unit === "in" ? "bg-white" : ""}`}
              >
                <Text className={`text-sm font-medium ${unit === "in" ? "text-blue-600" : "text-gray-600"}`}>
                  in
                </Text>
              </Pressable>
            </View>
          </View>

          <View className="flex-row space-x-3 mb-4">
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-2">Length</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                value={length}
                onChangeText={setLength}
                keyboardType="decimal-pad"
              />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-2">Width</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                value={width}
                onChangeText={setWidth}
                keyboardType="decimal-pad"
              />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-2">Height</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                value={height}
                onChangeText={setHeight}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View className="flex-row items-end space-x-3">
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-2">Weight (Optional)</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
              />
            </View>
            <View className="flex-row bg-gray-100 rounded-lg p-1 mb-3">
              <Pressable
                onPress={() => setWeightUnit("kg")}
                className={`px-3 py-1.5 rounded ${weightUnit === "kg" ? "bg-white" : ""}`}
              >
                <Text className={`text-sm font-medium ${weightUnit === "kg" ? "text-blue-600" : "text-gray-600"}`}>
                  kg
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setWeightUnit("lb")}
                className={`px-3 py-1.5 rounded ${weightUnit === "lb" ? "bg-white" : ""}`}
              >
                <Text className={`text-sm font-medium ${weightUnit === "lb" ? "text-blue-600" : "text-gray-600"}`}>
                  lb
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Value & Condition */}
        <View className="bg-white rounded-2xl p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">Value & Condition</Text>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Estimated Value</Text>
            <View className="flex-row items-center gap-2">
              <View className="flex-1">
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                  value={estimatedValue}
                  onChangeText={setEstimatedValue}
                  keyboardType="decimal-pad"
                />
              </View>
              <View className="flex-row bg-gray-100 rounded-lg p-1">
                <Pressable
                  onPress={() => setCurrency("USD")}
                  className={`px-3 py-2 rounded ${currency === "USD" ? "bg-white" : ""}`}
                >
                  <Text className={`text-sm font-medium ${currency === "USD" ? "text-blue-600" : "text-gray-600"}`}>
                    USD
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setCurrency("EUR")}
                  className={`px-3 py-2 rounded ${currency === "EUR" ? "bg-white" : ""}`}
                >
                  <Text className={`text-sm font-medium ${currency === "EUR" ? "text-blue-600" : "text-gray-600"}`}>
                    EUR
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setCurrency("GBP")}
                  className={`px-3 py-2 rounded ${currency === "GBP" ? "bg-white" : ""}`}
                >
                  <Text className={`text-sm font-medium ${currency === "GBP" ? "text-blue-600" : "text-gray-600"}`}>
                    GBP
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          <Text className="text-sm font-medium text-gray-700 mb-2">Condition</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {(["Excellent", "Good", "Fair", "Poor", "Damaged"] as const).map((c) => (
              <Pressable
                key={c}
                onPress={() => setCondition(c)}
                className={`px-4 py-2 rounded-xl ${
                  condition === c ? "bg-blue-600" : "bg-gray-100"
                }`}
              >
                <Text className={`text-sm font-medium ${condition === c ? "text-white" : "text-gray-700"}`}>
                  {c}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text className="text-sm font-medium text-gray-700 mb-2">Condition Notes</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
            placeholder="Describe any damage or notable features"
            placeholderTextColor="#9CA3AF"
            value={conditionNotes}
            onChangeText={setConditionNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <Text className="text-xs text-gray-500 text-center mb-4">
          You will take photos in the next step
        </Text>
      </ScrollView>

      <View className="bg-white border-t border-gray-200 px-6 py-4" style={{ paddingBottom: insets.bottom + 16 }}>
        <Pressable
          onPress={handleContinueToPhotos}
          disabled={!canContinue}
          className={`rounded-xl py-4 items-center ${
            canContinue ? "bg-blue-600 active:bg-blue-700" : "bg-gray-300"
          }`}
        >
          <Text className="text-white text-lg font-semibold">Continue to Photos</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
