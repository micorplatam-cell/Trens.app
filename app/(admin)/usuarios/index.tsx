import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { Search, User, Mail, Calendar, Crown, ChevronRight } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';

// ============================================================================
// TYPES
// ============================================================================
interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  role?: 'free' | 'pro';
  training_frequency?: number;
}

// ============================================================================
// COLORS
// ============================================================================
const COLORS = {
  blue: '#3B82F6',
  green: '#22C55E',
  purple: '#8B5CF6',
  orange: '#F97316',
  white: '#FFFFFF',
  zinc400: '#A1A1AA',
  zinc800: '#27272a',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function AdminUsuariosScreen() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pro: 0,
    free: 0,
    thisMonth: 0,
  });

  // -------------------------------------------------------------------------
  // FETCH USERS
  // -------------------------------------------------------------------------
  const fetchUsers = useCallback(async () => {
    try {
      // Fetch profiles
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, created_at, training_frequency')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch roles
      const { data: roles } = await supabase.from('user_roles').select('user_id, role');

      const rolesMap = new Map(roles?.map((r) => [r.user_id, r.role]) || []);

      const usersWithRoles = (profiles || []).map((p) => ({
        ...p,
        role: rolesMap.get(p.id) || 'free',
      }));

      setUsers(usersWithRoles);
      setFilteredUsers(usersWithRoles);

      // Calculate stats
      const now = new Date();
      const thisMonth = usersWithRoles.filter((u) => {
        const created = new Date(u.created_at);
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      });

      setStats({
        total: usersWithRoles.length,
        pro: usersWithRoles.filter((u) => u.role === 'pro').length,
        free: usersWithRoles.filter((u) => u.role === 'free').length,
        thisMonth: thisMonth.length,
      });
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // -------------------------------------------------------------------------
  // SEARCH FILTER
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(
          (u) =>
            u.email?.toLowerCase().includes(query) || u.full_name?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, users]);

  // -------------------------------------------------------------------------
  // FORMAT DATE
  // -------------------------------------------------------------------------
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------
  return (
    <View className="flex-1 bg-black">
      {/* Stats Header */}
      <View className="px-4 py-3 bg-zinc-900 border-b border-zinc-800">
        <View className="flex-row justify-between mb-3">
          <View className="flex-1 items-center">
            <Text className="text-2xl font-bold text-white">{stats.total}</Text>
            <Text className="text-zinc-400 text-xs font-mono">TOTAL</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-2xl font-bold text-purple-400">{stats.pro}</Text>
            <Text className="text-zinc-400 text-xs font-mono">PRO</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-2xl font-bold text-zinc-400">{stats.free}</Text>
            <Text className="text-zinc-400 text-xs font-mono">FREE</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-2xl font-bold text-green-400">{stats.thisMonth}</Text>
            <Text className="text-zinc-400 text-xs font-mono">ESTE MES</Text>
          </View>
        </View>

        <View className="flex-row items-center bg-zinc-800 rounded-lg px-3 py-2">
          <Search size={18} color={COLORS.zinc400} />
          <TextInput
            className="flex-1 text-white ml-2 font-mono"
            placeholder="Buscar usuario..."
            placeholderTextColor={COLORS.zinc400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* User List */}
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchUsers();
            }}
            tintColor={COLORS.blue}
          />
        }
      >
        {filteredUsers.map((user) => (
          <TouchableOpacity
            key={user.id}
            className="flex-row items-center bg-zinc-900 mx-4 my-1 p-3 rounded-lg border border-zinc-800"
          >
            {/* Avatar */}
            <View className="w-12 h-12 bg-zinc-800 rounded-full overflow-hidden items-center justify-center">
              {user.avatar_url ? (
                <Image
                  source={{ uri: user.avatar_url }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <User size={24} color={COLORS.zinc400} />
              )}
            </View>

            {/* Info */}
            <View className="flex-1 ml-3">
              <View className="flex-row items-center gap-2">
                <Text className="text-white font-bold" numberOfLines={1}>
                  {user.full_name || 'Sin nombre'}
                </Text>
                {user.role === 'pro' && <Crown size={14} color={COLORS.purple} />}
              </View>
              <View className="flex-row items-center mt-1">
                <Mail size={12} color={COLORS.zinc400} />
                <Text className="text-zinc-400 text-xs font-mono ml-1" numberOfLines={1}>
                  {user.email}
                </Text>
              </View>
              <View className="flex-row items-center mt-1">
                <Calendar size={12} color={COLORS.zinc400} />
                <Text className="text-zinc-500 text-xs font-mono ml-1">
                  {formatDate(user.created_at)}
                </Text>
              </View>
            </View>

            {/* Role Badge */}
            <View
              className={`px-2 py-1 rounded ${
                user.role === 'pro' ? 'bg-purple-600/30' : 'bg-zinc-800'
              }`}
            >
              <Text
                className={`text-xs font-mono ${
                  user.role === 'pro' ? 'text-purple-400' : 'text-zinc-400'
                }`}
              >
                {user.role?.toUpperCase()}
              </Text>
            </View>

            <ChevronRight size={18} color={COLORS.zinc400} className="ml-2" />
          </TouchableOpacity>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}
