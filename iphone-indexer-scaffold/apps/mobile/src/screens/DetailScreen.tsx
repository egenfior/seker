import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, FlatList, Linking } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import { fetchListing, fetchShippingQuote } from "../lib/api";
import type { Listing, ShippingQuote } from "@iphone-indexer/shared";

type Props = NativeStackScreenProps<RootStackParamList, "Detail">;

export default function DetailScreen({ route, navigation }: Props) {
  const { id, country } = route.params;
  const [listing, setListing] = useState<Listing | null>(null);
  const [quotes, setQuotes] = useState<ShippingQuote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingQuote, setLoadingQuote] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: "Detail" });
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const l = await fetchListing(id);
        setListing(l);
      } catch (e: any) {
        setError(e?.message ?? "Unknown error");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function loadQuote() {
    if (!listing) return;
    setLoadingQuote(true);
    setError(null);
    try {
      const res = await fetchShippingQuote(country, listing.model, listing.price_usd);
      setQuotes(res.quotes);
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
      setQuotes([]);
    } finally {
      setLoadingQuote(false);
    }
  }

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

  if (!listing) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Not found.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 12, gap: 10 }}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{listing.title}</Text>
        <Text style={styles.muted}>{listing.model} • {listing.storage_gb}GB • {listing.condition} • {listing.carrier}</Text>
        <Text style={styles.price}>${listing.price_usd.toFixed(2)}</Text>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
          <Pressable style={[styles.button, styles.secondary]} onPress={() => Linking.openURL(listing.url)}>
            <Text style={[styles.buttonText, styles.secondaryText]}>Open source</Text>
          </Pressable>

          <Pressable style={styles.button} onPress={loadQuote} disabled={loadingQuote}>
            <Text style={styles.buttonText}>{loadingQuote ? "Getting quote..." : `Shipping to ${country}`}</Text>
          </Pressable>
        </View>
      </View>

      {quotes.length > 0 && (
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "800", marginBottom: 6 }}>Shipping quotes</Text>
          <FlatList
            data={quotes}
            keyExtractor={(x, i) => `${x.carrier}-${i}`}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontWeight: "800" }}>{item.carrier}</Text>
                  <Text style={{ fontWeight: "900" }}>${item.cost_usd.toFixed(2)}</Text>
                </View>
                <Text style={styles.muted}>ETA: {item.eta_days} days{item.notes ? ` • ${item.notes}` : ""}</Text>
                <Text style={{ marginTop: 6 }}>
                  Estimated landed cost: <Text style={{ fontWeight: "900" }}>${(listing.price_usd + item.cost_usd).toFixed(2)}</Text>
                </Text>
              </View>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 18 },
  muted: { color: "#555" },
  error: { color: "#b91c1c", fontWeight: "800" },
  card: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 14, padding: 12 },
  cardTitle: { fontWeight: "800", marginBottom: 4 },
  price: { marginTop: 8, fontWeight: "900", fontSize: 18 },
  button: { backgroundColor: "#111", padding: 12, borderRadius: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "800" },
  secondary: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" },
  secondaryText: { color: "#111" }
});
