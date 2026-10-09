import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  StatusBar,
  Modal,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCustomerTheme } from "../../contexts/CustomerThemeContext";
import { GooglePlacesAddressField } from "../../components/GooglePlacesAddressField";
import { SlimSpinner } from "../../components/SlimSpinner";
import { GOLD } from "../../theme/driver-theme";
import {
  getAllSavedPlaces,
  setSavedPlace,
  clearSavedPlace,
  type SavedPlace,
  type SavedPlaceKind,
} from "../../utils/saved-places";

type PlaceMeta = {
  kind: SavedPlaceKind;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  hint: string;
};

const PLACES: PlaceMeta[] = [
  {
    kind: "home",
    label: "Home",
    icon: "home-outline",
    hint: "Your home address for one-tap booking",
  },
  {
    kind: "office",
    label: "Office",
    icon: "briefcase-outline",
    hint: "Where you head to work",
  },
];

export default function SavedPlacesScreen() {
  const { palette, isDark } = useCustomerTheme();
  const cardBlur = Platform.OS === "ios" ? 40 : 24;

  const [loading, setLoading] = useState(true);
  const [home, setHome] = useState<SavedPlace | null>(null);
  const [office, setOffice] = useState<SavedPlace | null>(null);

  const [editKind, setEditKind] = useState<SavedPlaceKind | null>(null);
  const [draft, setDraft] = useState("");
  const [draftCoords, setDraftCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingKind, setRemovingKind] = useState<SavedPlaceKind | null>(null);

  const refresh = useCallback(async () => {
    const { home: h, office: o } = await getAllSavedPlaces();
    setHome(h);
    setOffice(o);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const valueFor = useCallback(
    (kind: SavedPlaceKind) => (kind === "home" ? home : office),
    [home, office]
  );

  const openEditor = useCallback(
    (kind: SavedPlaceKind) => {
      const existing = kind === "home" ? home : office;
      setEditKind(kind);
      setDraft(existing?.address || "");
      setDraftCoords(
        typeof existing?.lat === "number" && typeof existing?.lng === "number"
          ? { lat: existing.lat, lng: existing.lng }
          : null
      );
    },
    [home, office]
  );

  const closeEditor = useCallback(() => {
    if (saving) return;
    setEditKind(null);
    setDraft("");
    setDraftCoords(null);
  }, [saving]);

  const save = useCallback(async () => {
    if (!editKind) return;
    const address = draft.trim();
    if (address.length < 3) {
      Alert.alert("Address needed", "Enter a valid address to save this place.");
      return;
    }
    setSaving(true);
    const place: SavedPlace = {
      address,
      lat: draftCoords?.lat,
      lng: draftCoords?.lng,
    };
    try {
      await setSavedPlace(editKind, place);
      if (editKind === "home") setHome(place);
      else setOffice(place);
      setSaving(false);
      setEditKind(null);
      setDraft("");
      setDraftCoords(null);
    } catch (e) {
      setSaving(false);
      Alert.alert(
        "Couldn’t save",
        e instanceof Error ? e.message : "Check your connection and try again."
      );
    }
  }, [editKind, draft, draftCoords]);

  const remove = useCallback(
    (kind: SavedPlaceKind) => {
      const label = kind === "home" ? "Home" : "Office";
      Alert.alert(`Remove ${label}?`, `This will delete your saved ${label.toLowerCase()} address.`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setRemovingKind(kind);
              try {
                await clearSavedPlace(kind);
                if (kind === "home") setHome(null);
                else setOffice(null);
              } catch {
                Alert.alert("Couldn’t remove", "Please try again.");
              } finally {
                setRemovingKind(null);
              }
            })();
          },
        },
      ]);
    },
    []
  );

  const editLabel = editKind === "home" ? "Home" : "Office";

  return (
    <View style={[styles.root, { backgroundColor: palette.root }]}>
      <StatusBar barStyle={palette.statusBar} backgroundColor={palette.root} />
      <LinearGradient colors={[...palette.bg]} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={22} color={palette.text} />
          </Pressable>
          <Text style={[styles.topTitle, { color: palette.text }]}>Saved places</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.intro, { color: palette.muted }]}>
            Save your go-to destinations for one-tap booking. They sync across your devices.
          </Text>

          {loading ? (
            <View style={styles.loadingWrap}>
              <SlimSpinner size={26} stroke={2} color={GOLD} />
            </View>
          ) : (
            PLACES.map((meta) => {
              const saved = valueFor(meta.kind);
              const busy = removingKind === meta.kind;
              return (
                <BlurView
                  key={meta.kind}
                  intensity={cardBlur}
                  tint={palette.blurTint}
                  style={[
                    styles.placeCard,
                    {
                      borderColor: palette.border,
                      backgroundColor:
                        Platform.OS === "android" ? palette.cardAndroid : "transparent",
                    },
                  ]}
                >
                  <View style={styles.placeTop}>
                    <View style={styles.placeIcon}>
                      <Ionicons name={meta.icon} size={18} color={GOLD} />
                    </View>
                    <View style={styles.placeCopy}>
                      <Text style={[styles.placeLabel, { color: palette.text }]}>
                        {meta.label}
                      </Text>
                      <Text
                        style={[
                          styles.placeAddress,
                          { color: saved ? palette.text : palette.muted },
                        ]}
                        numberOfLines={2}
                      >
                        {saved?.address || meta.hint}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.placeActions}>
                    <Pressable
                      onPress={() => openEditor(meta.kind)}
                      disabled={busy}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        { borderColor: palette.border },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Ionicons
                        name={saved ? "create-outline" : "add-outline"}
                        size={16}
                        color={GOLD}
                      />
                      <Text style={[styles.actionText, { color: palette.text }]}>
                        {saved ? "Edit" : "Add"}
                      </Text>
                    </Pressable>

                    {saved ? (
                      <Pressable
                        onPress={() => remove(meta.kind)}
                        disabled={busy}
                        style={({ pressed }) => [
                          styles.actionBtn,
                          styles.removeBtn,
                          pressed && styles.pressed,
                        ]}
                      >
                        {busy ? (
                          <ActivityIndicator size="small" color="#FF453A" />
                        ) : (
                          <>
                            <Ionicons name="trash-outline" size={16} color="#FF453A" />
                            <Text style={[styles.actionText, styles.removeText]}>Remove</Text>
                          </>
                        )}
                      </Pressable>
                    ) : null}
                  </View>
                </BlurView>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={editKind !== null}
        transparent
        animationType="slide"
        onRequestClose={closeEditor}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalRoot}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeEditor} />
          <View style={[styles.modalSheet, { backgroundColor: isDark ? "#1C1915" : "#FFFFFF" }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: palette.text }]}>
              {valueFor(editKind ?? "home") ? `Edit ${editLabel}` : `Set ${editLabel}`}
            </Text>
            <Text style={[styles.modalSub, { color: palette.muted }]}>
              Search and select your {editLabel.toLowerCase()} address.
            </Text>

            <GooglePlacesAddressField
              value={draft}
              onChangeText={(t) => {
                setDraft(t);
                setDraftCoords(null);
              }}
              onPlaceResolved={(p) => {
                setDraft(p.address);
                if (typeof p.lat === "number" && typeof p.lng === "number") {
                  setDraftCoords({ lat: p.lat, lng: p.lng });
                } else {
                  setDraftCoords(null);
                }
              }}
              placeholder={`Enter ${editLabel.toLowerCase()} address`}
              iconName={editKind === "home" ? "home-outline" : "briefcase-outline"}
              autoFocus
              maxPanelHeight={240}
              containerStyle={styles.modalField}
            />

            <Pressable
              onPress={save}
              disabled={saving}
              style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed, saving && { opacity: 0.8 }]}
            >
              <LinearGradient
                colors={["#E8C078", GOLD, "#B8862E"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.saveGradient}
              >
                {saving ? (
                  <SlimSpinner size={16} stroke={2} color="#1A1208" />
                ) : (
                  <Text style={styles.saveText}>Save {editLabel}</Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "transparent" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  container: { flex: 1 },
  contentContainer: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 60,
  },
  intro: {
    fontSize: 13.5,
    fontWeight: "500",
    lineHeight: 19,
    marginBottom: 18,
  },
  loadingWrap: {
    paddingVertical: 60,
    alignItems: "center",
  },
  placeCard: {
    borderRadius: 18,
    overflow: "hidden",
    padding: 16,
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  placeTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  placeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(212,160,74,0.14)",
  },
  placeCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  placeLabel: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  placeAddress: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  placeActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
  },
  removeBtn: {
    borderColor: "rgba(255,69,58,0.4)",
    backgroundColor: "rgba(255,69,58,0.08)",
  },
  actionText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  removeText: {
    color: "#FF453A",
  },
  pressed: { opacity: 0.75 },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 34,
  },
  modalHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(150,150,150,0.4)",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  modalSub: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 4,
    marginBottom: 16,
  },
  modalField: {
    marginBottom: 20,
  },
  saveBtn: {
    borderRadius: 14,
    overflow: "hidden",
  },
  saveGradient: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
  },
  saveText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1A1208",
  },
});
