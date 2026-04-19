import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { Link } from "expo-router";

export default function BookingsScreen() {
  const { user } = useAuth();

  if (!user) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-6">
        <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
          <Ionicons name="calendar-outline" size={40} color="#9ca3af" />
        </View>
        <Text className="text-brand-black text-xl font-semibold mb-2">
          Login Required
        </Text>
        <Text className="text-gray-500 text-center mb-6">
          Please login to view your bookings
        </Text>
        <Link href="/auth/login" asChild>
          <TouchableOpacity className="bg-primary px-8 py-3 rounded-xl">
            <Text className="text-white font-semibold">Login</Text>
          </TouchableOpacity>
        </Link>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="px-6 py-6">
        <Text className="text-brand-black text-2xl font-bold mb-2">
          My Bookings
        </Text>
        <Text className="text-gray-500 mb-6">
          View and manage your reservations
        </Text>

        {/* Empty State */}
        <View className="items-center py-12">
          <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
            <Ionicons name="car-outline" size={40} color="#9ca3af" />
          </View>
          <Text className="text-brand-black text-lg font-semibold mb-2">
            No Bookings Yet
          </Text>
          <Text className="text-gray-500 text-center mb-6">
            Your booking history will appear here
          </Text>
          <Link href="/services" asChild>
            <TouchableOpacity className="bg-primary px-6 py-3 rounded-xl">
              <Text className="text-white font-semibold">Browse Services</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}
