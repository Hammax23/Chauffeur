import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const services = [
  {
    id: "airport-transfer",
    title: "Airport Transfer",
    description: "Reliable airport pickup and drop-off services",
    icon: "airplane",
    price: "From $89",
  },
  {
    id: "hourly-chauffeur",
    title: "Hourly Chauffeur",
    description: "Professional chauffeur at your service by the hour",
    icon: "time",
    price: "From $75/hr",
  },
  {
    id: "point-to-point",
    title: "Point to Point",
    description: "Direct transfer between any two locations",
    icon: "navigate",
    price: "From $65",
  },
  {
    id: "corporate-travel",
    title: "Corporate Travel",
    description: "Executive transportation for business needs",
    icon: "briefcase",
    price: "Custom",
  },
  {
    id: "special-events",
    title: "Special Events",
    description: "Luxury transport for weddings and special occasions",
    icon: "diamond",
    price: "Custom",
  },
];

export default function ServicesScreen() {
  return (
    <ScrollView className="flex-1 bg-white">
      <View className="px-6 py-6">
        <Text className="text-brand-black text-2xl font-bold mb-2">
          Our Services
        </Text>
        <Text className="text-gray-500 mb-6">
          Premium chauffeur services tailored to your needs
        </Text>

        <View className="gap-4">
          {services.map((service) => (
            <Link
              key={service.id}
              href={`/booking/${service.id}` as any}
              asChild
            >
              <TouchableOpacity className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm active:scale-[0.98]">
                <View className="flex-row items-start">
                  <View className="w-14 h-14 bg-primary/10 rounded-xl items-center justify-center">
                    <Ionicons
                      name={service.icon as any}
                      size={28}
                      color="#C9A063"
                    />
                  </View>
                  <View className="flex-1 ml-4">
                    <Text className="text-brand-black text-lg font-semibold">
                      {service.title}
                    </Text>
                    <Text className="text-gray-500 text-sm mt-1">
                      {service.description}
                    </Text>
                    <View className="flex-row items-center justify-between mt-3">
                      <Text className="text-primary font-semibold">
                        {service.price}
                      </Text>
                      <View className="flex-row items-center">
                        <Text className="text-primary text-sm mr-1">
                          Book Now
                        </Text>
                        <Ionicons
                          name="arrow-forward"
                          size={16}
                          color="#C9A063"
                        />
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </Link>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
