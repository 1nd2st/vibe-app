export type RootStackParamList = {
  Collections: undefined;
  CollectionDetail: { collectionId: string };
  NewCollection: undefined;
  AddItem: { collectionId: string };
  ItemDetail: { itemId: string; collectionId: string };
  Camera: { collectionId: string; itemId?: string };
  SignCollection: { collectionId: string };
};
