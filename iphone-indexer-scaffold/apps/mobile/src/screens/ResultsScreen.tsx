import React, { useEffect, useState } from "react";
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import { fetchListings } from "../lib/api";
import type { Listing } from "@iphone-indexer/shared";

type Props = NativeStackScreenProps<RootStackParamList, "Results">;

export default function ResultsScreen({ route, navigation }: Props) {
  const { q, country } = route.params;
  const [items, setItems] = useState<Listing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigation.setOptions({ title: `Results: ${q}` });
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchListings(q);
        setItems(res.items);
      } catch (e: any) {
        setError(e?.message ?? "Unknown error");
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [q]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => navigation.navigate("Detail", { id: item.id, country })}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.muted}>
              {item.source.toUpperCase()} • {item.model} • {item.storage_gb}GB • {item.condition}
            </Text>
            <Text style={styles.price}>${item.price_usd.toFixed(2)}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 18 },
  muted: { color: "#555" },
  error: { color: "#b91c1c", fontWeight: "700" },
  card: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 14, padding: 12 },
  cardTitle: { fontWeight: "700" },
  price: { marginTop: 6, fontWeight: "800" }
});
