import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  Switch,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function CreateReservationScreen() {
  const [serviceType, setServiceType] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [passengers, setPassengers] = useState("");
  const [selectedCar, setSelectedCar] = useState("Mercedes-Maybach S-Class");
  const [tollRoute, setTollRoute] = useState(true);
  const [childSeatCount, setChildSeatCount] = useState(1);
  const [firstName, setFirstName] = useState("Valadimir");
  const [lastName, setLastName] = useState("Putin");
  const [phoneNumber, setPhoneNumber] = useState("+1234567890");
  const [email, setEmail] = useState("voladmir@gmail.com");

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
          <View style={styles.stepActive}>
            <Text style={styles.stepActiveText}>1</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepInactive}>
            <Text style={styles.stepInactiveText}>2</Text>
          </View>
        </View>

        {/* Ride Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ride Details</Text>
          <Text style={styles.sectionSubtitle}>When & Where</Text>

          {/* Service Type */}
          <Text style={styles.inputLabel}>Service Type</Text>
          <TouchableOpacity style={styles.dropdown}>
            <Text style={styles.placeholderText}>Select Service</Text>
            <Ionicons name="chevron-down" size={20} color="#999" />
          </TouchableOpacity>

          {/* Pickup Address */}
          <Text style={styles.inputLabel}>Pickup Address</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="location-outline" size={18} color="#999" />
            <TextInput
              style={styles.inputField}
              placeholder="Address or airport code (e.g. YYZ)"
              placeholderTextColor="#999"
              value={pickupAddress}
              onChangeText={setPickupAddress}
            />
          </View>

          {/* Dropoff Address */}
          <Text style={styles.inputLabel}>Dropoff Address</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="location-outline" size={18} color="#999" />
            <TextInput
              style={styles.inputField}
              placeholder="Destination address"
              placeholderTextColor="#999"
              value={dropoffAddress}
              onChangeText={setDropoffAddress}
            />
          </View>

          {/* Add Stop */}
          <TouchableOpacity style={styles.addStopBtn}>
            <Ionicons name="add-circle-outline" size={20} color="#D4A04A" />
            <Text style={styles.addStopText}>Add Stop</Text>
          </TouchableOpacity>

          {/* Pick-up Time */}
          <Text style={styles.inputLabel}>Pick-up Time</Text>
          <TouchableOpacity style={styles.inputWithIcon}>
            <TextInput
              style={[styles.inputField, { flex: 1 }]}
              placeholder="Select date & time"
              placeholderTextColor="#999"
              value={pickupTime}
              editable={false}
            />
            <Ionicons name="time-outline" size={18} color="#999" />
          </TouchableOpacity>

          {/* Passengers */}
          <Text style={styles.inputLabel}>Passengers</Text>
          <TouchableOpacity style={styles.dropdown}>
            <Text style={styles.placeholderText}>No of passengers</Text>
            <Ionicons name="chevron-down" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Map Preview */}
        <View style={styles.mapContainer}>
          <Image
            source={{ uri: "https://maps.googleapis.com/maps/api/staticmap?center=43.6532,-79.3832&zoom=11&size=400x200&style=feature:all|saturation:-100" }}
            style={styles.mapImage}
            resizeMode="cover"
          />
          <View style={styles.mapOverlay}>
            {/* Route dots */}
            <View style={styles.routeContainer}>
              <View style={styles.routeDot} />
              <View style={styles.routeLine} />
              <View style={styles.routeDot} />
              <View style={styles.routeLine} />
              <View style={styles.routeDot} />
            </View>
          </View>
          {/* Distance & Duration */}
          <View style={styles.mapInfo}>
            <View style={styles.mapInfoItem}>
              <Text style={styles.mapInfoLabel}>Estimated Distance</Text>
              <Text style={styles.mapInfoValue}>36.2 Km</Text>
            </View>
            <View style={styles.mapInfoItem}>
              <Text style={styles.mapInfoLabel}>Estimated Duration</Text>
              <Text style={styles.mapInfoValue}>51 Mins</Text>
            </View>
          </View>
        </View>

        {/* Select Vehicle Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Vehicle</Text>
          <Text style={styles.sectionSubtitle}>Choose your Ride</Text>

          {/* Select Car */}
          <Text style={styles.inputLabel}>Select Car</Text>
          <TouchableOpacity style={styles.carSelector}>
            <View style={styles.carInfo}>
              <Image
                source={{ uri: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=100&q=80" }}
                style={styles.carThumb}
                resizeMode="contain"
              />
              <Text style={styles.carName}>Mercedes-Maybach S-Class</Text>
            </View>
            <View style={styles.carPrice}>
              <Text style={styles.carPriceText}>$ 450/hr</Text>
              <Ionicons name="chevron-down" size={18} color="#D4A04A" />
            </View>
          </TouchableOpacity>

          {/* 407 ETR Toggle */}
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleTitle}>407 ETR</Text>
              <Text style={styles.toggleSubtitle}>Highway 407 Express Toll Route</Text>
            </View>
            <Switch
              value={tollRoute}
              onValueChange={setTollRoute}
              trackColor={{ false: "#e0e0e0", true: "#D4A04A" }}
              thumbColor="#fff"
            />
          </View>

          {/* Child Seat */}
          <View style={styles.counterRow}>
            <View>
              <Text style={styles.toggleTitle}>Child Seat</Text>
              <Text style={styles.toggleSubtitle}>Child Seat $25</Text>
            </View>
            <View style={styles.counter}>
              <TouchableOpacity 
                style={styles.counterBtn}
                onPress={() => setChildSeatCount(Math.max(0, childSeatCount - 1))}
              >
                <Ionicons name="remove" size={18} color="#1a1a1a" />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{childSeatCount}</Text>
              <TouchableOpacity 
                style={[styles.counterBtn, styles.counterBtnAdd]}
                onPress={() => setChildSeatCount(childSeatCount + 1)}
              >
                <Ionicons name="add" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Contact Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Info</Text>
          <Text style={styles.sectionSubtitle}>Your Details</Text>

          {/* Name Row */}
          <View style={styles.nameRow}>
            <View style={styles.nameField}>
              <Text style={styles.inputLabel}>First Name*</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>
            </View>
            <View style={styles.nameField}>
              <Text style={styles.inputLabel}>Last Name*</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            </View>
          </View>

          {/* Phone Number */}
          <Text style={styles.inputLabel}>Phone Number*</Text>
          <View style={styles.phoneInput}>
            <View style={styles.countryCode}>
              <View style={styles.flagIcon}>
                <Text>🇨🇦</Text>
              </View>
              <Ionicons name="chevron-down" size={14} color="#999" />
            </View>
            <TextInput
              style={styles.phoneField}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
          </View>

          {/* Email */}
          <Text style={styles.inputLabel}>Email*</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={styles.continueBtn} 
          activeOpacity={0.9}
          onPress={() => router.push("/customer/reservation-confirm")}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
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
  stepActive: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#D4A04A",
    justifyContent: "center",
    alignItems: "center",
  },
  stepActiveText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  stepLine: {
    width: 180,
    height: 2,
    backgroundColor: "#e0e0e0",
  },
  stepInactive: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
  },
  stepInactiveText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#999",
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
  inputLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1a1a1a",
    marginBottom: 8,
    marginTop: 12,
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#fafafa",
  },
  placeholderText: {
    fontSize: 14,
    color: "#999",
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fafafa",
    gap: 10,
  },
  inputField: {
    flex: 1,
    fontSize: 14,
    color: "#1a1a1a",
  },
  addStopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  addStopText: {
    fontSize: 13,
    color: "#D4A04A",
    fontWeight: "500",
  },
  mapContainer: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 24,
    backgroundColor: "#f5f5f5",
  },
  mapImage: {
    width: "100%",
    height: 100,
    backgroundColor: "#e8e8e8",
  },
  mapOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  routeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#D4A04A",
  },
  routeLine: {
    width: 40,
    height: 2,
    backgroundColor: "#D4A04A",
  },
  mapInfo: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  mapInfoItem: {
    flex: 1,
  },
  mapInfoLabel: {
    fontSize: 11,
    color: "#999",
    marginBottom: 2,
  },
  mapInfoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  carSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fafafa",
  },
  carInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  carThumb: {
    width: 50,
    height: 30,
  },
  carName: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1a1a1a",
  },
  carPrice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  carPriceText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#D4A04A",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: 12,
    color: "#999",
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  counter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  counterBtnAdd: {
    backgroundColor: "#D4A04A",
    borderColor: "#D4A04A",
  },
  counterValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    minWidth: 20,
    textAlign: "center",
  },
  nameRow: {
    flexDirection: "row",
    gap: 12,
  },
  nameField: {
    flex: 1,
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
  phoneInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 10,
    backgroundColor: "#fafafa",
    overflow: "hidden",
  },
  countryCode: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: "#e8e8e8",
    gap: 4,
  },
  flagIcon: {
    width: 22,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  phoneField: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1a1a1a",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    ...Platform.select({
      ios: {
        paddingBottom: 30,
      },
    }),
  },
  continueBtn: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
