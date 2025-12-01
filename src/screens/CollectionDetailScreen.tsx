import React from "react";
import { View, Text, FlatList, Pressable, Alert } from "react-native";
import { useCollectionStore } from "../state/collectionStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/RootNavigator";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "CollectionDetail">;
  route: RouteProp<RootStackParamList, "CollectionDetail">;
};

export default function CollectionDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { collectionId } = route.params;

  const collection = useCollectionStore((s) =>
    s.collections.find((c) => c.id === collectionId)
  );
  const updateCollection = useCollectionStore((s) => s.updateCollection);

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

  const handleCompleteCollection = () => {
    if (collection.items.length === 0) {
      Alert.alert("No Items", "Please add at least one item before completing the collection.");
      return;
    }
    updateCollection(collectionId, { status: "completed" });
  };

  const handleSignCollection = () => {
    if (collection.items.length === 0) {
      Alert.alert("No Items", "Please add at least one item before getting signature.");
      return;
    }
    if (collection.status !== "completed") {
      Alert.alert(
        "Complete First",
        "Please mark the collection as completed before getting signature.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Complete Now",
            onPress: () => {
              updateCollection(collectionId, { status: "completed" });
              navigation.navigate("SignCollection", { collectionId });
            },
          },
        ]
      );
      return;
    }
    navigation.navigate("SignCollection", { collectionId });
  };

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <View className="flex-row items-center mb-3">
          <Pressable onPress={() => navigation.goBack()} className="mr-4 active:opacity-70">
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900">{collection.customerName}</Text>
            <Text className="text-sm text-gray-500">{collection.id}</Text>
          </View>
          {collection.status === "signed" && (
            <View className="flex-row items-center bg-green-100 px-3 py-1.5 rounded-full">
              <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
              <Text className="text-green-700 text-xs font-semibold ml-1">Signed</Text>
            </View>
          )}
        </View>
        <Text className="text-sm text-gray-600">{collection.pickupAddress}</Text>
        <Text className="text-xs text-gray-400 mt-1">
          {new Date(collection.collectionDate).toLocaleDateString()} • {collection.employeeName}
        </Text>
      </View>

      {/* Items List */}
      <FlatList
        data={collection.items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Ionicons name="images-outline" size={64} color="#D1D5DB" />
            <Text className="text-gray-400 text-lg font-medium mt-4">No items added yet</Text>
            <Text className="text-gray-400 text-sm mt-1 text-center px-8">
              Start documenting items by tapping the Add Item button below
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate("ItemDetail", { itemId: item.id, collectionId })}
            className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 active:bg-gray-50"
          >
            <View className="flex-row">
              {item.photos.length > 0 && (
                <View className="w-20 h-20 bg-gray-100 rounded-xl mr-3 items-center justify-center">
                  <Ionicons name="image" size={32} color="#9CA3AF" />
                </View>
              )}
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">{item.title}</Text>
                {item.artistName && (
                  <Text className="text-sm text-gray-600 mt-0.5">by {item.artistName}</Text>
                )}
                <Text className="text-xs text-gray-500 mt-1">
                  {item.dimensions.length} × {item.dimensions.width} × {item.dimensions.height} {item.dimensions.unit}
                </Text>
                <View className="flex-row items-center mt-2">
                  <View
                    className={`px-2 py-1 rounded-md ${
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
                      className={`text-xs font-medium ${
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
                  <Text className="text-xs text-gray-400 ml-2">
                    {item.photos.length} photo{item.photos.length !== 1 ? "s" : ""}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </Pressable>
        )}
        ListFooterComponent={
          <View className="mt-4">
            {collection.items.length > 0 && (
              <View className="bg-blue-50 rounded-2xl p-4 mb-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-blue-900">Total Items</Text>
                    <Text className="text-sm text-blue-700 mt-1">
                      {collection.items.length} item{collection.items.length !== 1 ? "s" : ""} documented
                    </Text>
                  </View>
                  <View className="bg-blue-600 w-12 h-12 rounded-full items-center justify-center">
                    <Text className="text-white text-lg font-bold">{collection.items.length}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            {collection.status !== "signed" && (
              <View className="space-y-3">
                {collection.status === "in_progress" && collection.items.length > 0 && (
                  <Pressable
                    onPress={handleCompleteCollection}
                    className="bg-green-600 rounded-xl py-4 items-center active:bg-green-700 mb-3"
                  >
                    <Text className="text-white text-base font-semibold">Mark as Completed</Text>
                  </Pressable>
                )}

                {collection.status === "completed" && !collection.signature && (
                  <Pressable
                    onPress={handleSignCollection}
                    className="bg-purple-600 rounded-xl py-4 items-center active:bg-purple-700 mb-3"
                  >
                    <View className="flex-row items-center">
                      <Ionicons name="create-outline" size={20} color="#FFFFFF" />
                      <Text className="text-white text-base font-semibold ml-2">Get Signature</Text>
                    </View>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        }
      />

      {/* Floating Add Item Button */}
      {collection.status !== "signed" && (
        <Pressable
          onPress={() => navigation.navigate("AddItem", { collectionId })}
          className="absolute bottom-8 right-6 bg-blue-600 rounded-full w-16 h-16 items-center justify-center shadow-lg active:bg-blue-700"
          style={{
            shadowColor: "#2563EB",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </Pressable>
      )}
    </View>
  );
}
