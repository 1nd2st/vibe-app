// Reusable Location Picker component with breadcrumb navigation
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import {
  getLocations,
  createLocation,
  getItemCountForLocation,
  getWarehouses,
  getQuickAccessLocations,
  toggleLocationFavorite,
  type Location,
  type Warehouse,
} from "../database/db-enhanced";
import { useAuthStore } from "../state/authStore";

interface LocationPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (locationId: number, fullPath: string) => void;
  allowCreateNew?: boolean;
}

export default function LocationPicker({
  visible,
  onClose,
  onSelectLocation,
  allowCreateNew = true,
}: LocationPickerProps) {
  const { user } = useAuthStore();
  const [currentParentId, setCurrentParentId] = useState<number | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<Location[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [itemCounts, setItemCounts] = useState<{ [key: number]: number }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationCode, setNewLocationCode] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [quickAccessLocations, setQuickAccessLocations] = useState<(Location & { usage_count: number; is_favorite: boolean })[]>([]);
  const [showQuickAccess, setShowQuickAccess] = useState(true);

  // Load locations and warehouses
  useEffect(() => {
    if (visible) {
      loadLocations();
      loadWarehouses();
      loadQuickAccess();
    }
  }, [visible, currentParentId]);

  const loadQuickAccess = async () => {
    if (!user?.id) return;
    try {
      const quick = await getQuickAccessLocations(user.id, 5);
      setQuickAccessLocations(quick);
    } catch (error) {
      console.error("Failed to load quick access:", error);
    }
  };

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

      // Load item counts for each location
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

  const handleSelectCurrentLocation = () => {
    if (breadcrumb.length === 0) {
      Alert.alert("Error", "Please select a specific location");
      return;
    }

    const currentLocation = breadcrumb[breadcrumb.length - 1];
    onSelectLocation(currentLocation.id, currentLocation.full_path);
    handleClose();
  };

  const handleSelectQuickAccessLocation = (location: Location) => {
    onSelectLocation(location.id, location.full_path);
    handleClose();
  };

  const handleToggleFavorite = async (locationId: number, isFavorite: boolean) => {
    if (!user?.id) return;
    try {
      await toggleLocationFavorite(user.id, locationId, !isFavorite);
      loadQuickAccess();
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    }
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

    if (!user) {
      Alert.alert("Error", "You must be logged in to create locations");
      return;
    }

    // Only admins can create locations
    if (user.role !== "admin") {
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

  const handleClose = () => {
    setBreadcrumb([]);
    setCurrentParentId(null);
    setNewLocationName("");
    setNewLocationCode("");
    setShowAddModal(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar style="dark" />

        {/* Header */}
        <View className="px-6 py-4 border-b border-gray-200">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-2xl font-bold text-gray-900">
              Choose Location
            </Text>
            <Pressable onPress={handleClose} className="p-2 -mr-2">
              <Ionicons name="close" size={28} color="#374151" />
            </Pressable>
          </View>

          {/* Breadcrumb */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row"
          >
            <Pressable
              onPress={() => handleBreadcrumbPress(-1)}
              className="flex-row items-center mr-2"
            >
              <Text className="text-sm font-medium text-blue-600">
                Warehouses
              </Text>
            </Pressable>
            {breadcrumb.map((loc, index) => (
              <View key={loc.id} className="flex-row items-center">
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color="#9CA3AF"
                  style={{ marginHorizontal: 4 }}
                />
                <Pressable
                  onPress={() => handleBreadcrumbPress(index)}
                  className="mr-2"
                >
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
          {/* Quick Access Section */}
          {currentParentId === null && quickAccessLocations.length > 0 && showQuickAccess && (
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Ionicons name="flash" size={20} color="#7C3AED" />
                  <Text className="text-base font-bold text-gray-900 ml-2">Quick Access</Text>
                </View>
                <Pressable onPress={() => setShowQuickAccess(false)}>
                  <Ionicons name="chevron-up" size={20} color="#9CA3AF" />
                </Pressable>
              </View>
              <View className="space-y-2">
                {quickAccessLocations.map((location) => (
                  <Pressable
                    key={location.id}
                    onPress={() => handleSelectQuickAccessLocation(location)}
                    className="bg-purple-50 border border-purple-200 rounded-xl p-3 active:bg-purple-100"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 flex-row items-center">
                        <Ionicons
                          name={location.is_favorite ? "star" : "time-outline"}
                          size={20}
                          color={location.is_favorite ? "#F59E0B" : "#7C3AED"}
                        />
                        <View className="ml-3 flex-1">
                          <Text className="text-sm font-semibold text-gray-900">
                            {location.name}
                          </Text>
                          <Text className="text-xs text-gray-600 mt-1">
                            {location.full_path}
                          </Text>
                          {!location.is_favorite && location.usage_count > 0 && (
                            <Text className="text-xs text-purple-600 mt-1">
                              Used {location.usage_count} times
                            </Text>
                          )}
                        </View>
                      </View>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(location.id, location.is_favorite);
                        }}
                        className="ml-2 p-2"
                      >
                        <Ionicons
                          name={location.is_favorite ? "star" : "star-outline"}
                          size={24}
                          color={location.is_favorite ? "#F59E0B" : "#9CA3AF"}
                        />
                      </Pressable>
                    </View>
                  </Pressable>
                ))}
              </View>
              <View className="border-b border-gray-200 mt-4 mb-4" />
            </View>
          )}

          {currentParentId === null && quickAccessLocations.length > 0 && !showQuickAccess && (
            <View className="mb-4">
              <Pressable
                onPress={() => setShowQuickAccess(true)}
                className="flex-row items-center py-2"
              >
                <Ionicons name="flash" size={18} color="#7C3AED" />
                <Text className="text-sm font-medium text-purple-600 ml-2">
                  Show Quick Access ({quickAccessLocations.length})
                </Text>
                <Ionicons name="chevron-down" size={18} color="#7C3AED" />
              </Pressable>
            </View>
          )}

          {isLoading ? (
            <View className="py-12">
              <ActivityIndicator size="large" color="#2563EB" />
            </View>
          ) : locations.length === 0 ? (
            <View className="py-12">
              <Text className="text-center text-gray-500">
                No locations here yet
              </Text>
              {allowCreateNew && user?.role === "admin" && (
                <Text className="text-center text-sm text-gray-400 mt-2">
                  Tap below to add a new location
                </Text>
              )}
            </View>
          ) : (
            <View className="space-y-2">
              {locations.map((location) => (
                <Pressable
                  key={location.id}
                  onPress={() => handleLocationPress(location)}
                  className="bg-gray-50 rounded-xl p-4 border border-gray-200 active:bg-gray-100"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 flex-row items-center">
                      <Ionicons
                        name={
                          location.is_transit
                            ? "swap-horizontal-outline"
                            : "folder-outline"
                        }
                        size={24}
                        color={location.is_transit ? "#F59E0B" : "#6B7280"}
                      />
                      <View className="ml-3 flex-1">
                        <Text className="text-base font-semibold text-gray-900">
                          {location.name}
                        </Text>
                        {itemCounts[location.id] > 0 && (
                          <Text className="text-sm text-gray-600 mt-1">
                            {itemCounts[location.id]} items
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
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#9CA3AF"
                    />
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        <View className="px-6 py-4 border-t border-gray-200 space-y-3">
          {/* Use Current Location Button */}
          {breadcrumb.length > 0 && (
            <Pressable
              onPress={handleSelectCurrentLocation}
              className="bg-blue-600 rounded-xl py-4 active:bg-blue-700"
            >
              <Text className="text-white text-center text-base font-semibold">
                Use {breadcrumb[breadcrumb.length - 1].name}
              </Text>
            </Pressable>
          )}

          {/* Add New Location Button */}
          {allowCreateNew && user?.role === "admin" && (
            <Pressable
              onPress={() => setShowAddModal(true)}
              className="bg-gray-100 rounded-xl py-4 active:bg-gray-200"
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="add-circle-outline" size={20} color="#374151" />
                <Text className="text-gray-900 text-base font-semibold ml-2">
                  Add New Location Here
                </Text>
              </View>
            </Pressable>
          )}
        </View>

        {/* Add Location Modal */}
        <Modal
          visible={showAddModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowAddModal(false)}
        >
          <View className="flex-1 bg-black/50 justify-center items-center px-6">
            <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
              <Text className="text-xl font-bold text-gray-900 mb-4">
                Add New Location
              </Text>

              <Text className="text-sm text-gray-600 mb-2">
                Location Name
              </Text>
              <TextInput
                value={newLocationName}
                onChangeText={setNewLocationName}
                placeholder="e.g., Room 1, Shelf A, Bin 5"
                placeholderTextColor="#9CA3AF"
                className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
                autoFocus
              />

              <Text className="text-sm text-gray-600 mb-2">
                Location Code
              </Text>
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
                  <Text className="text-sm text-gray-600 mb-2">Warehouse</Text>
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

              <View className="flex-row space-x-3">
                <Pressable
                  onPress={() => {
                    setNewLocationName("");
                    setShowAddModal(false);
                  }}
                  className="flex-1 bg-gray-100 rounded-xl py-3 active:bg-gray-200"
                >
                  <Text className="text-gray-900 text-center text-base font-semibold">
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleAddLocation}
                  className="flex-1 bg-blue-600 rounded-xl py-3 active:bg-blue-700"
                >
                  <Text className="text-white text-center text-base font-semibold">
                    Add
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}
