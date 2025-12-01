export type RootStackParamList = {
  Customers: undefined;
  CustomerDetail: { customerId: string };
  Collections: undefined;
  CollectionDetail: { collectionId: string };
  NewCollection: { customerId?: string };
  AddItem: { collectionId: string };
  ItemDetail: { itemId: string; collectionId: string };
  Camera: { collectionId: string; itemId?: string };
  PhotoAnnotation: { itemId: string; photoId: string };
  QRCodeDisplay: { collectionId: string; itemIds?: string[] };
  SignCollection: { collectionId: string };
  Settings: undefined;
  QRScanner: undefined;
};
