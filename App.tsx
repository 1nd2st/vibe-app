import { StatusBar } from "expo-status-bar";
import { View, Text, Pressable } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import { useEffect, useState } from "react";
import { useAuthStore } from "./src/state/authStore";
import { ErrorBoundary } from "./src/components/ErrorBoundary";

// Collection screens (existing)
import { RootStackParamList } from "./src/navigation/RootNavigator";
import CustomersScreen from "./src/screens/CustomersScreen";
import CustomerDetailScreen from "./src/screens/CustomerDetailScreen";
import CollectionsScreen from "./src/screens/CollectionsScreen";
import NewCollectionScreen from "./src/screens/NewCollectionScreen";
import CollectionDetailScreen from "./src/screens/CollectionDetailScreen";
import AddItemScreen from "./src/screens/AddItemScreen";
import CameraScreen from "./src/screens/CameraScreen";
import ItemDetailScreen from "./src/screens/ItemDetailScreen";
import PhotoAnnotationScreen from "./src/screens/PhotoAnnotationScreen";
import QRCodeDisplayScreen from "./src/screens/QRCodeDisplayScreen";
import SignCollectionScreen from "./src/screens/SignCollectionScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import QRScannerScreen from "./src/screens/QRScannerScreen";

// Inventory Management screens (new)
import { HomeStackParamList } from "./src/navigation/HomeNavigator";
import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import InventoryMenuScreen from "./src/screens/InventoryMenuScreen";
import ScanPutAwayScreen from "./src/screens/ScanPutAwayScreen";
import SearchItemScreen from "./src/screens/SearchItemScreen";
import InventoryItemDetailScreen from "./src/screens/InventoryItemDetailScreen";
import BrowseLocationsScreen from "./src/screens/BrowseLocationsScreen";
import UserManagementScreen from "./src/screens/UserManagementScreen";
import PasswordPolicyScreen from "./src/screens/PasswordPolicyScreen";
import ChangePasswordScreen from "./src/screens/ChangePasswordScreen";

/*
IMPORTANT NOTICE: DO NOT REMOVE
There are already environment keys in the project.
Before telling the user to add them, check if you already have access to the required keys through bash.
Directly access them with process.env.${key}

Correct usage:
process.env.EXPO_PUBLIC_VIBECODE_{key}
//directly access the key

Incorrect usage:
import { OPENAI_API_KEY } from '@env';
//don't use @env, its depreicated

Incorrect usage:
import Constants from 'expo-constants';
const openai_api_key = Constants.expoConfig.extra.apikey;
//don't use expo-constants, its depreicated

*/

// Merge navigation types
type AppStackParamList = RootStackParamList & HomeStackParamList;

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function App() {
  const { isAuthenticated, initializeDB } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initAttempts, setInitAttempts] = useState(0);

  useEffect(() => {
    // Initialize database on app start
    const initialize = async () => {
      try {
        console.log(`[APP] Initialization attempt ${initAttempts + 1}`);
        await initializeDB();
        console.log("[APP] Database initialized successfully");
        setIsReady(true);
        setError(null);
      } catch (err) {
        console.error("[APP] Failed to initialize app:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to initialize app";
        console.error("[APP] Error details:", errorMessage);
        setError(errorMessage);
        // Set ready anyway to show error screen instead of infinite loading
        setIsReady(true);
      }
    };

    initialize();
  }, [initAttempts]);

  if (!isReady) {
    // Show a minimal loading screen
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <Text style={{ fontSize: 18, color: "#000", marginBottom: 10 }}>Loading...</Text>
        <Text style={{ fontSize: 12, color: "#666", textAlign: "center", paddingHorizontal: 20 }}>
          Initializing database...
        </Text>
      </View>
    );
  }

  if (error) {
    // Show error screen instead of crashing
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff", padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: "bold", color: "#d32f2f", marginBottom: 10 }}>
          Initialization Error
        </Text>
        <Text style={{ fontSize: 14, color: "#666", textAlign: "center", marginBottom: 20 }}>
          {error}
        </Text>
        <Pressable
          onPress={() => {
            console.log("[APP] User requested retry");
            setError(null);
            setIsReady(false);
            setInitAttempts((prev) => prev + 1);
          }}
          style={{ backgroundColor: "#2196F3", padding: 12, borderRadius: 8, marginBottom: 10 }}
        >
          <Text style={{ color: "#fff", fontSize: 16 }}>Retry Initialization</Text>
        </Pressable>
        <Text style={{ fontSize: 11, color: "#999", textAlign: "center", marginTop: 10 }}>
          Attempt: {initAttempts + 1}
        </Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ActionSheetProvider>
            <NavigationContainer>
              <Stack.Navigator
                initialRouteName={isAuthenticated ? "Home" : "Login"}
                screenOptions={{
                  headerShown: false,
                  animation: "default",
                }}
              >
                {!isAuthenticated ? (
                  // Auth screens
                  <Stack.Screen name="Login">
                    {(props) => (
                      <LoginScreen
                        {...props}
                        onLoginSuccess={() => {
                          // Navigation will handle automatically via state
                        }}
                      />
                    )}
                  </Stack.Screen>
                ) : (
                  <>
                    {/* Home and Inventory Management screens */}
                    <Stack.Screen name="Home" component={HomeScreen} />
                    <Stack.Screen name="InventoryMenu" component={InventoryMenuScreen} />
                    <Stack.Screen name="ScanPutAway" component={ScanPutAwayScreen} />
                    <Stack.Screen name="SearchItem" component={SearchItemScreen} />
                    <Stack.Screen name="InventoryItemDetail" component={InventoryItemDetailScreen} />
                    <Stack.Screen name="BrowseLocations" component={BrowseLocationsScreen} />
                    <Stack.Screen name="UserManagement" component={UserManagementScreen} />
                    <Stack.Screen name="PasswordPolicy" component={PasswordPolicyScreen} />
                    <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />

                    {/* Collection screens (existing) */}
                    <Stack.Screen name="Customers" component={CustomersScreen} />
                    <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
                    <Stack.Screen name="Collections" component={CollectionsScreen} />
                    <Stack.Screen
                      name="NewCollection"
                      component={NewCollectionScreen}
                      options={{ presentation: "card" }}
                    />
                    <Stack.Screen name="CollectionDetail" component={CollectionDetailScreen} />
                    <Stack.Screen
                      name="AddItem"
                      component={AddItemScreen}
                      options={{ presentation: "modal" }}
                    />
                    <Stack.Screen
                      name="Camera"
                      component={CameraScreen}
                      options={{ presentation: "fullScreenModal" }}
                    />
                    <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
                    <Stack.Screen
                      name="PhotoAnnotation"
                      component={PhotoAnnotationScreen}
                      options={{ presentation: "fullScreenModal" }}
                    />
                    <Stack.Screen
                      name="QRCodeDisplay"
                      component={QRCodeDisplayScreen}
                      options={{ presentation: "modal" }}
                    />
                    <Stack.Screen
                      name="SignCollection"
                      component={SignCollectionScreen}
                      options={{ presentation: "modal" }}
                    />
                    <Stack.Screen name="Settings" component={SettingsScreen} />
                    <Stack.Screen
                      name="QRScanner"
                      component={QRScannerScreen}
                      options={{ presentation: "fullScreenModal" }}
                    />
                  </>
                )}
              </Stack.Navigator>
              <StatusBar style="auto" />
            </NavigationContainer>
          </ActionSheetProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
