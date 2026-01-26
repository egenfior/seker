import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";

type Props = NativeStackScreenProps<RootStackParamList, "Search">;

export default function SearchScreen({ navigation }: Props) {
  const [q, setQ] = useState("iPhone 13");
  const [country, setCountry] = useState("GHA");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Search listings</Text>

      <TextInput style={styles.input} value={q} onChangeText={setQ} placeholder="e.g., iPhone 14 Pro" />
      <TextInput style={styles.input} value={country} onChangeText={setCountry} placeholder="Country code (GHA, NGA...)" />

      <Pressable style={styles.button} onPress={() => navigation.navigate("Results", { q, country: country.toUpperCase() })}>
        <Text style={styles.buttonText}>Search</Text>
      </Pressable>

      <Text style={styles.muted}>
        Tip: When using a physical phone, your API URL may need to be your computer's LAN IP (not localhost).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 18, gap: 12 },
  title: { fontSize: 20, fontWeight: "700" },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 12 },
  button: { backgroundColor: "#111", padding: 12, borderRadius: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700" },
  muted: { color: "#555", marginTop: 6 }
});
