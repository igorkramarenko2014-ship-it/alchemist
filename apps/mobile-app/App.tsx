import { computeMobileShellAgentAjiChatFusion } from "@alchemist/shared-engine";
import { Text, View } from "react-native";

export default function App() {
  const fusion = computeMobileShellAgentAjiChatFusion();
  const line = fusion.fusionLines[0] ?? "";
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#111827", padding: 16 }}>
      <Text style={{ color: "#5EEAD4", fontSize: 18 }}>Alchemist</Text>
      <Text style={{ color: "#9ca3af", marginTop: 8 }}>Mobile app</Text>
      {line ? (
        <Text style={{ color: "#6b7280", marginTop: 12, fontSize: 11, textAlign: "center", maxWidth: 280 }}>
          {line}
        </Text>
      ) : null}
    </View>
  );
}
