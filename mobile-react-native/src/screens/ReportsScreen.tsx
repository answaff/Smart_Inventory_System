import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiList } from "../services/inventoryClient";
import { Order, Product, StockMovement, numberOf, readableDate, rupees } from "../types/models";
import { Busy, Chip, Empty, Message, MobileHeading, MobilePage, Panel, palette, pageStyles } from "../components/mobile/SharedUI";

type Period = "7" | "30" | "all";
export default function ReportsScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [period, setPeriod] = useState<Period>("30");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const nextOrders = await apiList<Order>("/orders/");
      const nextProducts = await apiList<Product>("/products/");
      const nextMovements = await apiList<StockMovement>("/inventory/movements/");
      setOrders(nextOrders); setProducts(nextProducts); setMovements(nextMovements);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load reports."); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  // Filters by calendar-day windows using device-local time.
  const cutoff = useMemo(() => {
    if (period === "all") return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    now.setDate(now.getDate() - (Number(period) - 1));
    return now;
  }, [period]);
  const inPeriod = useCallback((date: string) => {
    const parsed = new Date(date);
    return !Number.isNaN(parsed.getTime()) && (cutoff === null || parsed >= cutoff);
  }, [cutoff]);
  const selectedOrders = useMemo(() => orders.filter(o => inPeriod(o.created_at)), [orders, inPeriod]);
  const liveOrders = useMemo(() => selectedOrders.filter(o => o.status !== "CANCELLED"), [selectedOrders]);
  const sales = liveOrders.reduce((sum, order) => sum + numberOf(order.total_amount), 0);
  const completedSales = liveOrders.filter(o => o.status === "COMPLETED").reduce((sum, order) => sum + numberOf(order.total_amount), 0);
  const cancelled = selectedOrders.filter(o => o.status === "CANCELLED").length;
  const selectedMovements = useMemo(() => movements.filter(m => inPeriod(m.created_at)), [movements, inPeriod]);
  const stockIn = selectedMovements.filter(m => m.movement_type === "IN").reduce((sum, m) => sum + numberOf(m.quantity), 0);
  const stockOut = selectedMovements.filter(m => m.movement_type === "OUT").reduce((sum, m) => sum + numberOf(m.quantity), 0);
  const totalStock = products.reduce((sum, p) => sum + numberOf(p.stock_quantity), 0);

  const topProducts = useMemo(() => {
    const totals = new Map<number, { id: number; name: string; units: number; value: number }>();
    for (const order of liveOrders) {
      for (const item of order.items ?? []) {
        const prev = totals.get(item.product);
        const product = products.find(p => p.id === item.product);
        const units = numberOf(item.quantity);
        const value = numberOf(item.subtotal);
        totals.set(item.product, {
          id: item.product,
          name: product?.name || item.product_name || `Product #${item.product}`,
          units: (prev?.units ?? 0) + units,
          value: (prev?.value ?? 0) + value,
        });
      }
    }
    return [...totals.values()].sort((a,b) => b.units - a.units).slice(0, 10);
  }, [liveOrders, products]);
  const recent = useMemo(() => [...liveOrders].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8), [liveOrders]);
  const hasLineItems = liveOrders.some(o => Array.isArray(o.items) && o.items.length > 0);

  return <MobilePage>
    <MobileHeading title="Reports" subtitle="Sales and inventory movement summary" onRefresh={() => void load(true)}/>
    <ScrollView contentContainerStyle={pageStyles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} colors={[palette.blue]}/>}
    >
      <View style={styles.periods}>
        <Chip label="Last 7 days" active={period === "7"} onPress={() => setPeriod("7")}/>
        <Chip label="Last 30 days" active={period === "30"} onPress={() => setPeriod("30")}/>
        <Chip label="All time" active={period === "all"} onPress={() => setPeriod("all")}/>
      </View>
      {error ? <Message text={error}/> : null}
      {loading && orders.length === 0 ? <Busy label="Loading reports..."/> : null}
      <View style={styles.grid}>
        <View style={styles.stat}><Text style={styles.label}>Order value*</Text><Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>{rupees(sales)}</Text></View>
        <View style={styles.stat}><Text style={styles.label}>Completed value</Text><Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>{rupees(completedSales)}</Text></View>
        <View style={styles.stat}><Text style={styles.label}>Active orders</Text><Text style={styles.value}>{liveOrders.length}</Text></View>
        <View style={styles.stat}><Text style={styles.label}>Cancelled orders</Text><Text style={styles.value}>{cancelled}</Text></View>
      </View>
      <Panel>
        <Text style={pageStyles.title}>Inventory movement report</Text>
        <Text style={pageStyles.muted}>Movements within the selected period</Text>
        <View style={styles.reportRow}><Text style={styles.reportLabel}>Stock received</Text><Text style={styles.in}>+{stockIn} units</Text></View>
        <View style={styles.reportRow}><Text style={styles.reportLabel}>Stock issued</Text><Text style={styles.out}>−{stockOut} units</Text></View>
        <View style={styles.reportRow}><Text style={styles.reportLabel}>Current total stock**</Text><Text style={styles.reportValue}>{totalStock} units</Text></View>
      </Panel>
      <Panel>
        <Text style={pageStyles.title}>Product-wise sales</Text>
        <Text style={pageStyles.muted}>Top products by units sold, excluding cancelled orders</Text>
        {!hasLineItems ? <Message kind="info" text="Product-wise totals require the Orders list API to include items. If your list omits items, use a report API or update the serializer to expose order items."/> : null}
        {topProducts.length === 0 ? <Empty text="No sales line items in this period."/> : topProducts.map((p, i) =>
          <View key={p.id} style={styles.reportRow}>
            <View style={{ flex: 1 }}><Text style={styles.reportLabel}>{i + 1}. {p.name}</Text><Text style={pageStyles.muted}>{p.units} units</Text></View>
            <Text style={styles.reportValue}>{rupees(p.value)}</Text>
          </View>)}
      </Panel>
      <Panel>
        <Text style={pageStyles.title}>Recent sales orders</Text>
        {recent.length === 0 ? <Empty text="No active orders in this period."/> : recent.map(o =>
          <View key={o.id} style={styles.reportRow}>
            <View style={{ flex: 1 }}><Text style={styles.reportLabel}>Order #{o.id} · {o.customer_name || `Customer #${o.customer}`}</Text>
              <Text style={pageStyles.muted}>{readableDate(o.created_at)} · {o.status}</Text></View>
            <Text style={styles.reportValue}>{rupees(o.total_amount)}</Text>
          </View>)}
      </Panel>
      <Text style={styles.footnote}>* Order value includes placed and completed orders, not confirmed payments. Cancelled orders are excluded. ** Current stock is a live all-time balance, not filtered to the selected period. Movement totals can include order-related stock changes.</Text>
    </ScrollView>
  </MobilePage>;
}
const styles = StyleSheet.create({
  periods: { flexDirection: "row", flexWrap: "wrap", marginBottom: 13 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10, marginBottom: 16 },
  stat: { width: "48.4%", borderRadius: 15, backgroundColor: "#FFFFFF", borderColor: "#E2E8F0", borderWidth: 1, padding: 14, minHeight: 108 },
  label: { fontSize: 12, color: "#64748B", fontWeight: "700" },
  value: { fontSize: 22, fontWeight: "800", color: "#0F172A", marginTop: 11 },
  reportRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10, borderTopColor: "#E2E8F0", borderTopWidth: 1, paddingVertical: 14, marginTop: 8 },
  reportLabel: { fontSize: 13, fontWeight: "700", color: "#334155" },
  reportValue: { fontSize: 13, fontWeight: "800", color: "#0F172A" },
  in: { color: "#15803D", fontWeight: "800" }, out: { color: "#B91C1C", fontWeight: "800" },
  footnote: { fontSize: 12, lineHeight: 19, color: "#64748B", marginBottom: 12 },
});
