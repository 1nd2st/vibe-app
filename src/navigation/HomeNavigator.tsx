// Home navigation stack
export type HomeStackParamList = {
  Login: undefined;
  Home: undefined;
  Customers: undefined;
  Collections: undefined;
  Settings: undefined;
  InventoryMenu: undefined;
  ScanPutAway: undefined;
  SearchItem: undefined;
  BrowseLocations: undefined;
  InventoryItemDetail: { itemId: number };
  LocationPicker: {
    onSelectLocation: (locationId: number, fullPath: string) => void;
  };
  InventorySettings: undefined;
  UserManagement: undefined;
  PasswordPolicy: undefined;
  ChangePassword: undefined;
};
