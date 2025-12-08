import React from "react";
import { View, Text, Pressable } from "react-native";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error("[ErrorBoundary] Caught error:", error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Error details:", error, errorInfo);
  }

  handleReset = () => {
    console.log("[ErrorBoundary] User requested reset");
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#fff",
            padding: 20,
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              color: "#d32f2f",
              marginBottom: 10,
            }}
          >
            Something went wrong
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#666",
              textAlign: "center",
              marginBottom: 20,
            }}
          >
            {this.state.error?.message || "An unexpected error occurred"}
          </Text>
          <Pressable
            onPress={this.handleReset}
            style={{
              backgroundColor: "#2196F3",
              padding: 12,
              borderRadius: 8,
              marginBottom: 10,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 16 }}>Try Again</Text>
          </Pressable>
          {__DEV__ && (
            <Text
              style={{
                fontSize: 10,
                color: "#999",
                textAlign: "center",
                marginTop: 20,
              }}
            >
              {this.state.error?.stack}
            </Text>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}
