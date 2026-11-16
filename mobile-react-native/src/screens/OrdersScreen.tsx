import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { apiGet, apiList, apiPost } from "../services/inventoryClient";
import { Customer, Order, Product, numberOf, readableDate, rupees } from "../types/models";
import { Busy, Button, Chip, Empty, Field, Message, MobileHeading, MobilePage, Panel, Sheet, palette, pageStyles } from "../components/mobile/SharedUI";

type CartItem = { product: number; quantity: number };
export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | Order["status"]>("ALL");
  const [details, setDetails] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [productId, setProductId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [items, setItems] = useState<CartItem[]>([]);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      // Avoid competing calls to refresh token endpoint with JWT rotation.
      const nextOrders = await apiList<Order>("/orders/");
      const nextCustomers = await apiList<Customer>("/customers/");
      const nextProducts = await apiList<Product>("/products/");
      setOrders(nextOrders); setCustomers(nextCustomers); setProducts(nextProducts);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load orders."); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => [...orders].filter(o => {
    const term = search.trim().toLowerCase();
    return (filter === "ALL" || o.status === filter) &&
      (!term || String(o.id).includes(term) || (o.customer_name ?? "").toLowerCase().includes(term));
  }).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [orders, search, filter]);

  function startCreate() {
    setCreateOpen(true); setCustomerId(null); setProductId(null); setQuantity("1");
    setItems([]); setNotes(""); setCustomerSearch(""); setProductSearch(""); setFormError("");
  }
  function addItem() {
    setFormError("");
    const p = products.find(x => x.id === productId);
    const amount = Number(quantity);
    if (!p) { setFormError("Choose a product."); return; }
    if (!Number.isInteger(amount) || amount < 1) { setFormError("Quantity must be a positive whole number."); return; }
    if (items.some(i => i.product === p.id)) { setFormError("This product is already in the order. Remove it before adding a different quantity."); return; }
    if (amount > numberOf(p.stock_quantity)) { setFormError(`Only ${numberOf(p.stock_quantity)} units of ${p.name} are available.`); return; }
    setItems(old => [...old, { product: p.id, quantity: amount }]);
    setProductId(null); setQuantity("1"); setProductSearch("");
  }
  const estimate = items.reduce((sum, item) => sum + (numberOf(products.find(p => p.id === item.product)?.price) * item.quantity), 0);

  async function createOrder() {
    setFormError("");
    if (!customerId) { setFormError("Select a customer."); return; }
    if (items.length < 1) { setFormError("Add at least one product."); return; }
    for (const item of items) {
      const p = products.find(x => x.id === item.product);
      if (!p || item.quantity > numberOf(p.stock_quantity)) {
        setFormError(`${p?.name ?? "A selected product"} does not have enough stock.`); return;
      }
    }
    setSaving(true);
    try {
      await apiPost<Order>("/orders/", { customer: customerId, items, notes: notes.trim() });
      setCreateOpen(false);
      await load(true);
      Alert.alert("Order created", "Django has deducted stock and recorded the order.");
    } catch (e) { setFormError(e instanceof Error ? e.message : "Could not create the order."); }
    finally { setSaving(false); }
  }
  async function openDetails(orderId: number) {
    setDetailLoading(true);
    try { setDetails(await apiGet<Order>(`/orders/${orderId}/`)); }
    catch (e) { Alert.alert("Could not load order", e instanceof Error ? e.message : "Try again."); }
    finally { setDetailLoading(false); }
  }
  function confirmStatus(order: Order, operation: "cancel" | "complete") {
    const isCancel = operation === "cancel";
    Alert.alert(isCancel ? "Cancel order?" : "Complete order?",
      isCancel ? `Cancel order #${order.id}? Stock quantities will be restored.` : `Mark order #${order.id} as completed?`, [
        { text: "Back", style: "cancel" },
        { text: isCancel ? "Cancel order" : "Complete", style: isCancel ? "destructive" : "default",
          onPress: () => void (async () => {
            try {
              await apiPost<Order>(`/orders/${order.id}/${operation}/`);
              setDetails(null);
              await load(true);
            } catch (e) { Alert.alert("Action failed", e instanceof Error ? e.message : "Try again."); }
          })(),
        },
      ]);
  }

  return <MobilePage>
    <MobileHeading title="Orders" subtitle={`${orders.length} customer orders`} onRefresh={() => void load(true)}/>
    <ScrollView contentContainerStyle={pageStyles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} colors={[palette.blue]}/>}
      keyboardShouldPersistTaps="handled">
      <Button title="Create order" icon="add-circle-outline" onPress={startCreate}/>
      <View style={styles.searchBox}><TextInput placeholder="Search order ID or customer" value={search} onChangeText={setSearch} style={styles.search} placeholderTextColor="#94A3B8"/></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 11 }}>
        {(["ALL", "PLACED", "COMPLETED", "CANCELLED"] as const).map(status => <Chip key={status} label={status === "ALL" ? "All" : status}
          active={filter === status} onPress={() => setFilter(status)}/>)}
      </ScrollView>
      {error ? <Message text={error}/> : null}
      {loading && orders.length === 0 ? <Busy label="Loading orders..."/> : null}
      {!loading && !error && filtered.length === 0 ? <Empty text="No matching orders."/> : null}
      {filtered.map(o => <Panel key={o.id}>
        <View style={pageStyles.row}><Text style={pageStyles.title}>Order #{o.id}</Text><Text style={styles.price}>{rupees(o.total_amount)}</Text></View>
        <Text style={pageStyles.muted}>{o.customer_name || `Customer #${o.customer}`} · {readableDate(o.created_at)}</Text>
        <Text style={[styles.status, o.status === "COMPLETED" ? styles.completed : o.status === "CANCELLED" ? styles.cancelled : styles.placed]}>{o.status}</Text>
        <View style={styles.actions}>
          <Button title="Details" icon="eye-outline" variant="secondary" compact onPress={() => void openDetails(o.id)}/>
          {o.status === "PLACED" ? <Button title="Complete" compact onPress={() => confirmStatus(o, "complete")}/> : null}
          {o.status === "PLACED" ? <Button title="Cancel" variant="danger" compact onPress={() => confirmStatus(o, "cancel")}/> : null}
        </View>
      </Panel>)}
    </ScrollView>
    <Sheet title="Create order" visible={createOpen} onClose={() => { if (!saving) setCreateOpen(false); }}>
      <Message text="Orders deduct stock automatically. Available stock is checked again by Django when you submit." kind="info"/>
      <Field label="Find customer" value={customerSearch} onChangeText={setCustomerSearch} placeholder="Search customer name"/>
      <ScrollView nestedScrollEnabled style={styles.picker} keyboardShouldPersistTaps="handled">
        {customers.filter(c => (c.name + " " + c.email).toLowerCase().includes(customerSearch.toLowerCase())).map(c =>
          <Chip key={c.id} label={c.name} active={customerId === c.id} onPress={() => setCustomerId(c.id)}/>)}
      </ScrollView>
      {customerId ? <Text style={styles.selected}>Selected: {customers.find(c => c.id === customerId)?.name}</Text> : null}
      <Field label="Find product" value={productSearch} onChangeText={setProductSearch} placeholder="Search product name or SKU"/>
      <ScrollView nestedScrollEnabled style={styles.picker} keyboardShouldPersistTaps="handled">
        {products.filter(p => numberOf(p.stock_quantity) > 0 && (p.name + " " + p.sku).toLowerCase().includes(productSearch.toLowerCase())).map(p =>
          <Chip key={p.id} label={`${p.name} · ${numberOf(p.stock_quantity)} available`} active={productId === p.id} onPress={() => setProductId(p.id)}/>)}
      </ScrollView>
      <Field label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="number-pad"/>
      <Button title="Add to order" variant="secondary" icon="add-outline" onPress={addItem}/>
      <Text style={[pageStyles.title, { marginTop: 18, marginBottom: 9 }]}>Order items ({items.length})</Text>
      {items.length === 0 ? <Text style={pageStyles.muted}>No products added yet.</Text> : items.map(item => {
        const product = products.find(p => p.id === item.product);
        return <View key={item.product} style={[pageStyles.row, styles.lineItem]}>
          <View style={{ flex: 1 }}><Text style={styles.name}>{product?.name ?? `Product #${item.product}`}</Text>
            <Text style={pageStyles.muted}>{item.quantity} × {rupees(product?.price ?? 0)}</Text></View>
          <TouchableOpacity onPress={() => setItems(old => old.filter(i => i.product !== item.product))}><Text style={styles.remove}>Remove</Text></TouchableOpacity>
        </View>;
      })}
      <Text style={styles.estimate}>Estimated total: {rupees(estimate)}</Text>
      <Field label="Order notes (optional)" value={notes} onChangeText={setNotes} multiline/>
      {formError ? <Message text={formError}/> : null}
      <Button title={saving ? "Creating..." : "Place order"} disabled={saving} onPress={() => void createOrder()}/>
    </Sheet>
    <Sheet title={details ? `Order #${details.id}` : "Order details"} visible={Boolean(details)} onClose={() => setDetails(null)}>
      {details ? <>
        <View style={pageStyles.row}><Text style={pageStyles.title}>{details.status}</Text><Text style={styles.price}>{rupees(details.total_amount)}</Text></View>
        <Text style={pageStyles.muted}>{details.customer_name || `Customer #${details.customer}`} · {readableDate(details.created_at)}</Text>
        <Text style={[pageStyles.title, { marginTop: 18, marginBottom: 9 }]}>Items</Text>
        {(details.items ?? []).map(item => <View key={item.id} style={[pageStyles.row, styles.lineItem]}>
          <View style={{ flex: 1 }}><Text style={styles.name}>{item.product_name || `Product #${item.product}`}</Text>
            <Text style={pageStyles.muted}>{item.quantity} × {rupees(item.unit_price)}</Text></View>
          <Text style={styles.price}>{rupees(item.subtotal)}</Text>
        </View>)}
        {details.notes ? <Text style={pageStyles.muted}>Notes: {details.notes}</Text> : null}
        {details.status === "PLACED" ? <View style={styles.actions}>
          <Button title="Complete" compact onPress={() => confirmStatus(details, "complete")}/>
          <Button title="Cancel order" compact variant="danger" onPress={() => confirmStatus(details, "cancel")}/>
        </View> : null}
      </> : null}
    </Sheet>
    {detailLoading && !details ? <View style={styles.waitOverlay}><Busy label="Loading order details..."/></View> : null}
  </MobilePage>;
}
const styles = StyleSheet.create({
  searchBox: { marginTop: 14, marginBottom: 10, backgroundColor: "#FFFFFF", borderColor: "#E2E8F0", borderWidth: 1, borderRadius: 12 },
  search: { height: 49, paddingHorizontal: 13, color: "#0F172A" },
  price: { fontWeight: "800", fontSize: 15, color: "#0F172A" },
  status: { alignSelf: "flex-start", fontSize: 11, fontWeight: "800", marginTop: 9, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7 },
  placed: { color: "#1D4ED8", backgroundColor: "#DBEAFE" },
  completed: { color: "#15803D", backgroundColor: "#DCFCE7" },
  cancelled: { color: "#B91C1C", backgroundColor: "#FEE2E2" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 13 },
  picker: { maxHeight: 115, marginBottom: 12 },
  selected: { color: "#1D4ED8", fontSize: 12, fontWeight: "700", marginBottom: 14 },
  lineItem: { paddingVertical: 10, borderTopColor: "#E2E8F0", borderTopWidth: 1 },
  remove: { color: "#B91C1C", fontSize: 12, fontWeight: "800" },
  name: { color: "#0F172A", fontSize: 13, fontWeight: "700" },
  estimate: { marginTop: 15, marginBottom: 14, fontSize: 17, fontWeight: "800", color: "#0F172A" },
  waitOverlay: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "rgba(255,255,255,0.85)", justifyContent: "center" },
});
