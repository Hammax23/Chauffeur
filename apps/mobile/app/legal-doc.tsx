import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fetchLegalDocument } from "../services/api";
import { SlimSpinner } from "../components/SlimSpinner";
import { GOLD } from "../theme/driver-theme";

type DocKey = "privacy" | "terms" | "refund";

const FALLBACK_TITLE: Record<DocKey, string> = {
  privacy: "Privacy Policy",
  terms: "Terms & Conditions",
  refund: "Refund Policy",
};

const FALLBACK_CSS = `
html, body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
.legal-body { font-family: inherit; color: #1C1C1E; font-size: 15px; line-height: 1.65; }
.legal-body h2 { font-size: 1.2em; font-weight: 800; margin: 1.35em 0 0.55em; line-height: 1.3; }
.legal-body p { margin: 0 0 0.85em; line-height: 1.65; }
.legal-body ul, .legal-body ol { margin: 0 0 1em; padding-left: 1.25em; }
.legal-body li { margin: 0.35em 0; line-height: 1.55; }
.legal-body table { width: 100%; border-collapse: collapse; margin: 0.75em 0 1em; }
.legal-body th, .legal-body td { border: 1px solid #E5E7EB; padding: 10px 12px; text-align: left; }
.legal-body th { background: #F3F4F6; font-weight: 700; }
.legal-body .legal-callout { background: rgba(201,160,99,0.12); border: 1px solid rgba(201,160,99,0.28); border-radius: 14px; padding: 14px 16px; margin: 0 0 1.25em; }
`;

function resolveDoc(raw: string | string[] | undefined): DocKey {
  const v = (Array.isArray(raw) ? raw[0] : raw || "").toLowerCase().trim();
  if (v === "terms" || v === "terms-of-service" || v === "tos") return "terms";
  if (v === "refund" || v === "refund-policy" || v === "cancellation") return "refund";
  return "privacy";
}

function buildHtml(body: string, css: string) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
<style>
html,body{margin:0;padding:0;background:#F5F5F7;-webkit-text-size-adjust:100%;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,Helvetica,Arial,sans-serif;}
${css || FALLBACK_CSS}
</style>
</head>
<body>
  <div style="padding:4px 16px 28px">
    <div class="legal-body">${body}</div>
  </div>
</body>
</html>`;
}

export default function LegalDocScreen() {
  const params = useLocalSearchParams<{ doc?: string }>();
  const docKey = resolveDoc(params.doc);
  const [title, setTitle] = useState(FALLBACK_TITLE[docKey]);
  const [htmlDoc, setHtmlDoc] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchLegalDocument(docKey);
      if (res.ok && res.data.success && res.data.document) {
        const d = res.data.document;
        setTitle(d.title || FALLBACK_TITLE[docKey]);
        setHtmlDoc(buildHtml(d.contentHtml, d.customCss));
      } else {
        setError(res.data?.error || "Unable to load content");
        setHtmlDoc(buildHtml("<p>Content could not be loaded. Please try again.</p>", FALLBACK_CSS));
      }
    } catch {
      setError("Unable to load content");
      setHtmlDoc(buildHtml("<p>Content could not be loaded. Please try again.</p>", FALLBACK_CSS));
    } finally {
      setLoading(false);
    }
  }, [docKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const source = useMemo(() => ({ html: htmlDoc }), [htmlDoc]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={22} color="#1C1C1E" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <Pressable
          onPress={() => void load()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          hitSlop={10}
        >
          <Ionicons name="refresh" size={18} color="#1C1C1E" />
        </Pressable>
      </View>

      <View style={styles.body}>
        {!loading ? (
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>{title}</Text>
            <Text style={styles.heroBrand}>SARJ Worldwide</Text>
          </View>
        ) : null}
        {loading ? (
          <View style={styles.loading}>
            <SlimSpinner size={28} stroke={2} color={GOLD} />
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        ) : (
          <WebView
            originWhitelist={["*"]}
            source={source}
            style={styles.webview}
            setSupportMultipleWindows={false}
            showsVerticalScrollIndicator={false}
            decelerationRate={Platform.OS === "ios" ? "normal" : undefined}
          />
        )}
      </View>

      {error && !loading ? (
        <Text style={styles.errorHint}>{error}</Text>
      ) : null}

      <View style={styles.contactBar}>
        <Text style={styles.contactLead}>
          Questions? Message our team from Contact Us in the app.
        </Text>
        <Pressable
          onPress={() => router.push("/customer/contact-us")}
          style={({ pressed }) => [styles.contactCtaWrap, pressed && styles.pressed]}
        >
          <LinearGradient
            colors={["#E8C078", GOLD, "#B8862E"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.contactCta}
          >
            <Ionicons name="mail-outline" size={16} color="#1A1208" />
            <Text style={styles.contactCtaText}>Open Contact Us</Text>
            <Ionicons name="chevron-forward" size={16} color="#1A1208" />
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F5F7" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  pressed: { opacity: 0.7 },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: "#1C1C1E",
  },
  body: { flex: 1, backgroundColor: "#F5F5F7" },
  hero: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: "#1C1C1E",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  heroBrand: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: -0.1,
  },
  webview: { flex: 1, backgroundColor: "transparent" },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: { fontSize: 13, color: "#8E8E93", fontWeight: "500" },
  errorHint: {
    textAlign: "center",
    fontSize: 12,
    color: "#DC2626",
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  contactBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.08)",
    backgroundColor: "#FFF",
  },
  contactLead: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 10,
    lineHeight: 18,
  },
  contactCtaWrap: { borderRadius: 14, overflow: "hidden" },
  contactCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  contactCtaText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1A1208",
    letterSpacing: -0.2,
  },
});
