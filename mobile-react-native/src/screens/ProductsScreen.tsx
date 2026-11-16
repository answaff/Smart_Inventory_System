import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiDelete, apiList, apiPatch, apiPost } from "../services/inventoryClient";
import { Category, Product, UserProfile, canManageProducts, numberOf, rupees } from "../types/models";
import {
  Busy, Button, Chip, Empty, Field, Message, MobileHeading, MobilePage, Panel, Sheet, palette, pageStyles,
} from "../components/mobile/SharedUI";

type FormState = { name: string; sku: string; price: string; threshold: string; categoryId: number | null };
const blank: FormState = { name: "", sku: "", price: "", threshold: "2", categoryId: null };

export default function ProductsScreen({ user }: { user: UserProfile }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");
  const [editing, setEditing] = useState<Product | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(blank);
  const canManage = canManageProducts(user);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      // Sequential calls avoid concurrent refresh-token rotation.
      const nextProducts = await apiList<Product>("/products/");
      // Staff may have read-only product access without category-management access.
      // Categories are only required when an Admin opens the product form.
      let nextCategories: Category[] = [];
      if (canManage) {
        try { nextCategories = await apiList<Category>("/categories/"); }
        catch { /* Keep the product list usable even if categories are unavailable. */ }
      }
      setProducts(nextProducts);
      setCategories(nextCategories);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load products."); }
    finally { setLoading(false); setRefreshing(false); }
  }, [canManage]);
  useEffect(() => { void load(); }, [load]);

  const matching = useMemo(() => products.filter(p => {
    const query = search.trim().toLowerCase();
    const matches = !query || [p.name, p.sku, p.category_name ?? ""].some(s => s.toLowerCase().includes(query));
    const quantity = numberOf(p.stock_quantity);
    const low = quantity <= numberOf(p.low_stock_threshold);
    return matches && (filter === "all" || (filter === "low" && low) || (filter === "out" && quantity === 0));
  }), [products, search, filter]);

  function openForm(product: Product | null) {
    setEditing(product);
    setFormError("");
    const category = product?.category;
    setForm(product ? {
      name: product.name, sku: product.sku,
      price: String(product.price), threshold: String(product.low_stock_threshold),
      categoryId: typeof category === "number" ? category : category?.id ?? null,
    } : { ...blank, categoryId: categories[0]?.id ?? null });
    setFormOpen(true);
  }

  async function save() {
    setFormError("");
    const price = Number(form.price);
    const threshold = Number(form.threshold);
    if (!form.name.trim() || !form.sku.trim()) { setFormError("Product name and SKU are required."); return; }
    if (!Number.isFinite(price) || price < 0 || !form.price.trim()) { setFormError("Enter a valid non-negative price."); return; }
    if (!Number.isInteger(threshold) || threshold < 0) { setFormError("Low-stock threshold must be a whole number of 0 or more."); return; }
    if (form.categoryId === null) { setFormError("Select a category. Add categories in Django Admin if the list is empty."); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(), sku: form.sku.trim(), price: price.toFixed(2),
        category: form.categoryId, low_stock_threshold: threshold,
      };
      if (editing) await apiPatch<Product>(`/products/${editing.id}/`, payload);
      else await apiPost<Product>("/products/", payload);
      setFormOpen(false);
      await load(true);
    } catch (e) { setFormError(e instanceof Error ? e.message : "Could not save product."); }
    finally { setSaving(false); }
  }

  function confirmDelete(product: Product) {
    Alert.alert("Delete product?", `Delete ${product.name}? Django will block deletion if it has stock or transaction history.`, [
      { text: "Keep", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void (async () => {
        try { await apiDelete(`/products/${product.id}/`); await load(true); }
        catch (e) { Alert.alert("Delete not allowed", e instanceof Error ? e.message : "Unable to delete product."); }
      })() },
    ]);
  }

  return <MobilePage>
    <MobileHeading title="Products" subtitle={`${products.length} products · Live Django inventory`} onRefresh={() => void load(true)}/>
    <ScrollView contentContainerStyle={pageStyles.scrollContent}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} colors={[palette.blue]}/>}>
      {canManage ? <Button title="Add product" icon="add-circle-outline" onPress={() => openForm(null)}/> :
        <Message text="Staff can view products. Product creation, editing and deletion require Inventory Admin." kind="info"/>}
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={19} color="#64748B"/>
        <TextInput value={search} onChangeText={setSearch} placeholder="Search name, SKU, category" placeholderTextColor="#94A3B8" style={styles.searchInput} autoCapitalize="none"/>
      </View>
      <View style={styles.chipRow}>
        <Chip label="All" active={filter === "all"} onPress={() => setFilter("all")}/>
        <Chip label="Low stock" active={filter === "low"} onPress={() => setFilter("low")}/>
        <Chip label="Out of stock" active={filter === "out"} onPress={() => setFilter("out")}/>
      </View>
      {error ? <Message text={error}/> : null}
      {loading && products.length === 0 ? <Busy label="Loading products..."/> : null}
      {!loading && !error && matching.length === 0 ? <Empty text="No matching products found."/> : null}
      {matching.map(product => {
        const quantity = numberOf(product.stock_quantity);
        const isLow = quantity <= numberOf(product.low_stock_threshold);
        return <Panel key={product.id}>
          <View style={pageStyles.row}>
            <View style={{ flex: 1 }}>
              <Text style={pageStyles.title}>{product.name}</Text>
              <Text style={pageStyles.muted}>{product.sku} · {product.category_name ?? (typeof product.category === "object" ? product.category?.name : `Category ${product.category ?? "—"}`)}</Text>
            </View>
            <View style={[styles.stockTag, { backgroundColor: isLow ? "#FEF3C7" : "#DCFCE7" }]}>
              <Text style={{ color: isLow ? "#92400E" : "#166534", fontWeight: "800", fontSize: 12 }}>{quantity} in stock</Text>
            </View>
          </View>
          <View style={[pageStyles.row, { marginTop: 12 }]}>
            <Text style={styles.price}>{rupees(product.price)}</Text>
            <Text style={pageStyles.muted}>Alert at {numberOf(product.low_stock_threshold)}</Text>
          </View>
          {canManage ? <View style={styles.actionRow}>
            <Button title="Edit" variant="secondary" compact icon="create-outline" onPress={() => openForm(product)}/>
            <Button title="Delete" variant="danger" compact icon="trash-outline" onPress={() => confirmDelete(product)}/>
          </View> : null}
        </Panel>;
      })}
    </ScrollView>
    <Sheet visible={formOpen} title={editing ? "Edit product" : "Add product"} onClose={() => { if (!saving) setFormOpen(false); }}>
      <Message text="Stock starts at zero. Change quantities only through Stock In / Stock Out." kind="info"/>
      <Field label="Product name" value={form.name} onChangeText={v => setForm(old => ({ ...old, name: v }))}/>
      <Field label="SKU" value={form.sku} onChangeText={v => setForm(old => ({ ...old, sku: v }))}/>
      <Field label="Price (₹)" value={form.price} onChangeText={v => setForm(old => ({ ...old, price: v }))} keyboardType="decimal-pad"/>
      <Field label="Low-stock threshold" value={form.threshold} onChangeText={v => setForm(old => ({ ...old, threshold: v }))} keyboardType="number-pad"/>
      <Text style={styles.formLabel}>Category</Text>
      <View style={styles.chipRow}>{categories.map(category =>
        <Chip key={category.id} label={category.name} active={form.categoryId === category.id}
          onPress={() => setForm(old => ({ ...old, categoryId: category.id }))}/>)}
      </View>
      {categories.length === 0 ? <Message text="No categories available. Create one using Django Admin, then refresh Products."/> : null}
      {formError ? <Message text={formError}/> : null}
      <Button title={saving ? "Saving..." : editing ? "Save changes" : "Create product"} disabled={saving} onPress={() => void save()}/>
    </Sheet>
  </MobilePage>;
}
const styles = StyleSheet.create({
  searchBox: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", marginTop: 14, marginBottom: 11 },
  searchInput: { height: 49, flex: 1, marginLeft: 8, fontSize: 14, color: "#0F172A" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 7 },
  price: { fontWeight: "800", color: "#0F172A", fontSize: 17 },
  stockTag: { borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8 },
  actionRow: { flexDirection: "row", gap: 9, marginTop: 15 },
  formLabel: { color: "#334155", fontSize: 13, fontWeight: "700", marginBottom: 10 },
});
