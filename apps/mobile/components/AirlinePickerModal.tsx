import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  SectionList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  AIRLINES,
  airlineInitial,
  filterAirlines,
  groupAirlinesByLetter,
  type Airline,
} from "../data/airlines";
import type { AirportPlaceContext } from "../utils/airport-place";
import { GOLD } from "../theme/driver-theme";
import { useCustomerTheme } from "../contexts/CustomerThemeContext";

const INK = "#1C1916";
const CREAM = "#F7F3EC";
const AVATAR_BLUE = "#276EF1";

type Step = "airline" | "other" | "flight";

type Props = {
  visible: boolean;
  context: AirportPlaceContext;
  initialAirline?: string;
  initialFlightNumber?: string;
  onSkip: () => void;
  onComplete: (result: { airline: string; flightNumber: string }) => void;
  onRequestClose: () => void;
};

export function AirlinePickerModal({
  visible,
  context,
  initialAirline = "",
  initialFlightNumber = "",
  onSkip,
  onComplete,
  onRequestClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const { isDark } = useCustomerTheme();
  const [step, setStep] = useState<Step>("airline");
  const [query, setQuery] = useState("");
  const [selectedAirline, setSelectedAirline] = useState(initialAirline);
  const [otherName, setOtherName] = useState("");
  const [flightNumber, setFlightNumber] = useState(initialFlightNumber);

  useEffect(() => {
    if (!visible) return;
    setStep("airline");
    setQuery("");
    setSelectedAirline(initialAirline);
    setOtherName("");
    setFlightNumber(initialFlightNumber);
  }, [visible, initialAirline, initialFlightNumber]);

  const sections = useMemo(
    () => groupAirlinesByLetter(filterAirlines(query, AIRLINES)),
    [query]
  );

  const bg = isDark ? "#141210" : "#FFFFFF";
  const ink = isDark ? "#F5F0E8" : INK;
  const muted = isDark ? "#A8A29A" : "#6B6560";
  const hairline = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const soft = isDark ? "rgba(255,255,255,0.06)" : CREAM;
  const searchBg = isDark ? "rgba(255,255,255,0.08)" : "#F3F1ED";

  const contextTitle = context.terminal || context.label;
  const contextSub = context.iata
    ? context.terminal
      ? context.iata
      : context.label !== contextTitle
        ? context.iata
        : context.iata
    : undefined;

  const goFlight = (airlineName: string) => {
    const name = airlineName.trim();
    setSelectedAirline(name);
    setStep("flight");
  };

  const finish = (flight: string, airlineOverride?: string) => {
    const name = (airlineOverride ?? selectedAirline).trim();
    onComplete({
      airline: name,
      flightNumber: flight.trim().toUpperCase(),
    });
  };

  const headerTitle =
    step === "flight"
      ? "What's your flight number?"
      : step === "other"
        ? "Airline name"
        : "Which airline?";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onRequestClose}
    >
      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: bg, paddingTop: insets.top }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.header, { borderBottomColor: hairline }]}>
          <Pressable
            onPress={() => {
              if (step === "flight" || step === "other") {
                setStep("airline");
                return;
              }
              onRequestClose();
            }}
            hitSlop={10}
            style={styles.headerSide}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="arrow-back" size={22} color={ink} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: ink }]} numberOfLines={1}>
            {headerTitle}
          </Text>
          <Pressable
            onPress={onSkip}
            hitSlop={10}
            style={styles.headerSideRight}
            accessibilityRole="button"
            accessibilityLabel="Skip"
          >
            <Text style={[styles.skipText, { color: muted }]}>Skip</Text>
          </Pressable>
        </View>

        {step === "airline" ? (
          <>
            <View style={[styles.searchWrap, { backgroundColor: searchBg }]}>
              <Ionicons name="search" size={18} color={muted} />
              <TextInput
                style={[styles.searchInput, { color: ink }]}
                value={query}
                onChangeText={setQuery}
                placeholder="Search by airline name"
                placeholderTextColor={muted}
                autoCorrect={false}
                autoCapitalize="words"
                clearButtonMode="while-editing"
              />
            </View>

            <View style={styles.contextBlock}>
              <Text style={[styles.contextTitle, { color: ink }]} numberOfLines={1}>
                {contextTitle}
              </Text>
              {contextSub || context.iata ? (
                <Text style={[styles.contextSub, { color: muted }]} numberOfLines={1}>
                  {context.iata || contextSub}
                </Text>
              ) : null}
            </View>

            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              stickySectionHeadersEnabled
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: insets.bottom + 88 }}
              renderSectionHeader={({ section }) => (
                <View style={[styles.sectionHeader, { backgroundColor: bg }]}>
                  <Text style={[styles.sectionLetter, { color: ink }]}>
                    {section.title}
                  </Text>
                </View>
              )}
              renderItem={({ item }) => (
                <AirlineRow
                  airline={item}
                  ink={ink}
                  hairline={hairline}
                  onPress={() => goFlight(item.name)}
                />
              )}
              ListEmptyComponent={
                <Text style={[styles.empty, { color: muted }]}>
                  No airlines match “{query.trim()}”
                </Text>
              }
            />

            <View
              style={[
                styles.footer,
                {
                  paddingBottom: Math.max(insets.bottom, 12),
                  backgroundColor: bg,
                  borderTopColor: hairline,
                },
              ]}
            >
              <Pressable
                onPress={() => setStep("other")}
                style={({ pressed }) => [
                  styles.otherBtn,
                  { backgroundColor: soft },
                  pressed && { opacity: 0.88 },
                ]}
                accessibilityRole="button"
              >
                <Ionicons name="create-outline" size={18} color={isDark ? GOLD : INK} />
                <Text style={[styles.otherBtnText, { color: ink }]}>
                  Airline not listed
                </Text>
              </Pressable>
            </View>
          </>
        ) : null}

        {step === "other" ? (
          <View style={[styles.stepBody, { paddingBottom: insets.bottom + 24 }]}>
            <Text style={[styles.stepHint, { color: muted }]}>
              Enter the airline name as it appears on your ticket.
            </Text>
            <TextInput
              style={[
                styles.flightInput,
                {
                  color: ink,
                  backgroundColor: soft,
                  borderColor: hairline,
                },
              ]}
              value={otherName}
              onChangeText={setOtherName}
              placeholder="Airline name"
              placeholderTextColor={muted}
              autoFocus
              autoCapitalize="words"
            />
            <Pressable
              onPress={() => {
                if (!otherName.trim()) return;
                goFlight(otherName.trim());
              }}
              disabled={!otherName.trim()}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: isDark ? GOLD : INK },
                !otherName.trim() && { opacity: 0.4 },
                pressed && otherName.trim() && { opacity: 0.9 },
              ]}
            >
              <Text
                style={[
                  styles.primaryBtnText,
                  { color: isDark ? "#1A1208" : "#fff" },
                ]}
              >
                Continue
              </Text>
            </Pressable>
          </View>
        ) : null}

        {step === "flight" ? (
          <View style={[styles.stepBody, { paddingBottom: insets.bottom + 24 }]}>
            <Text style={[styles.stepAirline, { color: ink }]} numberOfLines={1}>
              {selectedAirline}
            </Text>
            <Text style={[styles.stepHint, { color: muted }]}>
              Optional — helps your chauffeur track delays.
            </Text>
            <TextInput
              style={[
                styles.flightInput,
                {
                  color: ink,
                  backgroundColor: soft,
                  borderColor: hairline,
                },
              ]}
              value={flightNumber}
              onChangeText={setFlightNumber}
              placeholder="e.g. AC123"
              placeholderTextColor={muted}
              autoFocus
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Pressable
              onPress={() => finish(flightNumber)}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: isDark ? GOLD : INK },
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text
                style={[
                  styles.primaryBtnText,
                  { color: isDark ? "#1A1208" : "#fff" },
                ]}
              >
                Done
              </Text>
            </Pressable>
            <Pressable
              onPress={() => finish("")}
              style={styles.secondarySkip}
              hitSlop={8}
            >
              <Text style={[styles.secondarySkipText, { color: muted }]}>
                Skip flight number
              </Text>
            </Pressable>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}

function AirlineRow({
  airline,
  ink,
  hairline,
  onPress,
}: {
  airline: Airline;
  ink: string;
  hairline: string;
  onPress: () => void;
}) {
  const letter = airlineInitial(airline.name);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: hairline },
        pressed && { opacity: 0.75 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={airline.name}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{letter}</Text>
      </View>
      <Text style={[styles.rowName, { color: ink }]} numberOfLines={1}>
        {airline.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSide: {
    width: 48,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSideRight: {
    minWidth: 48,
    height: 40,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingRight: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "600",
  },
  skipText: {
    fontSize: 16,
    fontWeight: "500",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  contextBlock: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },
  contextTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  contextSub: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "500",
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },
  sectionLetter: {
    fontSize: 18,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AVATAR_BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  rowName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "400",
  },
  empty: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 15,
    paddingHorizontal: 24,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  otherBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 12,
  },
  otherBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  stepBody: {
    paddingHorizontal: 20,
    paddingTop: 24,
    flex: 1,
  },
  stepAirline: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  stepHint: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  flightInput: {
    height: 52,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    fontSize: 17,
    fontWeight: "500",
    marginBottom: 16,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  secondarySkip: {
    marginTop: 16,
    alignItems: "center",
  },
  secondarySkipText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
