import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { HomeStackParamList } from "../navigation/HomeNavigator";
import {
  getLocations,
  getItemCountForLocation,
  getItemsByLocation,
  createLocation,
  updateLocation,
  disableLocation,
  getWarehouses,
  getWarehouseById,
  type Location,
  type InventoryItem,
  type Warehouse,
} from "../database/db-enhanced";
import { useAuthStore } from "../state/authStore";
import {
  generateLocationLabel,
  generateLocationLabelBatch,
  type LocationLabelData,
  type LabelSize,
} from "../utils/zpl-generator";

type Props = NativeStackScreenProps<HomeStackParamList, "BrowseLocations">;

export default function BrowseLocationsScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const { showActionSheetWithOptions } = useActionSheet();
  const [currentParentId, setCurrentParentId] = useState<number | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<Location[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [itemCounts, setItemCounts] = useState<{ [key: number]: number }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [locationItems, setLocationItems] = useState<InventoryItem[]>([]);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationCode, setNewLocationCode] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [editLocationName, setEditLocationName] = useState("");
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printLocation, setPrintLocation] = useState<Location | null>(null);
  const [printMode, setPrintMode] = useState<"single" | "with-children">("single");
  const [labelSize, setLabelSize] = useState<LabelSize>("4x4");
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    loadLocations();
    loadWarehouses();
  }, [currentParentId]);

  const loadWarehouses = async () => {
    try {
      const wh = await getWarehouses();
      setWarehouses(wh);
      if (wh.length > 0 && !selectedWarehouseId) {
        setSelectedWarehouseId(wh[0].id);
      }
    } catch (error) {
      console.error("Failed to load warehouses:", error);
    }
  };

  const loadLocations = async () => {
    setIsLoading(true);
    try {
      const locs = await getLocations(currentParentId, true);
      setLocations(locs);

      // Load item counts
      const counts: { [key: number]: number } = {};
      for (const loc of locs) {
        counts[loc.id] = await getItemCountForLocation(loc.id);
      }
      setItemCounts(counts);
    } catch (error) {
      console.error("Failed to load locations:", error);
      Alert.alert("Error", "Failed to load locations");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationPress = (location: Location) => {
    // Navigate into this location
    setBreadcrumb([...breadcrumb, location]);
    setCurrentParentId(location.id);
  };

  const handleBreadcrumbPress = (index: number) => {
    if (index === -1) {
      // Go to root
      setBreadcrumb([]);
      setCurrentParentId(null);
    } else {
      // Go to specific breadcrumb level
      const newBreadcrumb = breadcrumb.slice(0, index + 1);
      setBreadcrumb(newBreadcrumb);
      setCurrentParentId(newBreadcrumb[newBreadcrumb.length - 1].id);
    }
  };

  const handleViewItems = async (location: Location) => {
    console.log(`[BROWSE] handleViewItems called for location: ${location.id} ${location.name}`);
    setSelectedLocation(location);
    try {
      console.log("[BROWSE] Fetching items for location:", location.id);
      const items = await getItemsByLocation(location.id);
      console.log("[BROWSE] Loaded items count:", items.length);
      setLocationItems(items);
      console.log("[BROWSE] Opening modal");
      setShowItemsModal(true);
      console.log("[BROWSE] Modal state set to true");
    } catch (error) {
      console.error("[BROWSE] Failed to load items:", error);
      Alert.alert("Error", "Failed to load items");
    }
  };

  const handleLocationMenu = (location: Location) => {
    const hasItems = itemCounts[location.id] > 0;
    const isAdmin = user?.role === "admin";
    const hasLocationCode = !!location.location_code;

    const options: string[] = [];
    const actions: (() => void)[] = [];

    // Add View Items option
    if (hasItems) {
      options.push("View Items");
      actions.push(() => handleViewItems(location));
    }

    // Add Print Labels option
    if (isAdmin && hasLocationCode) {
      options.push("Print Labels");
      actions.push(() => handlePrintLabels(location));
    }

    // Add Rename option
    if (isAdmin) {
      options.push("Rename");
      actions.push(() => {
        setSelectedLocation(location);
        setEditLocationName(location.name);
        setShowEditModal(true);
      });
    }

    // Add Disable option
    if (isAdmin) {
      options.push("Disable Location");
      actions.push(() => handleDisableLocation(location));
    }

    // Add Cancel option
    options.push("Cancel");
    const cancelButtonIndex = options.length - 1;

    // Determine destructive button index (Disable Location)
    const destructiveButtonIndex = isAdmin ? options.length - 2 : undefined;

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        destructiveButtonIndex,
        title: location.name,
        message: hasItems ? `${itemCounts[location.id]} items in this location` : "No items",
      },
      (selectedIndex?: number) => {
        if (selectedIndex !== undefined && selectedIndex < actions.length) {
          actions[selectedIndex]();
        }
      }
    );
  };

  const handleAddLocation = async () => {
    if (!newLocationName.trim()) {
      Alert.alert("Error", "Please enter a location name");
      return;
    }

    if (!newLocationCode.trim()) {
      Alert.alert("Error", "Please enter a location code");
      return;
    }

    if (user?.role !== "admin") {
      Alert.alert("Error", "Only administrators can create locations");
      return;
    }

    // Determine warehouse ID
    let warehouseId = selectedWarehouseId;
    if (currentParentId !== null) {
      // Get warehouse from parent location
      const parentLocation = breadcrumb[breadcrumb.length - 1];
      if (parentLocation?.warehouse_id) {
        warehouseId = parentLocation.warehouse_id;
      }
    }

    if (!warehouseId) {
      Alert.alert("Error", "Please select a warehouse");
      return;
    }

    if (!user?.id) {
      Alert.alert("Error", "User ID not found");
      return;
    }

    try {
      await createLocation(
        newLocationName.trim(),
        newLocationCode.trim(),
        currentParentId,
        warehouseId,
        user.id
      );
      setNewLocationName("");
      setNewLocationCode("");
      setShowAddModal(false);
      loadLocations();
      Alert.alert("Success", "Location created successfully");
    } catch (error: any) {
      console.error("Failed to create location:", error);
      Alert.alert("Error", error.message || "Failed to create location");
    }
  };

  const handleEditLocation = async () => {
    if (!selectedLocation || !editLocationName.trim()) {
      Alert.alert("Error", "Please enter a location name");
      return;
    }

    if (user?.role !== "admin") {
      Alert.alert("Error", "Only administrators can edit locations");
      return;
    }

    if (!user?.id) {
      Alert.alert("Error", "User ID not found");
      return;
    }

    try {
      await updateLocation(selectedLocation.id, editLocationName.trim(), user.id);
      setShowEditModal(false);
      setSelectedLocation(null);
      loadLocations();
      Alert.alert("Success", "Location updated successfully");
    } catch (error) {
      console.error("Failed to update location:", error);
      Alert.alert("Error", "Failed to update location");
    }
  };

  const handleDisableLocation = async (location: Location) => {
    if (user?.role !== "admin") {
      Alert.alert("Error", "Only administrators can disable locations");
      return;
    }

    if (!user?.id) {
      Alert.alert("Error", "User ID not found");
      return;
    }

    Alert.alert(
      "Disable Location",
      `Are you sure you want to disable "${location.name}"? It will be hidden from location pickers.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disable",
          style: "destructive",
          onPress: async () => {
            try {
              await disableLocation(location.id, user.id);
              loadLocations();
              Alert.alert("Success", "Location disabled");
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to disable location");
            }
          },
        },
      ]
    );
  };

  // Recursively get all child locations
  const getAllChildLocations = async (parentId: number): Promise<Location[]> => {
    const children = await getLocations(parentId, true);
    let allChildren: Location[] = [...children];

    for (const child of children) {
      const grandchildren = await getAllChildLocations(child.id);
      allChildren = [...allChildren, ...grandchildren];
    }

    return allChildren;
  };

  // Count total locations for print preview
  const countLocationsForPrint = async (location: Location, includeChildren: boolean): Promise<number> => {
    if (!includeChildren) return 1;
    const children = await getAllChildLocations(location.id);
    return 1 + children.length; // parent + all children
  };

  // Handle print labels button press
  const handlePrintLabels = async (location: Location) => {
    setPrintLocation(location);
    setPrintMode("single");
    setShowPrintModal(true);
  };

  // Generate and "print" labels (preview mode for now)
  const handleConfirmPrint = async () => {
    if (!printLocation) return;

    setIsPrinting(true);
    try {
      // Get warehouse info
      const warehouse = printLocation.warehouse_id
        ? await getWarehouseById(printLocation.warehouse_id)
        : null;

      // Collect all locations to print
      let locationsToPrint: Location[] = [printLocation];
      if (printMode === "with-children") {
        const children = await getAllChildLocations(printLocation.id);
        locationsToPrint = [printLocation, ...children];
      }

      // Convert to label data
      const labelData: LocationLabelData[] = locationsToPrint.map((loc) => ({
        locationCode: loc.location_code || loc.name,
        locationName: loc.name,
        fullPath: loc.full_path,
        warehouseName: warehouse?.name,
      }));

      // Generate ZPL
      const zpl = generateLocationLabelBatch(labelData, labelSize);

      // For now, show preview/success
      Alert.alert(
        "Labels Generated",
        `✓ Generated ${labelData.length} label${labelData.length > 1 ? "s" : ""}\n\n` +
        `Size: ${labelSize}\n` +
        `ZPL code generated successfully.\n\n` +
        `To print:\n` +
        `1. Configure printer in Settings\n` +
        `2. ZPL will be sent to printer automatically\n\n` +
        `(Printer integration coming soon)`,
        [
          {
            text: "Copy ZPL",
            onPress: () => {
              // In a real implementation, copy to clipboard
              console.log("ZPL Code:\n", zpl);
              Alert.alert("Success", "ZPL copied to logs. Check console for ZPL code.");
            },
          },
          { text: "Done", style: "default" },
        ]
      );

      setShowPrintModal(false);
      setPrintLocation(null);
    } catch (error: any) {
      console.error("Failed to generate labels:", error);
      Alert.alert("Error", error.message || "Failed to generate labels");
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-6 py-4 border-b border-gray-200">
        <View className="flex-row items-center mb-3">
          <Pressable onPress={() => navigation.goBack()} className="mr-4 p-2 -ml-2">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
          <Text className="text-2xl font-bold text-gray-900">Browse Locations</Text>
        </View>

        {/* Breadcrumb */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          <Pressable
            onPress={() => handleBreadcrumbPress(-1)}
            className="flex-row items-center mr-2"
          >
            <Text className="text-sm font-medium text-blue-600">Warehouses</Text>
          </Pressable>
          {breadcrumb.map((loc, index) => (
            <View key={loc.id} className="flex-row items-center">
              <Ionicons
                name="chevron-forward"
                size={16}
                color="#9CA3AF"
                style={{ marginHorizontal: 4 }}
              />
              <Pressable onPress={() => handleBreadcrumbPress(index)} className="mr-2">
                <Text
                  className={
                    index === breadcrumb.length - 1
                      ? "text-sm font-semibold text-gray-900"
                      : "text-sm font-medium text-blue-600"
                  }
                >
                  {loc.name}
                </Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView className="flex-1 px-6 py-4">
        {isLoading ? (
          <View className="py-12">
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : locations.length === 0 ? (
          <View className="py-12">
            <Text className="text-center text-gray-500">No locations here yet</Text>
            {user?.role === "admin" && (
              <Text className="text-center text-sm text-gray-400 mt-2">
                Tap below to add a new location
              </Text>
            )}
          </View>
        ) : (
          <View className="space-y-2">
            {locations.map((location) => (
              <View key={location.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <View className="flex-row items-center justify-between">
                  <Pressable
                    onPress={() => handleLocationPress(location)}
                    className="flex-1 active:opacity-70"
                  >
                    <View className="flex-row items-center">
                      <Ionicons
                        name={location.is_transit ? "swap-horizontal-outline" : "folder-outline"}
                        size={24}
                        color={location.is_transit ? "#F59E0B" : "#6B7280"}
                      />
                      <View className="ml-3 flex-1">
                        <Text className="text-base font-semibold text-gray-900">
                          {location.name}
                        </Text>
                        {itemCounts[location.id] > 0 && (
                          <Text className="text-sm text-gray-600 mt-1">
                            {itemCounts[location.id]} item{itemCounts[location.id] !== 1 ? "s" : ""}
                          </Text>
                        )}
                        {location.is_transit && (
                          <View className="mt-1">
                            <Text className="text-xs font-medium text-amber-600">
                              Transit Location
                            </Text>
                          </View>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </View>
                  </Pressable>

                  {/* Menu Button */}
                  <Pressable
                    onPress={() => handleLocationMenu(location)}
                    className="ml-3 w-10 h-10 rounded-full bg-gray-200 items-center justify-center active:bg-gray-300"
                  >
                    <Ionicons name="ellipsis-horizontal" size={20} color="#374151" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Location Button */}
      {user?.role === "admin" && (
        <View className="px-6 py-4 border-t border-gray-200">
          <Pressable
            onPress={() => setShowAddModal(true)}
            className="bg-blue-600 rounded-xl py-4 active:bg-blue-700"
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="add-circle-outline" size={20} color="white" />
              <Text className="text-white text-base font-semibold ml-2">
                Add New Location
              </Text>
            </View>
          </Pressable>
        </View>
      )}

      {/* Add Location Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white">
          <View className="px-6 py-4 border-b border-gray-200">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-bold text-gray-900">Add New Location</Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={28} color="#374151" />
              </Pressable>
            </View>
          </View>

          <View className="flex-1 px-6 py-6">
            <Text className="text-sm font-medium text-gray-700 mb-2">Location Name</Text>
            <TextInput
              value={newLocationName}
              onChangeText={setNewLocationName}
              placeholder="e.g., Room 1, Shelf A, Bin 5"
              placeholderTextColor="#9CA3AF"
              className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
              autoFocus
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">Location Code</Text>
            <TextInput
              value={newLocationCode}
              onChangeText={(text) => setNewLocationCode(text.toUpperCase())}
              placeholder="e.g., R1, SA, B5"
              placeholderTextColor="#9CA3AF"
              className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
              autoCapitalize="characters"
            />

            {currentParentId === null && warehouses.length > 0 && (
              <>
                <Text className="text-sm font-medium text-gray-700 mb-2">Warehouse</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-4">
                  {warehouses.map((warehouse) => (
                    <Pressable
                      key={warehouse.id}
                      onPress={() => setSelectedWarehouseId(warehouse.id)}
                      className={`px-4 py-2 rounded-full mr-2 ${
                        selectedWarehouseId === warehouse.id ? "bg-blue-600" : "bg-gray-100"
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          selectedWarehouseId === warehouse.id ? "text-white" : "text-gray-700"
                        }`}
                      >
                        {warehouse.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}

            {currentParentId !== null && breadcrumb.length > 0 && (
              <View className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <Text className="text-xs text-blue-900">
                  Creating sublocation under: {breadcrumb[breadcrumb.length - 1].name}
                </Text>
              </View>
            )}
          </View>

          <View className="px-6 py-4 border-t border-gray-200">
            <Pressable
              onPress={handleAddLocation}
              className="bg-blue-600 rounded-xl py-4 active:bg-blue-700"
            >
              <Text className="text-white text-center font-semibold">Create Location</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Edit Location Modal */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white">
          <View className="px-6 py-4 border-b border-gray-200">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-bold text-gray-900">Rename Location</Text>
              <Pressable onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={28} color="#374151" />
              </Pressable>
            </View>
          </View>

          <View className="flex-1 px-6 py-6">
            <Text className="text-sm font-medium text-gray-700 mb-2">Location Name</Text>
            <TextInput
              value={editLocationName}
              onChangeText={setEditLocationName}
              placeholder="Enter new name"
              placeholderTextColor="#9CA3AF"
              className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
              autoFocus
            />
          </View>

          <View className="px-6 py-4 border-t border-gray-200">
            <Pressable
              onPress={handleEditLocation}
              className="bg-blue-600 rounded-xl py-4 active:bg-blue-700"
            >
              <Text className="text-white text-center font-semibold">Save Changes</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {/* View Items Modal */}
      <Modal visible={showItemsModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white">
          <View className="px-6 py-4 border-b border-gray-200">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-bold text-gray-900">
                Items in {selectedLocation?.name}
              </Text>
              <Pressable onPress={() => setShowItemsModal(false)}>
                <Ionicons name="close" size={28} color="#374151" />
              </Pressable>
            </View>
          </View>

          <ScrollView className="flex-1 px-6 py-4">
            {locationItems.length === 0 ? (
              <Text className="text-center text-gray-500 py-12">No items in this location</Text>
            ) : (
              <View className="space-y-2">
                {locationItems.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      setShowItemsModal(false);
                      navigation.navigate("InventoryItemDetail", { itemId: item.id });
                    }}
                    className="bg-white rounded-xl p-4 border border-gray-200 active:bg-gray-100"
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-xs font-medium text-blue-600">
                        {item.inventory_number}
                      </Text>
                      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                    </View>

                    {item.title && (
                      <Text className="text-base font-semibold text-gray-900 mb-1">
                        {item.title}
                      </Text>
                    )}

                    <Text className="text-sm text-gray-600 mb-2" numberOfLines={2}>
                      {item.description || "No description"}
                    </Text>

                    {item.customer_name && (
                      <View className="flex-row items-center mt-2 pt-2 border-t border-gray-100">
                        <Ionicons name="person-outline" size={14} color="#6B7280" />
                        <Text className="text-xs text-gray-500 ml-1">
                          {item.customer_name}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Print Labels Modal */}
      <Modal visible={showPrintModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white">
          <View className="px-6 py-4 border-b border-gray-200">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-bold text-gray-900">Print Location Labels</Text>
              <Pressable onPress={() => setShowPrintModal(false)}>
                <Ionicons name="close" size={28} color="#374151" />
              </Pressable>
            </View>
          </View>

          <ScrollView className="flex-1 px-6 py-6">
            {printLocation && (
              <>
                {/* Location Info */}
                <View className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
                  <Text className="text-sm font-medium text-purple-900 mb-1">
                    {printLocation.name}
                  </Text>
                  <Text className="text-xs text-purple-700">
                    Code: {printLocation.location_code || "N/A"}
                  </Text>
                  <Text className="text-xs text-purple-700 mt-1">
                    Path: {printLocation.full_path}
                  </Text>
                </View>

                {/* Print Mode Selection */}
                <Text className="text-sm font-medium text-gray-700 mb-3">Print Options</Text>

                <Pressable
                  onPress={() => setPrintMode("single")}
                  className={`flex-row items-center p-4 rounded-xl mb-3 border-2 ${
                    printMode === "single"
                      ? "bg-purple-50 border-purple-500"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <View
                    className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                      printMode === "single" ? "border-purple-500" : "border-gray-300"
                    }`}
                  >
                    {printMode === "single" && (
                      <View className="w-3 h-3 rounded-full bg-purple-500" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">
                      This location only
                    </Text>
                    <Text className="text-sm text-gray-600 mt-1">Print 1 label</Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => setPrintMode("with-children")}
                  className={`flex-row items-center p-4 rounded-xl mb-6 border-2 ${
                    printMode === "with-children"
                      ? "bg-purple-50 border-purple-500"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <View
                    className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                      printMode === "with-children" ? "border-purple-500" : "border-gray-300"
                    }`}
                  >
                    {printMode === "with-children" && (
                      <View className="w-3 h-3 rounded-full bg-purple-500" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">
                      Include all children
                    </Text>
                    <Text className="text-sm text-gray-600 mt-1">
                      Print labels for this location and all sub-locations
                    </Text>
                  </View>
                </Pressable>

                {/* Label Size Selection */}
                <Text className="text-sm font-medium text-gray-700 mb-3">Label Size</Text>
                <View className="flex-row space-x-3 mb-6">
                  <Pressable
                    onPress={() => setLabelSize("4x4")}
                    className={`flex-1 py-3 rounded-xl border-2 ${
                      labelSize === "4x4"
                        ? "bg-purple-50 border-purple-500"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-center font-semibold ${
                        labelSize === "4x4" ? "text-purple-900" : "text-gray-700"
                      }`}
                    >
                      4&quot; × 4&quot;
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setLabelSize("4x6")}
                    className={`flex-1 py-3 rounded-xl border-2 ${
                      labelSize === "4x6"
                        ? "bg-purple-50 border-purple-500"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-center font-semibold ${
                        labelSize === "4x6" ? "text-purple-900" : "text-gray-700"
                      }`}
                    >
                      4&quot; × 6&quot;
                    </Text>
                  </Pressable>
                </View>

                {/* Info Note */}
                <View className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <View className="flex-row items-start">
                    <Ionicons name="information-circle" size={20} color="#2563EB" />
                    <Text className="text-sm text-blue-900 ml-2 flex-1">
                      Each label includes a large QR code, location code, name, full path, and
                      barcode for easy scanning.
                    </Text>
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          <View className="px-6 py-4 border-t border-gray-200">
            <Pressable
              onPress={handleConfirmPrint}
              disabled={isPrinting}
              className={`rounded-xl py-4 ${
                isPrinting ? "bg-gray-400" : "bg-purple-600 active:bg-purple-700"
              }`}
            >
              {isPrinting ? (
                <ActivityIndicator color="white" />
              ) : (
                <View className="flex-row items-center justify-center">
                  <Ionicons name="print" size={20} color="white" />
                  <Text className="text-white text-center font-semibold ml-2">
                    Generate Labels
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
