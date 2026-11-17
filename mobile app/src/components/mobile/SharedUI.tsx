import React from "react";
import {
  ActivityIndicator,
  KeyboardTypeOptions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

export const palette = {
  navy: "#101D37", blue: "#2563EB", ink: "#0F172A", grey: "#64748B",
  border: "#E2E8F0", background: "#F1F5F9", white: "#FFFFFF", red: "#B91C1C", green: "#15803D",
};

export function MobilePage({ children }: { children: React.ReactNode }) {
  return <SafeAreaView edges={["top"]} style={styles.page}><View style={styles.pageBody}>{children}</View></SafeAreaView>;
}
export function MobileHeading({ title, subtitle, onRefresh }: { title: string; subtitle: string; onRefresh?: () => void }) {
  return <View style={styles.heading}><View style={{ flex: 1 }}>
    <Text style={styles.headingTitle}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text>
  </View>{onRefresh ? <TouchableOpacity accessibilityLabel="Refresh" onPress={onRefresh} style={styles.refresh}><Ionicons name="refresh" size={20} color={palette.blue}/></TouchableOpacity> : null}</View>;
}
export function Panel({ children }: { children: React.ReactNode }) {
  return <View style={styles.panel}>{children}</View>;
}
export function Button({ title, onPress, variant = "primary", disabled = false, compact = false, icon }: {
  title: string; onPress: () => void; variant?: "primary" | "secondary" | "danger"; disabled?: boolean; compact?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
}) {
  const background = variant === "primary" ? palette.blue : variant === "danger" ? "#FEE2E2" : "#DBEAFE";
  const color = variant === "primary" ? "#FFFFFF" : variant === "danger" ? palette.red : "#1D4ED8";
  return <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.button, { backgroundColor: background, opacity: disabled ? 0.55 : 1 }, compact && styles.compact]}>
    {icon ? <Ionicons name={icon} size={17} color={color}/> : null}
    <Text style={[styles.buttonLabel, { color }]}>{title}</Text>
  </TouchableOpacity>;
}
export function Field({ label, value, onChangeText, placeholder, keyboardType = "default", multiline = false, secureTextEntry = false, editable = true }: {
  label: string; value: string; onChangeText: (text: string) => void; placeholder?: string;
  keyboardType?: KeyboardTypeOptions; multiline?: boolean; secureTextEntry?: boolean; editable?: boolean;
}) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput
    style={[styles.input, multiline && { minHeight: 84, textAlignVertical: "top" }]}
    value={value} onChangeText={onChangeText} placeholder={placeholder || label}
    placeholderTextColor="#94A3B8" keyboardType={keyboardType} multiline={multiline}
    secureTextEntry={secureTextEntry} editable={editable} autoCapitalize="none"
  /></View>;
}
export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}><Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text></TouchableOpacity>;
}
export function Message({ text, kind = "error" }: { text: string; kind?: "error" | "info" }) {
  return <View style={[styles.message, kind === "info" && { backgroundColor: "#EFF6FF" }]}><Text style={{ color: kind === "info" ? "#1D4ED8" : palette.red, lineHeight: 20, fontSize: 13 }}>{text}</Text></View>;
}
export function Busy({ label = "Loading..." }: { label?: string }) {
  return <View style={styles.busy}><ActivityIndicator size="large" color={palette.blue}/><Text style={styles.muted}>{label}</Text></View>;
}
export function Empty({ text }: { text: string }) {
  return <View style={styles.busy}><Ionicons name="file-tray-outline" size={29} color="#94A3B8"/><Text style={styles.muted}>{text}</Text></View>;
}
export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <SafeAreaView style={styles.overlay} edges={["top", "bottom"]}>
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close"><Ionicons name="close" size={25} color={palette.ink}/></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: Platform.OS === "ios" ? 40 : 28 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      </View>
    </SafeAreaView>
  </Modal>;
}
export const pageStyles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 28 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  title: { fontSize: 16, fontWeight: "800", color: palette.ink },
  muted: { fontSize: 12, color: palette.grey, marginTop: 4, lineHeight: 18 },
  divider: { height: 1, backgroundColor: palette.border, marginVertical: 12 },
});
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.background },
  pageBody: { flex: 1 },
  heading: { backgroundColor: palette.navy, paddingHorizontal: 19, paddingTop: 20, paddingBottom: 23, flexDirection: "row", alignItems: "center" },
  headingTitle: { color: palette.white, fontSize: 25, fontWeight: "800" },
  subtitle: { color: "#C1D0E4", fontSize: 12, marginTop: 6 },
  refresh: { backgroundColor: "#233653", borderRadius: 12, padding: 10 },
  panel: { borderRadius: 17, backgroundColor: palette.white, padding: 15, marginBottom: 13, borderWidth: 1, borderColor: palette.border },
  button: { minHeight: 45, paddingHorizontal: 15, borderRadius: 11, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 8 },
  buttonLabel: { fontSize: 13, fontWeight: "800" },
  compact: { minHeight: 36, paddingHorizontal: 12, marginTop: 0 },
  field: { marginBottom: 15 },
  label: { color: "#334155", fontWeight: "700", marginBottom: 7, fontSize: 13 },
  input: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 10, paddingHorizontal: 13, minHeight: 48, fontSize: 15, color: palette.ink, backgroundColor: palette.white },
  chip: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 18, paddingVertical: 9, paddingHorizontal: 12, marginRight: 8, marginBottom: 8, backgroundColor: palette.white },
  chipActive: { borderColor: palette.blue, backgroundColor: "#DBEAFE" },
  chipText: { fontSize: 12, fontWeight: "700", color: "#475569" },
  chipTextActive: { color: "#1D4ED8" },
  message: { backgroundColor: "#FEF2F2", borderRadius: 11, padding: 12, marginBottom: 12 },
  busy: { alignItems: "center", justifyContent: "center", minHeight: 140, gap: 12 },
  muted: { fontSize: 13, color: palette.grey, textAlign: "center", lineHeight: 20 },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.6)" },
  sheet: { backgroundColor: palette.white, borderTopLeftRadius: 23, borderTopRightRadius: 23, maxHeight: "94%", minHeight: "38%" },
  sheetHeader: { padding: 18, borderBottomWidth: 1, borderBottomColor: palette.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { fontSize: 19, fontWeight: "800", color: palette.ink },
});
