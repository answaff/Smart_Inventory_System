import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import MobileDashboard from "./MobileDashboard";
import ProductsScreen from "../screens/ProductsScreen";
import InventoryScreen from "../screens/InventoryScreen";
import CustomersScreen from "../screens/CustomersScreen";
import OrdersScreen from "../screens/OrdersScreen";
import ReportsScreen from "../screens/ReportsScreen";
import type { UserProfile } from "../types/models";

type Tab = "home" | "products" | "inventory" | "customers" | "orders" | "reports";
type NavItem = { id: Tab; text: string; icon: React.ComponentProps<typeof Ionicons>["name"] };
const tabs: NavItem[] = [
  { id: "home", text: "Home", icon: "grid-outline" },
  { id: "products", text: "Products", icon: "cube-outline" },
  { id: "inventory", text: "Stock", icon: "swap-horizontal-outline" },
  { id: "customers", text: "Customers", icon: "people-outline" },
  { id: "orders", text: "Orders", icon: "receipt-outline" },
  { id: "reports", text: "Reports", icon: "bar-chart-outline" },
];
export default function InventoryMobileApp({ user, onLogout }: { user: UserProfile; onLogout: () => Promise<void> }) {
  const [tab, setTab] = useState<Tab>("home");
  return <View style={styles.root}>
    <View style={styles.content}>
      {tab === "home" && <MobileDashboard user={user} onLogout={onLogout} />}
      {tab === "products" && <ProductsScreen user={user} />}
      {tab === "inventory" && <InventoryScreen />}
      {tab === "customers" && <CustomersScreen />}
      {tab === "orders" && <OrdersScreen />}
      {tab === "reports" && <ReportsScreen />}
    </View>
    <SafeAreaView edges={["bottom"]} style={styles.footer}>
      <View style={styles.tabRow}>
        {tabs.map((item) => {
          const active = tab === item.id;
          return <TouchableOpacity key={item.id} onPress={() => setTab(item.id)} accessibilityRole="tab" accessibilityState={{ selected: active }} style={styles.tab}>
            <Ionicons name={item.icon} size={21} color={active ? "#2563EB" : "#64748B"}/>
            <Text numberOfLines={1} style={[styles.tabText, active && styles.activeText]}>{item.text}</Text>
          </TouchableOpacity>;
        })}
      </View>
    </SafeAreaView>
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F1F5F9" }, content: { flex: 1 },
  footer: { backgroundColor: "#FFFFFF", borderTopColor: "#E2E8F0", borderTopWidth: 1 },
  tabRow: { flexDirection: "row", alignItems: "center", paddingTop: 9, paddingBottom: 4 },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 5, minWidth: 0 },
  tabText: { fontSize: 9, color: "#64748B", fontWeight: "700" },
  activeText: { color: "#2563EB" },
});
