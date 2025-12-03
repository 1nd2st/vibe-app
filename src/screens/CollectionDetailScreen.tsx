import React, { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, Pressable, Alert, Modal, Image, ActivityIndicator } from "react-native";
import { useSettingsStore } from "../state/settingsStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/RootNavigator";
import { emailCollectionReport, shareCollectionReport } from "../utils/collectionReports";
import { printMultipleItemLabels } from "../utils/zebraPrinter";
import Breadcrumb from "../components/Breadcrumb";
import SwipeableItem from "../components/SwipeableItem";
import * as ContextMenu from "zeego/context-menu";
import { getCollectionByUuid, updateCollection, deleteCollectionItem, getCustomerById } from "../database/db-collections";
import type { Collection, CollectionItem, Customer } from "../types/collection";
import { buildCollectionSummary, formatNumber, formatCurrency } from "../utils/collectionSummary";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "CollectionDetail">;
  route: RouteProp<RootStackParamList, "CollectionDetail">;
};

export default function CollectionDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { collectionId } = route.params;

  // SQLite state
  const [collection, setCollection] = useState<Collection | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load collection from SQLite
  const loadCollection = async () => {
    setIsLoading(true);
    try {
      const collectionData = await getCollectionByUuid(collectionId);
      setCollection(collectionData);
    } catch (error) {
      console.error("Failed to load collection:", error);
      Alert.alert("Error", "Failed to load collection");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCollection();
  }, [collectionId]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadCollection();
    }, [collectionId])
  );

  // Use individual selectors to avoid infinite loop from object creation
  const printerEnabled = useSettingsStore((s) => s.settings.printerEnabled);
  const printerIp = useSettingsStore((s) => s.settings.printerIp);
  const printerPort = useSettingsStore((s) => s.settings.printerPort);
  const labelWidth = useSettingsStore((s) => s.settings.labelWidth);
  const labelHeight = useSettingsStore((s) => s.settings.labelHeight);
  const printerDpi = useSettingsStore((s) => s.settings.printerDpi);

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isPrintingLabels, setIsPrintingLabels] = useState(false);

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

  const handleEmailReport = async () => {
    setShowExportMenu(false);
    try {
      const customer = await getCustomerById(collection.customerId);
      await emailCollectionReport(collection, customer?.email);
    } catch (error) {
      console.error("Failed to get customer:", error);
      await emailCollectionReport(collection);
    }
  };

  const handleShareReport = async () => {
    setShowExportMenu(false);
    await shareCollectionReport(collection);
  };

  const handleToggleSelectionMode = () => {
    if (selectionMode) {
      // Exiting selection mode
      setSelectionMode(false);
      setSelectedItems(new Set());
    } else {
      // Entering selection mode - select all items by default
      setSelectionMode(true);
      const allItemIds = new Set(collection.items.map(item => item.id));
      setSelectedItems(allItemIds);
    }
  };

  const handleToggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const handlePrintQRCodes = () => {
    if (selectedItems.size === 0) {
      Alert.alert("No Items Selected", "Please select at least one item to print QR codes.");
      return;
    }

    navigation.navigate("QRCodeDisplay", {
      collectionId,
      itemIds: Array.from(selectedItems),
    });
    setSelectionMode(false);
    setSelectedItems(new Set());
  };

  const handlePrintLabels = async () => {
    if (selectedItems.size === 0) {
      Alert.alert("No Items Selected", "Please select at least one item to print labels.");
      return;
    }

    if (!printerEnabled) {
      Alert.alert(
        "Printer Not Configured",
        "Please enable and configure the printer in Settings first.",
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
        "Please configure the printer IP address in Settings.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Go to Settings", onPress: () => navigation.navigate("Settings") },
        ]
      );
      return;
    }

    // Get the selected items
    const itemsToPrint = collection.items.filter(item => selectedItems.has(item.id));

    setIsPrintingLabels(true);
    const result = await printMultipleItemLabels(
      itemsToPrint,
      collectionId,
      printerIp,
      printerPort,
      labelWidth,
      labelHeight,
      printerDpi
    );
    setIsPrintingLabels(false);

    if (result.success > 0) {
      if (result.failed === 0) {
        Alert.alert(
          "Labels Printed",
          `Successfully printed ${result.success} label${result.success !== 1 ? "s" : ""}.`
        );
        setSelectionMode(false);
        setSelectedItems(new Set());
      } else {
        Alert.alert(
          "Partial Success",
          `Printed ${result.success} label${result.success !== 1 ? "s" : ""}, but ${result.failed} failed. Please check the printer connection.`
        );
      }
    } else {
      Alert.alert(
        "Print Failed",
        `Could not print labels. Please check the printer connection and try again.`
      );
    }
  };

  const handleDeleteItem = async (itemId: string, itemTitle: string) => {
    if (!collection || collection.status === "signed") {
      Alert.alert("Cannot Delete", "This collection is signed and locked. Items cannot be deleted.");
      return;
    }

    Alert.alert(
      "Delete Item",
      `Are you sure you want to delete "${itemTitle}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCollectionItem(itemId);
              await loadCollection(); // Reload to show updated list
            } catch (error) {
              console.error("Failed to delete item:", error);
              Alert.alert("Error", "Failed to delete item");
            }
          },
        },
      ]
    );
  };

  // Calculate progress
  const getCurrentStep = () => {
    if (collection.status === "signed") return 4;
    if (collection.status === "completed") return 3;
    if (collection.items.length > 0) return 2;
    return 1;
  };

  const steps = [
    { number: 1, label: "Create", completed: true },
    { number: 2, label: "Add Items", completed: collection.items.length > 0 },
    { number: 3, label: "Complete", completed: collection.status === "completed" || collection.status === "signed" },
    { number: 4, label: "Sign", completed: collection.status === "signed" },
  ];

  const currentStep = getCurrentStep();

  const handleStepClick = (stepNumber: number) => {
    if (collection.status === "signed") return; // Can't navigate if signed

    // Allow clicking on Step 2 (Add Items) to revert from completed back to in_progress
    if (stepNumber === 2 && currentStep === 3) {
      Alert.alert(
        "Return to Adding Items?",
        "This will revert the collection status back to 'In Progress' so you can add more items.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Yes, Add More Items",
            onPress: () => {
              updateCollection(collectionId, { status: "in_progress" });
            },
          },
        ]
      );
      return;
    }

    // Can't go forward, only backward
    if (stepNumber >= currentStep) return;
  };

  // Calculate collection summary
  const summary = buildCollectionSummary(collection);

  // Render summary card
  const renderSummaryCard = () => {
    if (collection.items.length === 0) return null;

    return (
      <View className="bg-white rounded-2xl p-5 mb-4">
        <Text className="text-xl font-bold text-gray-900 mb-4">Collection Summary</Text>

        {/* Basic Totals */}
        <View className="mb-4">
          <View className="flex-row justify-between py-2 border-b border-gray-100">
            <Text className="text-gray-600 text-base">Total items</Text>
            <Text className="text-gray-900 font-semibold text-base">{summary.totalItems}</Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-gray-100">
            <Text className="text-gray-600 text-base">Total photos</Text>
            <Text className="text-gray-900 font-semibold text-base">{summary.totalPhotos}</Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-gray-100">
            <Text className="text-gray-600 text-base">Total value</Text>
            <Text className="text-gray-900 font-semibold text-base">USD ${formatCurrency(summary.totalValue)}</Text>
          </View>
        </View>

        {/* Weight & Volume */}
        {(summary.totalWeightKg > 0 || summary.totalVolumeFt3 > 0) && (
          <View className="mb-4">
            {summary.totalWeightKg > 0 && (
              <View className="flex-row justify-between py-2 border-b border-gray-100">
                <Text className="text-gray-600 text-base">Total weight</Text>
                <Text className="text-gray-900 font-semibold text-base">
                  {formatNumber(summary.totalWeightLb, 1)} lb / {formatNumber(summary.totalWeightKg, 1)} kg
                </Text>
              </View>
            )}
            {summary.totalVolumeFt3 > 0 && (
              <View className="flex-row justify-between py-2 border-b border-gray-100">
                <Text className="text-gray-600 text-base">Total volume</Text>
                <Text className="text-gray-900 font-semibold text-base">
                  {formatNumber(summary.totalVolumeFt3, 2)} ft³ / {formatNumber(summary.totalVolumeM3, 2)} m³
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Data Quality */}
        <View className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <Text className="text-amber-900 font-semibold text-base mb-3">Data Quality</Text>
          <View className="space-y-1">
            <View className="flex-row justify-between py-1">
              <Text className="text-amber-800 text-sm">Items missing dimensions</Text>
              <Text className="text-amber-900 font-semibold text-sm">{summary.itemsMissingDimensions}</Text>
            </View>
            <View className="flex-row justify-between py-1">
              <Text className="text-amber-800 text-sm">Items missing weight</Text>
              <Text className="text-amber-900 font-semibold text-sm">{summary.itemsMissingWeight}</Text>
            </View>
            <View className="flex-row justify-between py-1">
              <Text className="text-amber-800 text-sm">Items with no photos</Text>
              <Text className="text-amber-900 font-semibold text-sm">{summary.itemsWithNoPhotos}</Text>
            </View>
            <View className="flex-row justify-between py-1">
              <Text className="text-amber-800 text-sm">Items missing value</Text>
              <Text className="text-amber-900 font-semibold text-sm">{summary.itemsMissingValue}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <View className="flex-row items-center mb-3">
          <Pressable
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate("Collections");
              }
            }}
            className="mr-4 active:opacity-70"
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900">{collection.customerName}</Text>
            <Text className="text-sm text-gray-500">{collection.id}</Text>
          </View>
          <Pressable
            onPress={() => setShowExportMenu(true)}
            className="mr-3 active:opacity-70"
          >
            <Ionicons name="share-outline" size={24} color="#2563EB" />
          </Pressable>
          {collection.status === "signed" && (
            <View className="flex-row items-center bg-green-100 px-3 py-1.5 rounded-full">
              <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
              <Text className="text-green-700 text-xs font-semibold ml-1">Signed</Text>
            </View>
          )}
        </View>

        {/* View Only Banner */}
        {collection.status === "signed" && (
          <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 flex-row items-center">
            <Ionicons name="lock-closed" size={20} color="#D97706" />
            <Text className="text-amber-800 text-sm font-medium ml-2 flex-1">
              This collection is locked and cannot be modified
            </Text>
          </View>
        )}

        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: "Home", screen: "Customers" },
            { label: collection.customerName },
          ]}
        />

        {/* Multistep Progress Bar */}
        <View className="mb-3">
          <View className="flex-row items-center justify-between mb-2">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                {/* Step Circle */}
                <Pressable
                  onPress={() => handleStepClick(step.number)}
                  disabled={
                    collection.status === "signed" ||
                    (step.number >= currentStep && !(step.number === 2 && currentStep === 3))
                  }
                  className="items-center flex-1"
                >
                  <View
                    className={`w-10 h-10 rounded-full items-center justify-center mb-1 ${
                      step.completed
                        ? "bg-green-600"
                        : step.number === currentStep
                        ? "bg-blue-600"
                        : "bg-gray-300"
                    }`}
                  >
                    {step.completed ? (
                      <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                    ) : (
                      <Text className="text-white font-bold">{step.number}</Text>
                    )}
                  </View>
                  <Text
                    className={`text-xs font-medium ${
                      step.completed || step.number === currentStep
                        ? "text-gray-900"
                        : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </Text>
                </Pressable>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <View className="flex-1 h-0.5 bg-gray-300 mx-1 -mt-6">
                    <View
                      className={`h-full ${step.completed ? "bg-green-600" : "bg-gray-300"}`}
                    />
                  </View>
                )}
              </React.Fragment>
            ))}
          </View>
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
        ListHeaderComponent={renderSummaryCard}
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
          <SwipeableItem
            enabled={collection.status !== "signed" && !selectionMode}
            onDelete={() => handleDeleteItem(item.id, item.title)}
          >
            <ContextMenu.Root>
              <ContextMenu.Trigger>
                <Pressable
                  onPress={() => {
                    if (selectionMode) {
                      handleToggleItemSelection(item.id);
                    } else {
                      navigation.navigate("ItemDetail", { itemId: item.id, collectionId });
                    }
                  }}
                  className={`bg-white rounded-2xl p-4 mb-3 border active:bg-gray-50 ${
                    selectionMode && selectedItems.has(item.id)
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-100"
                  }`}
                >
                  <View className="flex-row">
                    {selectionMode && (
                      <View className="mr-3 items-center justify-center">
                        <View
                          className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                            selectedItems.has(item.id)
                              ? "bg-blue-600 border-blue-600"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          {selectedItems.has(item.id) && (
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                          )}
                        </View>
                      </View>
                    )}
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
                    {!selectionMode && <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />}
                  </View>
                </Pressable>
              </ContextMenu.Trigger>
              <ContextMenu.Content>
                <ContextMenu.Item
                  key="view"
                  onSelect={() => navigation.navigate("ItemDetail", { itemId: item.id, collectionId })}
                >
                  <ContextMenu.ItemTitle>View Details</ContextMenu.ItemTitle>
                  <ContextMenu.ItemIcon
                    ios={{ name: "eye", pointSize: 18 }}
                  />
                </ContextMenu.Item>
                {collection.status !== "signed" && (
                  <ContextMenu.Item
                    key="delete"
                    destructive
                    onSelect={() => handleDeleteItem(item.id, item.title)}
                  >
                    <ContextMenu.ItemTitle>Delete Item</ContextMenu.ItemTitle>
                    <ContextMenu.ItemIcon
                      ios={{ name: "trash", pointSize: 18 }}
                    />
                  </ContextMenu.Item>
                )}
              </ContextMenu.Content>
            </ContextMenu.Root>
          </SwipeableItem>
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

            {/* Completed but not signed - can still add items */}
            {collection.status === "completed" && !collection.signature && collection.items.length > 0 && (
              <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-3">
                <View className="flex-row items-center">
                  <Ionicons name="information-circle" size={24} color="#D97706" />
                  <View className="flex-1 ml-3">
                    <Text className="text-amber-900 font-semibold text-sm">Need to add more items?</Text>
                    <Text className="text-amber-700 text-xs mt-1">
                      You can still add items using the + button or click on &ldquo;Add Items&rdquo; in the progress bar above to go back.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Signature Display */}
            {collection.signature && (
              <View className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 mb-3">
                <View className="flex-row items-center mb-3">
                  <View className="bg-green-600 w-10 h-10 rounded-full items-center justify-center mr-3">
                    <Ionicons name="checkmark-done" size={24} color="#FFFFFF" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-green-900">Collection Signed</Text>
                    <Text className="text-sm text-green-700">
                      {new Date(collection.signature.timestamp).toLocaleString()}
                    </Text>
                  </View>
                </View>

                <View className="bg-white rounded-xl p-3 mb-3">
                  <View className="mb-2">
                    <Text className="text-xs font-medium text-gray-500 mb-1">SIGNER NAME</Text>
                    <Text className="text-base font-semibold text-gray-900">{collection.signature.signerName}</Text>
                  </View>
                  <View>
                    <Text className="text-xs font-medium text-gray-500 mb-1">ROLE/TITLE</Text>
                    <Text className="text-base font-semibold text-gray-900">{collection.signature.signerRole}</Text>
                  </View>
                </View>

                {collection.signature.signatureUri && (
                  <View>
                    <Text className="text-xs font-medium text-gray-700 mb-2">SIGNATURE</Text>
                    <View className="bg-white rounded-xl p-3 border-2 border-dashed border-green-300">
                      <Image
                        source={{ uri: collection.signature.signatureUri }}
                        style={{ width: "100%", height: 120 }}
                        resizeMode="contain"
                      />
                    </View>
                  </View>
                )}

                {/* Post-Signature Actions */}
                <View className="mt-4 space-y-2">
                  <Pressable
                    onPress={() => navigation.navigate("Customers")}
                    className="bg-blue-600 rounded-xl py-3 items-center active:bg-blue-700 mb-2"
                  >
                    <View className="flex-row items-center">
                      <Ionicons name="home" size={20} color="#FFFFFF" />
                      <Text className="text-white text-base font-semibold ml-2">Go to Home</Text>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      if (collection?.customerId) {
                        navigation.navigate("CustomerDetail", { customerId: collection.customerId });
                      } else {
                        navigation.navigate("Customers");
                      }
                    }}
                    className="bg-white border border-green-600 rounded-xl py-3 items-center active:bg-green-50 mb-2"
                  >
                    <View className="flex-row items-center">
                      <Ionicons name="person" size={20} color="#16A34A" />
                      <Text className="text-green-700 text-base font-semibold ml-2">
                        {collection?.customerId ? `View ${collection.customerName}` : "View All Customers"}
                      </Text>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      if (collection?.customerId) {
                        navigation.navigate("NewCollection", { customerId: collection.customerId });
                      } else {
                        navigation.navigate("Customers");
                      }
                    }}
                    className="bg-green-600 rounded-xl py-3 items-center active:bg-green-700"
                  >
                    <View className="flex-row items-center">
                      <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                      <Text className="text-white text-base font-semibold ml-2">
                        {collection?.customerId ? `New Collection for ${collection.customerName}` : "Create New Collection"}
                      </Text>
                    </View>
                  </Pressable>
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

      {/* Floating Action Buttons */}
      {collection.status !== "signed" && !selectionMode && (
        <>
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

          {collection.items.length > 0 && (
            <Pressable
              onPress={handleToggleSelectionMode}
              className="absolute bottom-8 right-24 bg-white border-2 border-blue-600 rounded-full w-16 h-16 items-center justify-center shadow-lg active:bg-blue-50"
              style={{
                shadowColor: "#2563EB",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <Ionicons name="qr-code" size={28} color="#2563EB" />
            </Pressable>
          )}
        </>
      )}

      {/* Selection Mode Actions */}
      {selectionMode && (
        <View
          className="absolute bottom-8 left-6 right-6 bg-white rounded-2xl p-4 border-2 border-blue-600 shadow-lg"
          style={{
            shadowColor: "#2563EB",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-semibold text-gray-900">
              {selectedItems.size} of {collection.items.length} selected
            </Text>
            <Pressable onPress={handleToggleSelectionMode} className="active:opacity-70">
              <Text className="text-blue-600 font-medium">Cancel</Text>
            </Pressable>
          </View>

          <View className="flex-row gap-2">
            <Pressable
              onPress={handlePrintLabels}
              disabled={selectedItems.size === 0 || isPrintingLabels}
              className={`flex-1 rounded-xl py-3 items-center flex-row justify-center ${
                selectedItems.size > 0 && !isPrintingLabels
                  ? "bg-green-600 active:bg-green-700"
                  : "bg-gray-300"
              }`}
            >
              {isPrintingLabels ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text className="text-white text-base font-semibold ml-2">Printing...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="print" size={20} color="#FFFFFF" />
                  <Text className="text-white text-base font-semibold ml-2">
                    Labels ({selectedItems.size})
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={handlePrintQRCodes}
              disabled={selectedItems.size === 0}
              className={`flex-1 rounded-xl py-3 items-center flex-row justify-center ${
                selectedItems.size > 0
                  ? "bg-blue-600 active:bg-blue-700"
                  : "bg-gray-300"
              }`}
            >
              <Ionicons name="qr-code" size={20} color="#FFFFFF" />
              <Text className="text-white text-base font-semibold ml-2">
                QR Codes ({selectedItems.size})
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Export Menu Modal */}
      <Modal visible={showExportMenu} transparent animationType="fade">
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setShowExportMenu(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="bg-white rounded-t-3xl p-6" style={{ paddingBottom: insets.bottom + 24 }}>
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-xl font-bold text-gray-900">Export Collection</Text>
                <Pressable onPress={() => setShowExportMenu(false)} className="active:opacity-70">
                  <Ionicons name="close" size={28} color="#111827" />
                </Pressable>
              </View>

              <Pressable
                onPress={handleShareReport}
                className="flex-row items-center p-4 bg-blue-50 rounded-xl mb-3 active:bg-blue-100"
              >
                <View className="w-12 h-12 bg-blue-600 rounded-full items-center justify-center mr-4">
                  <Ionicons name="share-social-outline" size={24} color="#FFFFFF" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900">Share Report</Text>
                  <Text className="text-sm text-gray-600">Export as text file and share</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </Pressable>

              <Pressable
                onPress={handleEmailReport}
                className="flex-row items-center p-4 bg-green-50 rounded-xl mb-3 active:bg-green-100"
              >
                <View className="w-12 h-12 bg-green-600 rounded-full items-center justify-center mr-4">
                  <Ionicons name="mail-outline" size={24} color="#FFFFFF" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900">Email Report</Text>
                  <Text className="text-sm text-gray-600">Send collection details via email</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </Pressable>

              <Pressable
                onPress={() => {
                  setShowExportMenu(false);
                  navigation.navigate("QRCodeDisplay", { collectionId });
                }}
                className="flex-row items-center p-4 bg-purple-50 rounded-xl active:bg-purple-100"
              >
                <View className="w-12 h-12 bg-purple-600 rounded-full items-center justify-center mr-4">
                  <Ionicons name="qr-code-outline" size={24} color="#FFFFFF" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900">View QR Codes</Text>
                  <Text className="text-sm text-gray-600">Display QR codes for all items</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
