// Section menu component for navigating between main section screens
import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";

export interface SectionMenuItem {
  key: string;
  label: string;
  onPress: () => void;
}

interface SectionMenuProps {
  items: SectionMenuItem[];
  activeKey?: string;
}

export default function SectionMenu({ items, activeKey }: SectionMenuProps) {
  return (
    <View className="bg-white border-b border-gray-200">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-4"
        contentContainerStyle={{ paddingVertical: 12 }}
      >
        {items.map((item, index) => {
          const isActive = item.key === activeKey;
          return (
            <Pressable
              key={item.key}
              onPress={item.onPress}
              className={`px-6 py-3 rounded-xl mr-3 ${
                isActive
                  ? "bg-blue-600"
                  : "bg-gray-100 active:bg-gray-200"
              }`}
            >
              <Text
                className={`font-semibold ${
                  isActive ? "text-white" : "text-gray-700"
                }`}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
