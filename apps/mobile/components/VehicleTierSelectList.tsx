import { View, Text, Image, Pressable, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SlimSpinner } from "./SlimSpinner";
import {
  formatTierDisplayTitle,
  getTierCapacity,
  getTierLuggage,
  getTierSubtitle,
  isVipFleetTier,
  type VehicleTierOption,
} from "../data/vehicle-tiers";
import { GOLD } from "../theme/driver-theme";
import { VipFleetBadge } from "./VipFleetBadge";

type Props = {
  tiers: VehicleTierOption[];
  selectedId: string | null;
  fares: Record<string, number>;
  onSelect: (id: string) => void;
  loading?: boolean;
  textColor: string;
  mutedColor: string;
  isDark: boolean;
};

/**
 * Enterprise vehicle rows (thumb · title · capacity · fare · radio).
 * Used inline on Plan your ride; mirrors Select Car sheet rows.
 */
export function VehicleTierSelectList({
  tiers,
  selectedId,
  fares,
  onSelect,
  loading,
  textColor,
  mutedColor,
  isDark,
}: Props) {
  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <SlimSpinner size={26} stroke={2} color={GOLD} />
        <Text style={[styles.loadingText, { color: mutedColor }]}>Loading vehicles…</Text>
      </View>
    );
  }

  if (tiers.length === 0) {
    return (
      <Text style={[styles.emptyText, { color: mutedColor }]}>
        No vehicles available right now.
      </Text>
    );
  }

  return (
    <View style={styles.list}>
      {tiers.map((tier) => {
        const selected = selectedId === tier.id;
        const tierFare = fares[tier.id];
        const tierLine = getTierSubtitle(tier.id, tier.subtitle, tier.description);
        return (
          <Pressable
            key={tier.id}
            onPress={() => onSelect(tier.id)}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF",
                borderColor: selected
                  ? GOLD
                  : isDark
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.06)",
              },
              selected && styles.rowSelected,
              pressed && { opacity: 0.92 },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${formatTierDisplayTitle(tier.title)}${
              tierFare != null ? `, $${tierFare.toFixed(0)}` : ""
            }`}
          >
            <Image
              source={{ uri: tier.imageUrl }}
              style={styles.thumb}
              resizeMode="contain"
            />
            <View style={styles.copy}>
              <View style={styles.titleRow}>
                <Text style={[styles.name, { color: textColor }]} numberOfLines={2}>
                  {formatTierDisplayTitle(tier.title)}
                </Text>
                {isVipFleetTier(tier.id) ? (
                  <VipFleetBadge isDark={isDark} compact />
                ) : null}
                <View
                  style={styles.capacityBadges}
                  accessibilityLabel={`${getTierCapacity(tier)} passengers, ${getTierLuggage(tier)} luggage`}
                >
                  <View style={styles.capacityInline}>
                    <Ionicons name="person" size={13} color={mutedColor} />
                    <Text style={[styles.capacityText, { color: mutedColor }]}>
                      {getTierCapacity(tier)}
                    </Text>
                  </View>
                  <View style={styles.capacityInline}>
                    <Ionicons name="briefcase" size={13} color={mutedColor} />
                    <Text style={[styles.capacityText, { color: mutedColor }]}>
                      {getTierLuggage(tier)}
                    </Text>
                  </View>
                </View>
              </View>
              {tierLine ? (
                <Text style={[styles.sub, { color: mutedColor }]} numberOfLines={2}>
                  {tierLine}
                </Text>
              ) : null}
            </View>
            <View style={styles.meta}>
              <Text style={[styles.price, { color: textColor }]} numberOfLines={1}>
                {tierFare != null
                  ? `$${tierFare.toFixed(0)}`
                  : tier.hourlyRate > 0
                    ? `$${tier.hourlyRate.toFixed(0)}`
                    : tier.pricePerKm > 0
                      ? `$${tier.pricePerKm.toFixed(2)}`
                      : "—"}
              </Text>
              <View
                style={[
                  styles.radio,
                  {
                    borderColor: selected ? GOLD : isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.15)",
                    backgroundColor: selected ? GOLD : "transparent",
                  },
                ]}
              >
                {selected ? <Ionicons name="checkmark" size={12} color="#1A1208" /> : null}
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    gap: 10,
  },
  loadingText: { fontSize: 13, fontWeight: "600" },
  emptyText: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    paddingVertical: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },
  rowSelected: { borderWidth: 2 },
  thumb: {
    width: 88,
    height: 64,
    backgroundColor: "transparent",
    flexShrink: 0,
  },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "nowrap",
  },
  name: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  capacityBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  capacityInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    flexShrink: 0,
  },
  capacityText: {
    fontSize: 13,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  sub: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
  },
  meta: {
    alignItems: "flex-end",
    gap: 6,
    flexShrink: 0,
    minWidth: 56,
  },
  price: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
