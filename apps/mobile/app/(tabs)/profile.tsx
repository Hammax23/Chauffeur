import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { Link, router } from "expo-router";
import { getInitials } from "@chauffeur/shared";

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-6">
        <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
          <Ionicons name="person-outline" size={40} color="#9ca3af" />
        </View>
        <Text className="text-brand-black text-xl font-semibold mb-2">
          Welcome Guest
        </Text>
        <Text className="text-gray-500 text-center mb-6">
          Login to access your profile and bookings
        </Text>
        <View className="flex-row gap-4">
          <Link href="/auth/login" asChild>
            <TouchableOpacity className="bg-primary px-8 py-3 rounded-xl">
              <Text className="text-white font-semibold">Login</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/auth/register" asChild>
            <TouchableOpacity className="bg-gray-100 px-8 py-3 rounded-xl">
              <Text className="text-brand-black font-semibold">Register</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Profile Header */}
      <View className="bg-brand-black px-6 pt-8 pb-12">
        <View className="items-center">
          <View className="w-20 h-20 bg-primary rounded-full items-center justify-center mb-3">
            <Text className="text-white text-2xl font-bold">
              {getInitials(user.name)}
            </Text>
          </View>
          <Text className="text-white text-xl font-semibold">{user.name}</Text>
          <Text className="text-gray-400">{user.email}</Text>
        </View>
      </View>

      {/* Menu Items */}
      <View className="px-6 -mt-6">
        <View className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <MenuItem
            icon="person-outline"
            title="Edit Profile"
            onPress={() => {}}
          />
          <MenuItem
            icon="notifications-outline"
            title="Notifications"
            onPress={() => {}}
          />
          <MenuItem
            icon="card-outline"
            title="Payment Methods"
            onPress={() => {}}
          />
          <MenuItem
            icon="help-circle-outline"
            title="Help & Support"
            onPress={() => {}}
          />
          <MenuItem
            icon="document-text-outline"
            title="Terms & Conditions"
            onPress={() => {}}
          />
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          className="mt-6 bg-red-50 py-4 rounded-xl items-center"
        >
          <Text className="text-red-600 font-semibold">Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function MenuItem({
  icon,
  title,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center px-5 py-4 border-b border-gray-50"
    >
      <Ionicons name={icon} size={22} color="#6b7280" />
      <Text className="flex-1 ml-4 text-brand-black font-medium">{title}</Text>
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </TouchableOpacity>
  );
}
