import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAllRecords } from "../services/mobileApi";

type UserProfile = {
  username: string;
  role?: string;
};

type Product = {
  id: number;
  name: string;
  sku?: string;
  stock_quantity: number | string;
  low_stock_threshold: number | string;
  is_active?: boolean;
};

type Order = {
  id: number;
  customer_name?: string;
  total_amount: number | string;
  status: "PLACED" | "COMPLETED" | "CANCELLED";
  created_at: string;
};

type DashboardData = {
  products: Product[];
  lowStock: Product[];
  orders: Order[];
};

type Props = {
  user: UserProfile;
  onLogout: () => Promise<void>;
};

const asNumber = (value: number | string | undefined) =>
  Number(value ?? 0) || 0;

const currency = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const orderDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

function StatCard({
  label,
  value,
  icon,
  tint,
  fill,
}: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  tint: string;
  fill: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: fill }]}>
        <Ionicons name={icon} size={21} color={tint} />
      </View>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function MobileDashboard({ user, onLogout }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (pullToRefresh = false) => {
    if (pullToRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      // Sequential requests also avoid competing refresh requests when an
      // access token expires and Django rotates refresh tokens.
      const products = await getAllRecords<Product>("/products/");
      const orders = await getAllRecords<Order>("/orders/");
      const lowStock = await getAllRecords<Product>("/inventory/low-stock/");
      setData({ products, orders, lowStock });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(
        message === "Network request failed"
          ? "Cannot reach Django. Check your Wi-Fi and laptop IP address."
          : message
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const totalProducts = data?.products.length ?? 0;
  const stockUnits =
    data?.products.reduce((sum, product) => sum + asNumber(product.stock_quantity), 0) ?? 0;
  const totalOrders = data?.orders.length ?? 0;
  const totalSales =
    data?.orders.reduce(
      (sum, order) =>
        sum + (order.status !== "CANCELLED" ? asNumber(order.total_amount) : 0),
      0
    ) ?? 0;
  const recentOrders = [...(data?.orders ?? [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4);
  const lowStock = (data?.lowStock ?? []).filter((product) => product.is_active !== false);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadDashboard(true)}
            tintColor="#2563EB"
            colors={["#2563EB"]}
          />
        }
      >
        <View style={styles.hero}>
          <View style={styles.topRow}>
            <View style={styles.logoMark}>
              <Text style={styles.logoText}>SI</Text>
            </View>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => void onLogout()}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
            >
              <Ionicons name="log-out-outline" size={17} color="#E2E8F0" />
              <Text style={styles.logoutText}>Sign out</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.heroEyebrow}>SMART INVENTORY</Text>
          <Text style={styles.heroTitle}>Welcome back, {user.username}</Text>
          <Text style={styles.heroSubtitle}>Your business at a glance</Text>
          <View style={styles.rolePill}>
            <View style={styles.onlineDot} />
            <Text style={styles.roleText}>{user.role || "Inventory User"}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Overview</Text>
              <Text style={styles.sectionSubtitle}>Live data from Django</Text>
            </View>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={() => void loadDashboard()}
              accessibilityRole="button"
              accessibilityLabel="Refresh dashboard"
              disabled={loading}
            >
              <Ionicons name="refresh" size={20} color="#2563EB" />
            </TouchableOpacity>
          </View>

          {loading && !data ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loadingText}>Loading dashboard...</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle-outline" size={22} color="#B91C1C" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => void loadDashboard()}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {data ? (
            <>
              <View style={styles.statsGrid}>
                <StatCard
                  label="Total products"
                  value={String(totalProducts)}
                  icon="cube-outline"
                  tint="#2563EB"
                  fill="#EFF6FF"
                />
                <StatCard
                  label="Stock units"
                  value={String(stockUnits)}
                  icon="layers-outline"
                  tint="#059669"
                  fill="#ECFDF5"
                />
                <StatCard
                  label="Total orders"
                  value={String(totalOrders)}
                  icon="receipt-outline"
                  tint="#7C3AED"
                  fill="#F5F3FF"
                />
                <StatCard
                  label="Sales value"
                  value={currency(totalSales)}
                  icon="wallet-outline"
                  tint="#EA580C"
                  fill="#FFF7ED"
                />
              </View>

              <View style={styles.sectionCard}>
                <View style={styles.cardTitleRow}>
                  <View style={styles.titleWithIcon}>
                    <Ionicons name="warning-outline" size={21} color="#D97706" />
                    <Text style={styles.cardTitle}>Low-stock alerts</Text>
                  </View>
                  <View style={styles.alertCountPill}>
                    <Text style={styles.alertCountText}>{lowStock.length}</Text>
                  </View>
                </View>
                {lowStock.length === 0 ? (
                  <Text style={styles.emptyText}>All active products are above their low-stock thresholds.</Text>
                ) : (
                  lowStock.slice(0, 4).map((product) => (
                    <View key={product.id} style={styles.listRow}>
                      <View style={styles.listMain}>
                        <Text style={styles.itemName} numberOfLines={1}>{product.name}</Text>
                        <Text style={styles.itemSub}>Threshold: {asNumber(product.low_stock_threshold)} units</Text>
                      </View>
                      <Text style={styles.stockBadge}>{asNumber(product.stock_quantity)} left</Text>
                    </View>
                  ))
                )}
                {lowStock.length > 4 ? (
                  <Text style={styles.extraText}>+{lowStock.length - 4} more low-stock products</Text>
                ) : null}
              </View>

              <View style={styles.sectionCard}>
                <View style={styles.cardTitleRow}>
                  <View style={styles.titleWithIcon}>
                    <Ionicons name="time-outline" size={21} color="#2563EB" />
                    <Text style={styles.cardTitle}>Recent orders</Text>
                  </View>
                  <Text style={styles.countText}>{totalOrders} total</Text>
                </View>
                {recentOrders.length === 0 ? (
                  <Text style={styles.emptyText}>No orders have been created yet.</Text>
                ) : (
                  recentOrders.map((order) => (
                    <View key={order.id} style={styles.listRow}>
                      <View style={styles.listMain}>
                        <Text style={styles.itemName}>Order #{order.id}</Text>
                        <Text style={styles.itemSub} numberOfLines={1}>
                          {order.customer_name || "Customer"} · {orderDate(order.created_at)}
                        </Text>
                        <Text
                          style={[
                            styles.orderStatus,
                            order.status === "CANCELLED"
                              ? styles.statusCancelled
                              : order.status === "COMPLETED"
                                ? styles.statusCompleted
                                : styles.statusPlaced,
                          ]}
                        >
                          {order.status}
                        </Text>
                      </View>
                      <Text style={styles.orderPrice}>{currency(asNumber(order.total_amount))}</Text>
                    </View>
                  ))
                )}
              </View>

              <Text style={styles.note}>
                Sales value includes placed and completed orders, excluding cancelled orders.
                Pull down to refresh. Product, Inventory and Order screens are next.
              </Text>
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F1F5F9" },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 30 },
  hero: { backgroundColor: "#101D37", paddingHorizontal: 22, paddingTop: 18, paddingBottom: 30 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 27 },
  logoMark: { width: 42, height: 42, backgroundColor: "#2563EB", borderRadius: 13, alignItems: "center", justifyContent: "center" },
  logoText: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  logoutButton: { flexDirection: "row", alignItems: "center", gap: 7, padding: 9 },
  logoutText: { color: "#E2E8F0", fontWeight: "600", fontSize: 13 },
  heroEyebrow: { color: "#93C5FD", fontSize: 11, fontWeight: "800", letterSpacing: 1.7 },
  heroTitle: { color: "#FFFFFF", fontSize: 25, fontWeight: "800", marginTop: 8 },
  heroSubtitle: { color: "#B6C5DC", fontSize: 14, marginTop: 7 },
  rolePill: { alignSelf: "flex-start", flexDirection: "row", gap: 7, alignItems: "center", marginTop: 19, backgroundColor: "#233653", paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#34D399" },
  roleText: { color: "#DBEAFE", fontSize: 12, fontWeight: "600" },
  content: { paddingHorizontal: 16, paddingTop: 23 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  sectionSubtitle: { color: "#64748B", fontSize: 12, marginTop: 4 },
  refreshButton: { backgroundColor: "#DBEAFE", padding: 10, borderRadius: 12 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12, marginBottom: 17 },
  statCard: { backgroundColor: "#FFFFFF", width: "48.3%", borderRadius: 18, padding: 16, minHeight: 147, borderWidth: 1, borderColor: "#E2E8F0" },
  statIcon: { width: 39, height: 39, borderRadius: 12, justifyContent: "center", alignItems: "center", marginBottom: 13 },
  statValue: { color: "#0F172A", fontSize: 23, fontWeight: "800" },
  statLabel: { color: "#64748B", marginTop: 7, fontSize: 12, fontWeight: "600" },
  sectionCard: { backgroundColor: "#FFFFFF", borderRadius: 18, paddingHorizontal: 17, paddingTop: 17, paddingBottom: 7, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 16 },
  cardTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 13 },
  titleWithIcon: { flexDirection: "row", alignItems: "center", gap: 9 },
  cardTitle: { color: "#0F172A", fontSize: 16, fontWeight: "800" },
  alertCountPill: { backgroundColor: "#FEF3C7", paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20 },
  alertCountText: { fontSize: 12, fontWeight: "800", color: "#92400E" },
  countText: { fontSize: 12, color: "#64748B" },
  listRow: { paddingVertical: 13, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F1F5F9", gap: 12 },
  listMain: { flex: 1 },
  itemName: { fontSize: 14, color: "#0F172A", fontWeight: "700" },
  itemSub: { fontSize: 12, color: "#64748B", marginTop: 4 },
  stockBadge: { color: "#B45309", backgroundColor: "#FFFBEB", borderRadius: 9, paddingVertical: 7, paddingHorizontal: 9, fontSize: 12, fontWeight: "800" },
  extraText: { color: "#64748B", fontSize: 12, marginTop: 8, marginBottom: 15 },
  emptyText: { color: "#64748B", fontSize: 13, lineHeight: 21, paddingVertical: 11, marginBottom: 10 },
  orderPrice: { fontSize: 13, fontWeight: "800", color: "#0F172A" },
  orderStatus: { fontSize: 10, fontWeight: "800", marginTop: 6 },
  statusPlaced: { color: "#2563EB" },
  statusCompleted: { color: "#059669" },
  statusCancelled: { color: "#DC2626" },
  note: { color: "#64748B", fontSize: 12, lineHeight: 19, paddingHorizontal: 4, marginBottom: 30 },
  centerBox: { paddingVertical: 42, alignItems: "center" },
  loadingText: { fontSize: 13, color: "#64748B", marginTop: 15 },
  errorCard: { backgroundColor: "#FEF2F2", padding: 16, borderRadius: 14, marginBottom: 14, gap: 8 },
  errorText: { color: "#991B1B", fontSize: 13, lineHeight: 20 },
  retryText: { color: "#2563EB", fontWeight: "800", marginTop: 3 },
});
