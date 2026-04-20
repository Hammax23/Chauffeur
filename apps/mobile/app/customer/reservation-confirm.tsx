import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function ReservationConfirmScreen() {
  const [nameOnCard, setNameOnCard] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [gratuity, setGratuity] = useState("15%");
  const [termsAccepted, setTermsAccepted] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color="#1a1a1a" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Reservation</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          <View style={styles.stepCompleted}>
            <Text style={styles.stepCompletedText}>1</Text>
          </View>
          <View style={styles.stepLineActive} />
          <View style={styles.stepActive}>
            <Text style={styles.stepActiveText}>2</Text>
          </View>
        </View>

        {/* Confirmation Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Confirmation</Text>
          <Text style={styles.sectionSubtitle}>Review & Pay</Text>

          {/* Order Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Vehicle</Text>
              <Text style={styles.summaryValue}>Cadillac XTS</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date & Time</Text>
              <Text style={styles.summaryValue}>04/16/2026, 11:30 AM</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Passengers</Text>
              <Text style={styles.summaryValue}>1</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Estimated</Text>
              <Text style={styles.summaryValue}>36.2 Km / 29 mins</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Rate</Text>
              <Text style={styles.summaryValue}>$115/hr</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Duration (billable)</Text>
              <Text style={styles.summaryValue}>1hr</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Child Seat (1 x $25)</Text>
              <Text style={styles.summaryValue}>$25.00</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>$140.00</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>HST (13%)</Text>
              <Text style={styles.summaryValue}>$18.20</Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.gratuityLabel}>
                <Text style={styles.summaryLabel}>Gratuity</Text>
                <TouchableOpacity style={styles.gratuityDropdown}>
                  <Text style={styles.gratuityText}>15%</Text>
                  <Ionicons name="chevron-down" size={14} color="#1a1a1a" />
                </TouchableOpacity>
              </View>
              <Text style={styles.summaryValue}>$21.00</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>$179.20 CAD</Text>
            </View>
          </View>
        </View>

        {/* Payment Card Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Card</Text>

          <Text style={styles.inputLabel}>Name on card</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.textInput}
              placeholder="Name as it appears on card"
              placeholderTextColor="#999"
              value={nameOnCard}
              onChangeText={setNameOnCard}
            />
          </View>

          <Text style={styles.inputLabel}>Card Details (Secure Validation)</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.textInput}
              placeholder="Card Number"
              placeholderTextColor="#999"
              value={cardNumber}
              onChangeText={setCardNumber}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.cardRow}>
            <View style={styles.cardField}>
              <Text style={styles.inputLabel}>EXP</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Expiry"
                  placeholderTextColor="#999"
                  value={expiry}
                  onChangeText={setExpiry}
                />
              </View>
            </View>
            <View style={styles.cardField}>
              <Text style={styles.inputLabel}>CVV</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  placeholder="CVV"
                  placeholderTextColor="#999"
                  value={cvv}
                  onChangeText={setCvv}
                  keyboardType="numeric"
                  secureTextEntry
                />
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.validateBtn} activeOpacity={0.9}>
            <Text style={styles.validateBtnText}>Validate Card</Text>
          </TouchableOpacity>

          <View style={styles.secureNote}>
            <Ionicons name="lock-closed" size={14} color="#D4A04A" />
            <Text style={styles.secureNoteText}>
              Your card will be securely validated without any charges
            </Text>
          </View>
        </View>

        {/* Billing Address Section */}
        <View style={styles.section}>
          <Text style={styles.inputLabel}>Billing Address (Optional)</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.textInput}
              placeholder="Card billing street address"
              placeholderTextColor="#999"
              value={billingAddress}
              onChangeText={setBillingAddress}
            />
          </View>

          <View style={[styles.inputBox, { marginTop: 12 }]}>
            <TextInput
              style={styles.textInput}
              placeholder="ZIP/Postal code"
              placeholderTextColor="#999"
              value={zipCode}
              onChangeText={setZipCode}
            />
          </View>
        </View>

        {/* Before you pay info */}
        <View style={styles.infoBox}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={18} color="#D4A04A" />
            <Text style={styles.infoTitle}>Before you pay</Text>
          </View>
          <View style={styles.infoList}>
            <Text style={styles.infoItem}>• Flight tracking included for airport transfers</Text>
            <Text style={styles.infoItem}>• 15 minutes complimentary wait time</Text>
            <Text style={styles.infoItem}>• Meet & greet service with name board (extra charge applies)</Text>
            <Text style={styles.infoItem}>• For Wi-Fi access, please ask your chauffeur</Text>
            <Text style={styles.infoItem}>• 24/7 customer support</Text>
            <Text style={styles.infoItem}>• 407 ETR (extra charges applies)</Text>
          </View>
        </View>

        {/* Terms Checkbox */}
        <TouchableOpacity 
          style={styles.termsRow}
          onPress={() => setTermsAccepted(!termsAccepted)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
            {termsAccepted && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <Text style={styles.termsText}>
            I agree to the{" "}
            <Text style={styles.termsLink}>Terms of Service</Text>,{" "}
            <Text style={styles.termsLink}>Privacy Policy</Text> &{" "}
            <Text style={styles.termsLink}>Cancellation Policy</Text>
          </Text>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={styles.previousBtn} 
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.previousBtnText}>Previous</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.submitBtn} 
          activeOpacity={0.9}
          onPress={() => router.push("/customer/reservation-pending")}
        >
          <Text style={styles.submitBtnText}>Submit Reservation</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  backText: {
    fontSize: 15,
    color: "#1a1a1a",
    marginLeft: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
  },
  stepCompleted: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#D4A04A",
    justifyContent: "center",
    alignItems: "center",
  },
  stepCompletedText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  stepLineActive: {
    width: 180,
    height: 2,
    backgroundColor: "#D4A04A",
  },
  stepActive: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#D4A04A",
    justifyContent: "center",
    alignItems: "center",
  },
  stepActiveText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#D4A04A",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#D4A04A",
    marginBottom: 16,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#666",
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1a1a1a",
  },
  divider: {
    height: 1,
    backgroundColor: "#e8e8e8",
    marginVertical: 8,
  },
  gratuityLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gratuityDropdown: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  gratuityText: {
    fontSize: 12,
    color: "#1a1a1a",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#D4A04A",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1a1a1a",
    marginBottom: 8,
    marginTop: 12,
  },
  inputBox: {
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fafafa",
  },
  textInput: {
    fontSize: 14,
    color: "#1a1a1a",
  },
  cardRow: {
    flexDirection: "row",
    gap: 12,
  },
  cardField: {
    flex: 1,
  },
  validateBtn: {
    backgroundColor: "#D4A04A",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  validateBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  secureNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
  },
  secureNoteText: {
    fontSize: 11,
    color: "#666",
  },
  infoBox: {
    backgroundColor: "#fffbf5",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#f5efe5",
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  infoList: {
    gap: 6,
  },
  infoItem: {
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: "#D4A04A",
    borderColor: "#D4A04A",
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
  },
  termsLink: {
    color: "#D4A04A",
    textDecorationLine: "underline",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    gap: 12,
    ...Platform.select({
      ios: {
        paddingBottom: 30,
      },
    }),
  },
  previousBtn: {
    flex: 0.4,
    borderWidth: 1.5,
    borderColor: "#1a1a1a",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  previousBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  submitBtn: {
    flex: 0.6,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});
