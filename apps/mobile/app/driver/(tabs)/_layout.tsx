import { useCallback, useEffect, useState } from "react";
import { Tabs, useFocusEffect } from "expo-router";
import { View, Text, Pressable, StyleSheet, AppState } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { GOLD } from "../../../theme/driver-theme";
import { useDriverTheme } from "../../../contexts/DriverThemeContext";
import { getDriverChatThreads } from "../../../services/api";
import { subscribeInboxBadgeRefresh } from "../../../services/inbox-badge-bus";
import { syncAppIconBadge } from "../../../services/notifications";

/** Icon+label row height before safe-area. */
export const DRIVER_TAB_BAR_CONTENT_H = 46;

const INBOX_BADGE_POLL_MS = 30_000;

const TAB_META: Record<
  string,
  { label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  index: { label: "Home", icon: "home" },
  inbox: { label: "Inbox", icon: "chatbubble-ellipses" },
  history: { label: "History", icon: "time" },
  profile: { label: "Profile", icon: "person" },
};

function DriverFooterTabBar({
  state,
  descriptors,
  navigation,
  inboxUnread,
}: BottomTabBarProps & { inboxUnread: number }) {
  const insets = useSafeAreaInsets();
  const { isDark } = useDriverTheme();
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
  if (styleObj?.display === "none") {
    return null;
  }

  const barBg = isDark ? "#12100E" : "#F5F2EA";
  const divider = isDark ? "rgba(255,255,255,0.1)" : "rgba(28,25,22,0.08)";
  const inactive = isDark ? "#A8A29A" : "#8E887D";
  const active = GOLD;

  return (
    <View style={[styles.bar, { paddingBottom: bottomPad, backgroundColor: barBg }]}>
      <View style={[styles.divider, { backgroundColor: divider }]} />
      <View style={[styles.row, { minHeight: DRIVER_TAB_BAR_CONTENT_H }]}>
        {state.routes.map((route, index) => {
          const meta = TAB_META[route.name];
          if (!meta) return null;

          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const color = focused ? active : inactive;
          const showBadge = route.name === "inbox" && inboxUnread > 0;

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
                <Ionicons name={meta.icon} size={26} color={color} />
                {showBadge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {inboxUnread > 99 ? "99+" : String(inboxUnread)}
                    </Text>
                  </View>
                ) : null}
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

export default function DriverTabsLayout() {
  const [inboxUnread, setInboxUnread] = useState(0);

  const refreshUnread = useCallback(async () => {
    try {
      const data = await getDriverChatThreads();
      if (data.success) {
        const total = Math.max(0, data.totalUnread || 0);
        setInboxUnread(total);
        void syncAppIconBadge(total);
      }
    } catch {
      /* keep last known badge */
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshUnread();
      const id = setInterval(() => void refreshUnread(), INBOX_BADGE_POLL_MS);
      return () => clearInterval(id);
    }, [refreshUnread])
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") void refreshUnread();
    });
    return () => sub.remove();
  }, [refreshUnread]);

  useEffect(() => subscribeInboxBadgeRefresh(() => void refreshUnread()), [refreshUnread]);

  return (
    <Tabs
      tabBar={(props) => <DriverFooterTabBar {...props} inboxUnread={inboxUnread} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="inbox" options={{ title: "Inbox" }} />
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
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#12100E",
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
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
