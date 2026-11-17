import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiList, apiPost } from "../services/inventoryClient";
import { Product, StockMovement, numberOf, readableDate } from "../types/models";
import { Busy, Button, Chip, Empty, Field, Message, MobileHeading, MobilePage, Panel, Sheet, palette, pageStyles } from "../components/mobile/SharedUI";

type Operation = "in" | "out";
export default function InventoryScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mode, setMode] = useState<Operation>("in");
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [filter, setFilter] = useState<"all" | "IN" | "OUT">("all");
  const [productQuery, setProductQuery] = useState("");
  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const nextProducts = await apiList<Product>("/products/");
      const nextMovements = await apiList<StockMovement>("/inventory/movements/");
      const nextAlerts = await apiList<Product>("/inventory/low-stock/");
      setProducts(nextProducts);
      setMovements(nextMovements);
      setLowStock(nextAlerts);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load stock data."); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const totalStock = products.reduce((sum, p) => sum + numberOf(p.stock_quantity), 0);
  const current = products.find(p => p.id === selectedProduct);
  const recentMovements = useMemo(() => [...movements].filter(m => filter === "all" || m.movement_type === filter)
    .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 30), [movements, filter]);
  const matchingProducts = useMemo(() => products.filter(p =>
    (p.name + " " + p.sku).toLowerCase().includes(productQuery.toLowerCase())), [products, productQuery]);

  function startAdjustment(next: Operation) {
    setMode(next); setSelectedProduct(null); setQuantity(""); setNotes(""); setProductQuery(""); setFormError(""); setSheetOpen(true);
  }
  async function submit() {
    setFormError("");
    const amount = Number(quantity);
    if (!selectedProduct) { setFormError("Select a product."); return; }
    if (!Number.isInteger(amount) || amount < 1) { setFormError("Quantity must be a positive whole number."); return; }
    if (mode === "out" && current && amount > numberOf(current.stock_quantity)) {
      setFormError(`Insufficient stock. Available: ${numberOf(current.stock_quantity)}.`); return;
    }
    setSaving(true);
    try {
      await apiPost<unknown>(mode === "in" ? "/inventory/stock-in/" : "/inventory/stock-out/", {
        product: selectedProduct, quantity: amount, notes: notes.trim(),
      });
      setSheetOpen(false);
      await load(true);
    } catch (e) { setFormError(e instanceof Error ? e.message : "Stock adjustment failed."); }
    finally { setSaving(false); }
  }

  return <MobilePage>
    <MobileHeading title="Inventory" subtitle={`${totalStock} units · ${products.length} products`} onRefresh={() => void load(true)}/>
    <ScrollView contentContainerStyle={pageStyles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} colors={[palette.blue]}/>}
    >
      <View style={styles.actions}>
        <View style={{ flex: 1 }}><Button title="Stock In" icon="add-circle-outline" onPress={() => startAdjustment("in")}/></View>
        <View style={{ flex: 1 }}><Button title="Stock Out" icon="remove-circle-outline" variant="secondary" onPress={() => startAdjustment("out")}/></View>
      </View>
      {error ? <Message text={error}/> : null}
      {loading && products.length === 0 ? <Busy label="Loading inventory..."/> : null}
      <Panel>
        <View style={pageStyles.row}><Text style={pageStyles.title}>Low-stock alerts</Text><Text style={styles.alertCount}>{lowStock.length}</Text></View>
        {lowStock.length === 0 ? <Text style={pageStyles.muted}>No products below their threshold.</Text> :
          lowStock.slice(0, 20).map(p => <View key={p.id} style={[pageStyles.row, styles.itemRow]}>
            <View style={{ flex: 1 }}><Text style={styles.name}>{p.name}</Text><Text style={pageStyles.muted}>Threshold: {numberOf(p.low_stock_threshold)}</Text></View>
            <Text style={styles.lowText}>{numberOf(p.stock_quantity)} left</Text>
          </View>)}
      </Panel>
      <Panel>
        <Text style={pageStyles.title}>Stock movement history</Text>
        <Text style={pageStyles.muted}>Latest 30 records; pull down to refresh.</Text>
        <View style={[styles.actions, { marginTop: 14 }]}>
          <Chip label="All" active={filter === "all"} onPress={() => setFilter("all")}/>
          <Chip label="Stock In" active={filter === "IN"} onPress={() => setFilter("IN")}/>
          <Chip label="Stock Out" active={filter === "OUT"} onPress={() => setFilter("OUT")}/>
        </View>
        {!loading && recentMovements.length === 0 ? <Empty text="No stock movements found."/> :
          recentMovements.map(m => <View key={m.id} style={[pageStyles.row, styles.itemRow]}>
            <View style={{ flex: 1 }}><Text style={styles.name}>{m.product_name || `Product #${m.product}`}</Text>
              <Text style={pageStyles.muted}>{readableDate(m.created_at)} · {m.created_by_username || "Staff"}</Text>
              {m.notes ? <Text style={pageStyles.muted}>{m.notes}</Text> : null}
            </View>
            <Text style={[styles.movement, { color: m.movement_type === "IN" ? "#15803D" : "#B91C1C" }]}>
              {m.movement_type === "IN" ? "+" : "−"}{m.quantity}
            </Text>
          </View>)}
      </Panel>
    </ScrollView>
    <Sheet visible={sheetOpen} title={mode === "in" ? "Stock In" : "Stock Out"} onClose={() => { if (!saving) setSheetOpen(false); }}>
      <Message kind="info" text={mode === "in" ? "Receive stock into inventory. The movement will be recorded." : "Remove stock from inventory. Django will reject requests exceeding available stock."}/>
      <Field label="Find product" value={productQuery} onChangeText={setProductQuery} placeholder="Search product by name or SKU"/>
      <ScrollView nestedScrollEnabled style={styles.productPicker} keyboardShouldPersistTaps="handled">
        {matchingProducts.map(p => <Chip key={p.id} label={`${p.name} (${numberOf(p.stock_quantity)} available)`}
          active={selectedProduct === p.id} onPress={() => setSelectedProduct(p.id)}/>)}
      </ScrollView>
      {current ? <Text style={styles.selectedText}>Selected: {current.name} · Current stock: {numberOf(current.stock_quantity)}</Text> : null}
      <Field label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="number-pad"/>
      <Field label="Notes (optional)" value={notes} onChangeText={setNotes} multiline/>
      {formError ? <Message text={formError}/> : null}
      <Button title={saving ? "Saving..." : mode === "in" ? "Confirm Stock In" : "Confirm Stock Out"} disabled={saving}
        onPress={() => void submit()}/>
    </Sheet>
  </MobilePage>;
}
const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 10, marginBottom: 15 },
  itemRow: { paddingVertical: 12, borderTopColor: "#E2E8F0", borderTopWidth: 1, marginTop: 10 },
  name: { color: "#0F172A", fontSize: 13, fontWeight: "700" },
  alertCount: { backgroundColor: "#FEF3C7", color: "#92400E", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, fontWeight: "800" },
  lowText: { color: "#B45309", fontSize: 12, fontWeight: "800" },
  movement: { fontSize: 18, fontWeight: "800" },
  productPicker: { maxHeight: 160, marginBottom: 12 },
  selectedText: { color: "#1D4ED8", fontWeight: "700", marginBottom: 13, fontSize: 12 },
});
