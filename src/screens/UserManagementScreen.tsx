// User Management screen - Admin only CRUD for users
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { HomeStackParamList } from "../navigation/HomeNavigator";
import {
  getUsers,
  createUser,
  updateUserRole,
  toggleUserActive,
  resetUserPassword,
  type User,
} from "../database/db-enhanced";
import { useAuthStore } from "../state/authStore";
import { PERMISSION_PRESETS, PERMISSION_GROUPS } from "../types/permissions";

type Props = NativeStackScreenProps<HomeStackParamList, "UserManagement">;

export default function UserManagementScreen({ navigation }: Props) {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newUserRole, setNewUserRole] = useState<"user" | "admin">("user");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const allUsers = await getUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error("Failed to load users:", error);
      Alert.alert("Error", "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUsername.trim()) {
      Alert.alert("Error", "Please enter a username");
      return;
    }

    if (!currentUser?.id) {
      Alert.alert("Error", "Current user ID not found");
      return;
    }

    setIsCreating(true);
    try {
      const { tempPassword } = await createUser(
        newUsername.trim(),
        newUserRole,
        currentUser.id
      );

      Alert.alert(
        "User Created",
        `Username: ${newUsername}\nTemporary Password: ${tempPassword}\n\nThe user must change this password on first login.`,
        [{ text: "OK", onPress: () => {
          setNewUsername("");
          setNewUserRole("user");
          setShowAddModal(false);
          loadUsers();
        }}]
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create user");
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (userId: number, isActive: boolean, username: string) => {
    if (!currentUser?.id) return;

    const action = isActive ? "deactivate" : "activate";
    Alert.alert(
      `${isActive ? "Deactivate" : "Activate"} User`,
      `Are you sure you want to ${action} ${username}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isActive ? "Deactivate" : "Activate",
          onPress: async () => {
            try {
              await toggleUserActive(userId, !isActive, currentUser.id);
              loadUsers();
              Alert.alert("Success", `User ${action}d successfully`);
            } catch (error: any) {
              Alert.alert("Error", error.message || `Failed to ${action} user`);
            }
          },
        },
      ]
    );
  };

  const handleResetPassword = async (userId: number, username: string) => {
    if (!currentUser?.id) return;

    Alert.alert(
      "Reset Password",
      `Reset password for ${username}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          onPress: async () => {
            try {
              const tempPassword = await resetUserPassword(userId, currentUser.id);
              Alert.alert(
                "Password Reset",
                `New temporary password for ${username}:\n\n${tempPassword}\n\nUser must change this on next login.`
              );
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to reset password");
            }
          },
        },
      ]
    );
  };

  const handleChangeRole = async (userId: number, currentRole: string, username: string) => {
    if (!currentUser?.id) return;

    const newRole: "user" | "admin" = currentRole === "admin" ? "user" : "admin";

    Alert.alert(
      "Change Role",
      `Change ${username} from ${currentRole} to ${newRole}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Change",
          onPress: async () => {
            try {
              await updateUserRole(userId, newRole, currentUser.id);
              loadUsers();
              Alert.alert("Success", "User role updated");
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to update role");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-6 py-4 bg-white border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Pressable onPress={() => navigation.goBack()} className="mr-4 p-2 -ml-2">
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </Pressable>
            <Text className="text-2xl font-bold text-gray-900">User Management</Text>
          </View>
          <View className="flex-row items-center">
            <Pressable onPress={() => setShowPermissionsModal(true)} className="p-2 mr-1">
              <Ionicons name="shield-checkmark-outline" size={26} color="#7C3AED" />
            </Pressable>
            <Pressable onPress={() => setShowAddModal(true)} className="p-2">
              <Ionicons name="add-circle" size={28} color="#2563EB" />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-4">
        {isLoading ? (
          <View className="py-12">
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : (
          <View className="space-y-3">
            {users.map((u) => (
              <View key={u.id} className="bg-white rounded-xl p-4 border border-gray-200">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text className="text-lg font-bold text-gray-900">{u.username}</Text>
                      {u.id === currentUser?.id && (
                        <View className="ml-2 bg-blue-100 px-2 py-1 rounded">
                          <Text className="text-xs font-semibold text-blue-900">You</Text>
                        </View>
                      )}
                    </View>
                    <View className="flex-row items-center mt-1">
                      <View className={`px-2 py-1 rounded ${u.role === "admin" ? "bg-purple-100" : "bg-gray-100"}`}>
                        <Text className={`text-xs font-semibold ${u.role === "admin" ? "text-purple-900" : "text-gray-700"}`}>
                          {u.role}
                        </Text>
                      </View>
                      {!u.is_active && (
                        <View className="ml-2 bg-red-100 px-2 py-1 rounded">
                          <Text className="text-xs font-semibold text-red-900">Inactive</Text>
                        </View>
                      )}
                      {u.must_change_password && (
                        <View className="ml-2 bg-orange-100 px-2 py-1 rounded">
                          <Text className="text-xs font-semibold text-orange-900">Must change password</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Actions */}
                {u.id !== currentUser?.id && (
                  <View className="flex-row space-x-2 pt-3 border-t border-gray-200">
                    <Pressable
                      onPress={() => handleChangeRole(u.id, u.role, u.username)}
                      className="flex-1 bg-purple-100 rounded-lg py-2 active:bg-purple-200"
                    >
                      <Text className="text-purple-900 text-center text-sm font-medium">
                        {u.role === "admin" ? "Make User" : "Make Admin"}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleResetPassword(u.id, u.username)}
                      className="flex-1 bg-blue-100 rounded-lg py-2 active:bg-blue-200"
                    >
                      <Text className="text-blue-900 text-center text-sm font-medium">
                        Reset Password
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleToggleActive(u.id, u.is_active, u.username)}
                      className={`flex-1 rounded-lg py-2 ${u.is_active ? "bg-red-100 active:bg-red-200" : "bg-green-100 active:bg-green-200"}`}
                    >
                      <Text className={`text-center text-sm font-medium ${u.is_active ? "text-red-900" : "text-green-900"}`}>
                        {u.is_active ? "Deactivate" : "Activate"}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add User Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white">
          <View className="px-6 py-4 border-b border-gray-200">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-bold text-gray-900">Add New User</Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={28} color="#374151" />
              </Pressable>
            </View>
          </View>

          <View className="flex-1 px-6 py-6">
            <Text className="text-sm font-medium text-gray-700 mb-2">Username</Text>
            <TextInput
              value={newUsername}
              onChangeText={setNewUsername}
              placeholder="Enter username"
              placeholderTextColor="#9CA3AF"
              className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
              autoFocus
              autoCapitalize="none"
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">Role</Text>
            <View className="flex-row space-x-3 mb-4">
              <Pressable
                onPress={() => setNewUserRole("user")}
                className={`flex-1 py-3 rounded-xl border-2 ${newUserRole === "user" ? "bg-blue-50 border-blue-500" : "bg-gray-50 border-gray-200"}`}
              >
                <Text className={`text-center font-semibold ${newUserRole === "user" ? "text-blue-900" : "text-gray-700"}`}>
                  User
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setNewUserRole("admin")}
                className={`flex-1 py-3 rounded-xl border-2 ${newUserRole === "admin" ? "bg-purple-50 border-purple-500" : "bg-gray-50 border-gray-200"}`}
              >
                <Text className={`text-center font-semibold ${newUserRole === "admin" ? "text-purple-900" : "text-gray-700"}`}>
                  Admin
                </Text>
              </Pressable>
            </View>

            <View className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <Text className="text-sm text-blue-900">
                A temporary password will be generated. The user must change it on first login.
              </Text>
            </View>
          </View>

          <View className="px-6 py-4 border-t border-gray-200">
            <Pressable
              onPress={handleCreateUser}
              disabled={isCreating}
              className={`rounded-xl py-4 ${isCreating ? "bg-gray-400" : "bg-blue-600 active:bg-blue-700"}`}
            >
              {isCreating ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center font-semibold">Create User</Text>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Permission Presets Modal */}
      <Modal visible={showPermissionsModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white">
          <View className="px-6 py-4 border-b border-gray-200">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-bold text-gray-900">Permission Presets</Text>
              <Pressable onPress={() => setShowPermissionsModal(false)}>
                <Ionicons name="close" size={28} color="#374151" />
              </Pressable>
            </View>
          </View>

          <ScrollView className="flex-1 px-6 py-6">
            <View className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
              <View className="flex-row items-start">
                <Ionicons name="information-circle" size={24} color="#7C3AED" style={{ marginRight: 8 }} />
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-purple-900 mb-1">
                    About Permission Presets
                  </Text>
                  <Text className="text-xs text-purple-700 leading-5">
                    These presets define what users can do in the app. Admins always have full access. Users can be assigned different presets based on their role.
                  </Text>
                </View>
              </View>
            </View>

            {/* Permission Presets */}
            {PERMISSION_PRESETS.map((preset) => (
              <View key={preset.id} className="bg-white rounded-xl p-4 border border-gray-200 mb-4">
                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-gray-900">{preset.name}</Text>
                    <Text className="text-sm text-gray-600 mt-1">{preset.description}</Text>
                  </View>
                  <View className={`px-3 py-1 rounded-full ${
                    preset.role === "admin" ? "bg-purple-100" :
                    preset.role === "viewer" ? "bg-gray-100" :
                    "bg-blue-100"
                  }`}>
                    <Text className={`text-xs font-semibold ${
                      preset.role === "admin" ? "text-purple-900" :
                      preset.role === "viewer" ? "text-gray-700" :
                      "text-blue-900"
                    }`}>
                      {preset.role}
                    </Text>
                  </View>
                </View>

                {/* Permission Groups */}
                <View className="mt-3 pt-3 border-t border-gray-100">
                  <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Permission Groups
                  </Text>
                  {preset.groups.map((group) => (
                    <View key={group.id} className="mb-3">
                      <View className="flex-row items-center mb-1">
                        <Ionicons
                          name={
                            group.id === "collections" ? "folder-outline" :
                            group.id === "items" ? "cube-outline" :
                            group.id === "photos" ? "camera-outline" :
                            group.id === "inventory" ? "qr-code-outline" :
                            group.id === "locations" ? "location-outline" :
                            "shield-checkmark-outline"
                          }
                          size={16}
                          color="#6B7280"
                          style={{ marginRight: 6 }}
                        />
                        <Text className="text-sm font-semibold text-gray-900">{group.name}</Text>
                      </View>
                      <View className="flex-row flex-wrap ml-6">
                        {group.permissions.map((perm) => (
                          <View key={perm} className="bg-gray-100 rounded px-2 py-1 mr-2 mb-1">
                            <Text className="text-xs text-gray-700">
                              {perm.split(".")[1].replace("_", " ")}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))}

            {/* All Permission Groups Reference */}
            <View className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-4">
              <Text className="text-sm font-bold text-gray-900 mb-3">All Permission Groups</Text>
              {PERMISSION_GROUPS.map((group) => (
                <View key={group.id} className="mb-3 pb-3 border-b border-gray-200 last:border-b-0">
                  <View className="flex-row items-start mb-2">
                    <Ionicons
                      name={
                        group.id === "collections" ? "folder" :
                        group.id === "items" ? "cube" :
                        group.id === "photos" ? "camera" :
                        group.id === "inventory" ? "qr-code" :
                        group.id === "locations" ? "location" :
                        "shield-checkmark"
                      }
                      size={18}
                      color="#2563EB"
                      style={{ marginRight: 8, marginTop: 2 }}
                    />
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-gray-900">{group.name}</Text>
                      <Text className="text-xs text-gray-600 mt-1">{group.description}</Text>
                    </View>
                  </View>
                  <View className="flex-row flex-wrap ml-7">
                    {group.permissions.map((perm) => (
                      <View key={perm} className="bg-white border border-gray-300 rounded px-2 py-1 mr-2 mb-1">
                        <Text className="text-xs text-gray-700">{perm}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
