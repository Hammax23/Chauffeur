import { Tabs } from "expo-router";
import {
  View,
  Text,
  Pressable,
  Platform,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const BAR_BG = "#1C1916";
const ACTIVE = "#D9B88A";
const ACTIVE_PILL = "#3E362E";
const INACTIVE = "#9F9485";

const TAB_META: Record<
  string,
  { label: string; icon: keyof typeof Ionicons.glyphMap; iconFocused: keyof typeof Ionicons.glyphMap }
> = {
  index: { label: "Home", icon: "home-outline", iconFocused: "home" },
  reservations: { label: "Bookings", icon: "calendar-outline", iconFocused: "calendar-outline" },
  history: { label: "History", icon: "time-outline", iconFocused: "time-outline" },
  profile: { label: "Profile", icon: "person-circle-outline", iconFocused: "person-circle-outline" },
};

function FloatingPillTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 10);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: bottomPad }]}
    >
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const meta = TAB_META[route.name] ?? {
            label: options.title ?? route.name,
            icon: "ellipse-outline" as const,
            iconFocused: "ellipse" as const,
          };
          const color = focused ? ACTIVE : INACTIVE;

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
              style={({ pressed }) => [styles.item, pressed && { opacity: 0.85 }]}
            >
              <View style={[styles.iconPill, focused && styles.iconPillActive]}>
                <Ionicons
                  name={focused ? meta.iconFocused : meta.icon}
                  size={22}
                  color={color}
                />
              </View>
              <Text style={[styles.label, { color }, focused && styles.labelActive]}>
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
      tabBar={(props) => <FloatingPillTabBar {...props} />}
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
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  pill: {
    width: "100%",
    maxWidth: 420,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: BAR_BG,
    borderRadius: 36,
    paddingVertical: 10,
    paddingHorizontal: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.28,
        shadowRadius: 18,
      },
      android: { elevation: 12 },
    }),
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 2,
  },
  iconPill: {
    minWidth: 52,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  iconPillActive: {
    backgroundColor: ACTIVE_PILL,
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  labelActive: {
    fontWeight: "700",
  },
});
