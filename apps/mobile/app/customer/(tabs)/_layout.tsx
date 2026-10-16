import { Tabs } from "expo-router";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { GOLD } from "../../../theme/driver-theme";
import { useCustomerTheme } from "../../../contexts/CustomerThemeContext";

/** Icon+label row height before safe-area (compact, still ≥44pt tap). */
export const TAB_BAR_CONTENT_H = 46;

const TAB_META: Record<
  string,
  { label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  index: { label: "Home", icon: "home" },
  reservations: { label: "Bookings", icon: "calendar" },
  history: { label: "History", icon: "time" },
  profile: { label: "Profile", icon: "person" },
};

/** Footer follows customer light/dark theme; gold active accent. */
function UberFooterTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useCustomerTheme();
  const bottomPad = Math.max(insets.bottom - 4, 4);

  const focusedRoute = state.routes[state.index];
  const focusedOptions = focusedRoute
    ? descriptors[focusedRoute.key]?.options
    : undefined;
  const tabBarStyle = focusedOptions?.tabBarStyle;
  const styleObj =
    tabBarStyle && typeof tabBarStyle === "object" && !Array.isArray(tabBarStyle)
      ? (tabBarStyle as { display?: string })
      : null;
  // Plan your ride (and any screen) can hide the footer via tabBarStyle.display: "none".
  if (styleObj?.display === "none") {
    return null;
  }

  const barBg = isDark ? "#141210" : "#F5F2EA";
  const divider = isDark ? "rgba(255,255,255,0.1)" : "rgba(28,25,22,0.08)";
  const inactive = isDark ? "#A8A29A" : "#8E887D";
  const active = GOLD;

  return (
    <View style={[styles.bar, { paddingBottom: bottomPad, backgroundColor: barBg }]}>
      <View style={[styles.divider, { backgroundColor: divider }]} />
      <View style={[styles.row, { minHeight: TAB_BAR_CONTENT_H }]}>
        {state.routes.map((route, index) => {
          const meta = TAB_META[route.name];
          if (!meta) return null;

          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const color = focused ? active : inactive;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: "tabLongPress", target: route.key });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? meta.label}
              onPress={onPress}
              onLongPress={onLongPress}
              style={({ pressed }) => [styles.item, pressed && { opacity: 0.75 }]}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={meta.icon} size={27} color={color} />
              </View>
              <Text
                style={[styles.label, { color }, focused && styles.labelActive]}
                numberOfLines={1}
              >
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function CustomerTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <UberFooterTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="reservations" options={{ title: "Bookings" }} />
      <Tabs.Screen name="history" options={{ title: "History" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 8,
    paddingBottom: 0,
  },
  item: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  iconWrap: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.1,
    textAlign: "center",
    includeFontPadding: false,
  },
  labelActive: {
    fontWeight: "700",
  },
});
