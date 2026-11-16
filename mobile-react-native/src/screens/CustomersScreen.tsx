import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiDelete, apiList, apiPatch, apiPost } from "../services/inventoryClient";
import { Customer } from "../types/models";
import { Busy, Button, Empty, Field, Message, MobileHeading, MobilePage, Panel, Sheet, palette, pageStyles } from "../components/mobile/SharedUI";

type Form = { name: string; email: string; phone: string; address: string };
const blank: Form = { name: "", email: "", phone: "", address: "" };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export default function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [edit, setEdit] = useState<Customer | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<Form>(blank);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError("");
    try { setCustomers(await apiList<Customer>("/customers/")); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to load customers."); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const matching = useMemo(() => customers.filter(c =>
    [c.name, c.email, c.phone].some(value => String(value ?? "").toLowerCase().includes(search.trim().toLowerCase()))), [customers, search]);

  function openForm(customer: Customer | null) {
    setEdit(customer); setFormError("");
    setForm(customer ? { name: customer.name, email: customer.email ?? "", phone: customer.phone ?? "", address: customer.address ?? "" } : blank);
    setFormOpen(true);
  }
  async function save() {
    setFormError("");
    if (!form.name.trim()) { setFormError("Customer name is required."); return; }
    if (!EMAIL_PATTERN.test(form.email.trim())) { setFormError("Enter a valid email address."); return; }
    if (!form.phone.trim() || form.phone.trim().length > 15) { setFormError("Enter a phone number up to 15 characters."); return; }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), address: form.address.trim() };
      if (edit) await apiPatch<Customer>(`/customers/${edit.id}/`, payload);
      else await apiPost<Customer>("/customers/", payload);
      setFormOpen(false);
      await load(true);
    } catch (e) { setFormError(e instanceof Error ? e.message : "Could not save customer."); }
    finally { setSaving(false); }
  }
  function confirmDelete(customer: Customer) {
    Alert.alert("Delete customer?", `Delete ${customer.name}? Customers linked to orders cannot be removed.`, [
      { text: "Keep", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void (async () => {
        try { await apiDelete(`/customers/${customer.id}/`); await load(true); }
        catch (e) { Alert.alert("Delete not allowed", e instanceof Error ? e.message : "Could not delete customer."); }
      })() },
    ]);
  }

  return <MobilePage>
    <MobileHeading title="Customers" subtitle={`${customers.length} customer records`} onRefresh={() => void load(true)}/>
    <ScrollView contentContainerStyle={pageStyles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} colors={[palette.blue]}/>}>
      <Button title="Add customer" icon="person-add-outline" onPress={() => openForm(null)}/>
      <View style={styles.searchBox}><Ionicons name="search-outline" size={19} color="#64748B"/>
        <TextInput style={styles.search} placeholder="Search name, email or phone" value={search} onChangeText={setSearch} autoCapitalize="none" placeholderTextColor="#94A3B8"/>
      </View>
      {error ? <Message text={error}/> : null}
      {loading && customers.length === 0 ? <Busy label="Loading customers..."/> : null}
      {!loading && !error && matching.length === 0 ? <Empty text="No customers match your search."/> : null}
      {matching.map(c => <Panel key={c.id}>
        <View style={pageStyles.row}><Text style={[pageStyles.title, { flex: 1 }]}>{c.name}</Text>
          <Text style={pageStyles.muted}>#{c.id}</Text></View>
        <Text style={pageStyles.muted}>{c.email}</Text>
        <Text style={pageStyles.muted}>{c.phone}</Text>
        {c.address ? <Text style={pageStyles.muted}>{c.address}</Text> : null}
        <View style={styles.actions}>
          <Button title="Edit" icon="create-outline" variant="secondary" compact onPress={() => openForm(c)}/>
          <Button title="Delete" icon="trash-outline" variant="danger" compact onPress={() => confirmDelete(c)}/>
        </View>
      </Panel>)}
    </ScrollView>
    <Sheet visible={formOpen} title={edit ? "Edit customer" : "Add customer"} onClose={() => { if (!saving) setFormOpen(false); }}>
      <Field label="Full name" value={form.name} onChangeText={v => setForm(old => ({ ...old, name: v }))}/>
      <Field label="Email" value={form.email} onChangeText={v => setForm(old => ({ ...old, email: v }))} keyboardType="email-address"/>
      <Field label="Phone" value={form.phone} onChangeText={v => setForm(old => ({ ...old, phone: v }))} keyboardType="phone-pad"/>
      <Field label="Address" value={form.address} onChangeText={v => setForm(old => ({ ...old, address: v }))} multiline/>
      {formError ? <Message text={formError}/> : null}
      <Button title={saving ? "Saving..." : edit ? "Save changes" : "Create customer"} disabled={saving} onPress={() => void save()}/>
    </Sheet>
  </MobilePage>;
}
const styles = StyleSheet.create({
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E2E8F0", borderWidth: 1, borderRadius: 12, marginTop: 14, marginBottom: 14, paddingHorizontal: 13 },
  search: { height: 49, flex: 1, marginLeft: 8, color: "#0F172A", fontSize: 14 },
  actions: { flexDirection: "row", gap: 8, marginTop: 15 },
});
