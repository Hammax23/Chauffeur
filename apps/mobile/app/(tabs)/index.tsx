import { View, Text, ScrollView, Image, TouchableOpacity } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { APP_NAME } from "@chauffeur/shared";

export default function HomeScreen() {
  return (
    <ScrollView className="flex-1 bg-white">
      {/* Hero Section */}
      <View className="bg-brand-black px-6 pt-12 pb-16">
        <Text className="text-primary text-sm tracking-widest uppercase mb-2">
          Welcome to
        </Text>
        <Text className="text-white text-3xl font-bold tracking-wider mb-4">
          {APP_NAME}
        </Text>
        <Text className="text-gray-400 text-base leading-relaxed">
          Premium chauffeur services for your comfort and style. Book your luxury ride today.
        </Text>
      </View>

      {/* Quick Actions */}
      <View className="px-6 -mt-8">
        <View className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <Text className="text-brand-black text-lg font-semibold mb-4">
            Quick Book
          </Text>
          <View className="flex-row gap-4">
            <Link href="/services" asChild>
              <TouchableOpacity className="flex-1 bg-primary/10 rounded-xl p-4 items-center">
                <Ionicons name="car" size={28} color="#C9A063" />
                <Text className="text-brand-black text-sm mt-2 font-medium">
                  Airport Transfer
                </Text>
              </TouchableOpacity>
            </Link>
            <Link href="/services" asChild>
              <TouchableOpacity className="flex-1 bg-primary/10 rounded-xl p-4 items-center">
                <Ionicons name="time" size={28} color="#C9A063" />
                <Text className="text-brand-black text-sm mt-2 font-medium">
                  Hourly Service
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </View>

      {/* Features */}
      <View className="px-6 mt-8">
        <Text className="text-brand-black text-xl font-semibold mb-4">
          Why Choose Us
        </Text>
        
        <View className="gap-4">
          <FeatureCard
            icon="shield-checkmark"
            title="Professional Chauffeurs"
            description="Experienced and vetted drivers for your safety"
          />
          <FeatureCard
            icon="car-sport"
            title="Luxury Fleet"
            description="Premium vehicles for every occasion"
          />
          <FeatureCard
            icon="time"
            title="24/7 Availability"
            description="Book anytime, anywhere across Canada"
          />
          <FeatureCard
            icon="card"
            title="Transparent Pricing"
            description="No hidden fees, pay what you see"
          />
        </View>
      </View>

      {/* CTA */}
      <View className="px-6 py-8">
        <Link href="/services" asChild>
          <TouchableOpacity className="bg-primary py-4 rounded-xl items-center">
            <Text className="text-white font-semibold text-base tracking-wider uppercase">
              View All Services
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
    </ScrollView>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}) {
  return (
    <View className="flex-row items-center bg-gray-50 rounded-xl p-4">
      <View className="w-12 h-12 bg-primary/10 rounded-full items-center justify-center">
        <Ionicons name={icon} size={24} color="#C9A063" />
      </View>
      <View className="flex-1 ml-4">
        <Text className="text-brand-black font-semibold">{title}</Text>
        <Text className="text-gray-500 text-sm mt-0.5">{description}</Text>
      </View>
    </View>
  );
}
