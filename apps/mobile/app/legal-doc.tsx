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

/** Clean in-app typography — no web-doc chrome. */
const APP_LEGAL_CSS = `
  html, body {
    margin: 0;
    padding: 0;
    background: #FFFFFF;
    -webkit-text-size-adjust: 100%;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  .legal-body {
    color: #1C1C1E;
    font-size: 16px;
    line-height: 1.65;
    letter-spacing: -0.015em;
    padding: 8px 4px 40px;
  }
  .legal-body h1,
  .legal-body h2,
  .legal-body h3,
  .legal-body h4 {
    color: #111827;
    font-weight: 700;
    letter-spacing: -0.025em;
    line-height: 1.3;
    margin: 1.6em 0 0.5em;
  }
  .legal-body h1 { font-size: 1.28em; margin-top: 0.4em; }
  .legal-body h2 { font-size: 1.08em; }
  .legal-body h3 { font-size: 1em; color: #374151; }
  .legal-body p {
    margin: 0 0 0.95em;
    color: #4B5563;
  }
  .legal-body strong { color: #111827; font-weight: 650; }
  .legal-body ul,
  .legal-body ol {
    margin: 0 0 1.1em;
    padding-left: 1.2em;
  }
  .legal-body li {
    margin: 0.4em 0;
    color: #4B5563;
  }
  .legal-body li::marker { color: #C9A063; }
  .legal-body a {
    color: #A87830;
    font-weight: 600;
    text-decoration: none;
  }
  .legal-body table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.85em 0 1.2em;
    font-size: 0.94em;
  }
  .legal-body th,
  .legal-body td {
    border-bottom: 1px solid #F0EBE3;
    padding: 12px 4px;
    text-align: left;
    vertical-align: top;
  }
  .legal-body th {
    font-weight: 700;
    color: #111827;
    border-bottom-color: #E5E0D8;
  }
  .legal-body td { color: #4B5563; }
  .legal-body .legal-callout {
    background: #FAF7F2;
    border-radius: 14px;
    padding: 16px;
    margin: 0 0 1.4em;
  }
  .legal-body .legal-callout h1,
  .legal-body .legal-callout h2 {
    margin: 0 0 0.35em;
    font-size: 1.12em;
    color: #111827;
  }
  .legal-body .legal-callout p {
    margin: 0;
    color: #6B7280;
    font-size: 0.94em;
  }
  .legal-body blockquote {
    border-left: 2px solid #C9A063;
    margin: 0.9em 0;
    padding: 0.2em 0 0.2em 0.85em;
    color: #6B7280;
  }
  .legal-body img {
    max-width: 100%;
    height: auto;
    border-radius: 10px;
  }
  .legal-body hr {
    border: none;
    border-top: 1px solid #EFEAE3;
    margin: 1.5em 0;
  }
`;

function resolveDoc(raw: string | string[] | undefined): DocKey {
  const v = (Array.isArray(raw) ? raw[0] : raw || "").toLowerCase().trim();
  if (v === "terms" || v === "terms-of-service" || v === "tos") return "terms";
  if (v === "refund" || v === "refund-policy" || v === "cancellation") return "refund";
  return "privacy";
}

function formatUpdatedAt(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function buildHtml(body: string) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
<style>${APP_LEGAL_CSS}</style>
</head>
<body>
  <div class="legal-body">${body}</div>
</body>
</html>`;
}

export default function LegalDocScreen() {
  const params = useLocalSearchParams<{ doc?: string }>();
  const docKey = resolveDoc(params.doc);
  const [title, setTitle] = useState(FALLBACK_TITLE[docKey]);
  const [htmlDoc, setHtmlDoc] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
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
        setUpdatedAt(formatUpdatedAt(d.updatedAt));
        setHtmlDoc(buildHtml(d.contentHtml));
      } else {
        setError(res.data?.error || "Unable to load content");
        setHtmlDoc(buildHtml("<p>Content could not be loaded. Please try again.</p>"));
      }
    } catch {
      setError("Unable to load content");
      setHtmlDoc(buildHtml("<p>Content could not be loaded. Please try again.</p>"));
    } finally {
      setLoading(false);
    }
  }, [docKey]);

  useEffect(() => {
    setTitle(FALLBACK_TITLE[docKey]);
    setUpdatedAt("");
    void load();
  }, [docKey, load]);

  const source = useMemo(() => ({ html: htmlDoc }), [htmlDoc]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          hitSlop={12}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          {updatedAt ? (
            <Text style={styles.headerMeta}>Updated {updatedAt}</Text>
          ) : null}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.brandLine}>
        <View style={styles.brandDot} />
        <Text style={styles.brandText}>SARJ Worldwide</Text>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <SlimSpinner size={26} stroke={2} color={GOLD} />
        </View>
      ) : (
        <WebView
          originWhitelist={["*"]}
          source={source}
          style={styles.webview}
          setSupportMultipleWindows={false}
          showsVerticalScrollIndicator={false}
          decelerationRate={Platform.OS === "ios" ? "normal" : undefined}
          containerStyle={styles.webviewContainer}
        />
      )}

      {error && !loading ? (
        <Pressable onPress={() => void load()} style={styles.retryRow}>
          <Text style={styles.errorHint}>{error}</Text>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={() => router.push("/customer/contact-us")}
        style={({ pressed }) => [styles.helpRow, pressed && styles.pressed]}
      >
        <Text style={styles.helpText}>Questions? Contact support</Text>
        <Ionicons name="chevron-forward" size={16} color="#A87830" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.3,
  },
  headerMeta: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "500",
    color: "#9CA3AF",
  },
  headerSpacer: {
    width: 44,
  },
  brandLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F0EBE3",
  },
  brandDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: GOLD,
  },
  brandText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#9CA3AF",
  },
  webviewContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
  },
  webview: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  retryRow: {
    alignItems: "center",
    paddingVertical: 10,
    gap: 4,
  },
  errorHint: {
    fontSize: 13,
    color: "#DC2626",
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#A87830",
  },
  helpRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#F0EBE3",
  },
  helpText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#A87830",
  },
  pressed: {
    opacity: 0.7,
  },
});
