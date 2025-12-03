import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { RootStackParamList } from "./src/navigation/RootNavigator";

// Screens
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

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Customers"
            screenOptions={{
              headerShown: false,
              animation: "default",
            }}
          >
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
          </Stack.Navigator>
          <StatusBar style="auto" />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
