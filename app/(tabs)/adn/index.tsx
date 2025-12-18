import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Grid, Lock, Plus, Play, Eye, EyeOff, Edit2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../_layout';
import { useHank } from '../../../context/HankContext';
import TrensID from '../../../components/adn/TrensID';
import RecordCard from '../../../components/adn/RecordCard';
import AddRecordModal from '../../../components/adn/AddRecordModal';

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  height: string;
  weight: string;
  goal: string;
  injuries: string;
  allergies: string;
}

interface Measurement {
  id: string;
  name: string;
  value: string;
  is_dominant: boolean;
}

interface PersonalRecord {
  id: string;
  exercise_id: string;
  exercise_name: string;
  exercise_icon: string;
  weight: number;
  reps: number;
  video_id?: string;
}

interface Video {
  id: string;
  title: string;
  thumbnail_url: string;
  is_public: boolean;
  views?: number;
  created_at: string;
}

export default function AdnScreen() {
  const { user } = useAuth();
  const { refreshTrigger } = useHank();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'legacy' | 'vault'>('legacy');
  const [showAddModal, setShowAddModal] = useState(false);

  // Data states
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [followersCount, setFollowersCount] = useState(0);

  const isOwner = true; // TODO: Implementar lógica de visitante vs dueño

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      }

      // Si no existe perfil, crear uno
      if (!profileData) {
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            display_name: user.email?.split('@')[0]?.toUpperCase() || 'ATLETA',
          })
          .select()
          .single();

        if (!createError) {
          setProfile(newProfile);
        }
      } else {
        setProfile(profileData);
      }

      // Fetch measurements
      const { data: measurementsData } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      setMeasurements(measurementsData || []);

      // Fetch records
      const { data: recordsData } = await supabase
        .from('personal_records')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      setRecords(recordsData || []);

      // Fetch followers count
      const { count } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id);

      setFollowersCount(count || 0);

      // Fetch videos from user_assets
      const { data: videosData } = await supabase
        .from('user_assets')
        .select('*')
        .eq('user_id', user.id)
        .eq('deleted_at', null)
        .order('created_at', { ascending: false });

      // Map user_assets to videos format
      const mappedVideos: Video[] = (videosData || []).map((asset: any) => ({
        id: asset.id,
        title: asset.name || 'Sin título',
        thumbnail_url: asset.thumbnail_url || asset.uri,
        is_public: asset.is_public || false,
        created_at: asset.created_at,
      }));

      setVideos(mappedVideos);
    } catch (err) {
      console.error('Error fetching ADN data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refrescar cuando HANK modifica datos
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('🔄 ADN: refreshTrigger cambió, recargando datos...');
      fetchData();
    }
  }, [refreshTrigger, fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleAddRecord = async (recordData: {
    exercise_id: string;
    exercise_name: string;
    exercise_icon: string;
    weight: number;
    reps: number;
    video_id?: string;
  }) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('personal_records')
        .insert({
          user_id: user.id,
          ...recordData,
        })
        .select()
        .single();

      if (error) {
        if (error.message.includes('Maximum of 3')) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          console.log('Máximo 3 récords permitidos');
        }
        throw error;
      }

      setRecords((prev) => [...prev, data]);
      setShowAddModal(false);
    } catch (err) {
      console.error('Error adding record:', err);
    }
  };

  const formatFollowers = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const displayVideos = activeTab === 'legacy' ? videos.filter((v) => v.is_public) : videos;

  const getGridClass = () => {
    if (records.length === 1) return 'flex-row';
    if (records.length === 2) return 'flex-row';
    return 'flex-row';
  };

  if (loading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#DC2626" />
        }
      >
        {/* HEADER (PÚBLICO) */}
        <View className="relative pt-16 pb-20 px-6 items-center">
          {/* Degradado radial de fondo */}
          <LinearGradient
            colors={['#1a1a1a', '#000000']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            className="absolute inset-0 opacity-30"
          />

          {/* Avatar */}
          <View className="w-24 h-24 rounded-full bg-zinc-900 mb-4 overflow-hidden">
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-full bg-savage-red items-center justify-center">
                <Text className="text-white text-4xl font-black">
                  {profile?.display_name?.charAt(0) || 'A'}
                </Text>
              </View>
            )}
          </View>

          {/* Nombre */}
          <Text className="text-3xl font-black text-white uppercase tracking-tight mb-1">
            {profile?.display_name || 'ATLETA'}
          </Text>

          {/* Seguidores */}
          <Text className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
            SEGUIDORES: <Text className="text-zinc-300">{formatFollowers(followersCount)}</Text>
          </Text>
        </View>

        {/* TRENS ID (Solo visible para el dueño) */}
        <View className="px-4 -mt-10">
          {isOwner && profile && (
            <TrensID
              userId={user!.id}
              profileData={{
                goal: profile.goal,
                weight: profile.weight,
                height: profile.height,
                injuries: profile.injuries,
                allergies: profile.allergies,
              }}
              measurements={measurements}
              onUpdate={fetchData}
            />
          )}
        </View>

        {/* RECORDS (PÚBLICO) */}
        <View className={`px-4 ${!isOwner ? 'mt-8' : ''}`}>
          <View className="flex-row justify-between items-center mb-3 border-b border-zinc-900 pb-2">
            <View className="flex-row items-center gap-2">
              <View className="w-1.5 h-1.5 bg-savage-red rounded-sm" />
              <Text className="text-white font-bold uppercase tracking-widest text-xs">
                Records Verificados
              </Text>
            </View>
          </View>

          <View className="flex-row gap-2">
            {records.map((rec) => (
              <View key={rec.id} className="flex-1">
                <RecordCard record={rec} />
              </View>
            ))}

            {/* Botón añadir (solo dueño y si hay espacio) */}
            {isOwner && records.length < 3 && (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setShowAddModal(true);
                }}
                className="flex-1 min-h-[160px] border border-dashed border-zinc-800 rounded items-center justify-center"
              >
                <View className="w-10 h-10 rounded-full bg-[#111] items-center justify-center mb-2">
                  <Plus size={18} color="#71717a" />
                </View>
                <Text className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                  Añadir
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* TABS */}
        <View className="mt-12 border-t border-zinc-900">
          <View className="flex-row">
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab('legacy');
              }}
              className={`flex-1 py-4 flex-row items-center justify-center gap-2 ${
                activeTab === 'legacy' ? 'border-t-2 border-white bg-zinc-900/20' : ''
              }`}
            >
              <Grid size={14} color={activeTab === 'legacy' ? '#fff' : '#52525b'} />
              <Text
                className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                  activeTab === 'legacy' ? 'text-white' : 'text-zinc-600'
                }`}
              >
                Legado
              </Text>
            </TouchableOpacity>

            {isOwner && (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab('vault');
                }}
                className={`flex-1 py-4 flex-row items-center justify-center gap-2 ${
                  activeTab === 'vault' ? 'border-t-2 border-savage-red bg-red-900/10' : ''
                }`}
              >
                <Lock size={14} color={activeTab === 'vault' ? '#fff' : '#52525b'} />
                <Text
                  className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                    activeTab === 'vault' ? 'text-white' : 'text-zinc-600'
                  }`}
                >
                  Bóveda
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* CONTENIDO TABS */}
          <View className="bg-[#050505] min-h-[300px]">
            {activeTab === 'legacy' && (
              <View className="flex-row flex-wrap">
                {displayVideos.length === 0 ? (
                  <View className="flex-1 items-center justify-center py-20">
                    <Grid size={40} color="#27272a" />
                    <Text className="text-zinc-600 text-xs uppercase tracking-widest mt-4">
                      Sin contenido público
                    </Text>
                  </View>
                ) : (
                  displayVideos.map((vid) => (
                    <TouchableOpacity
                      key={vid.id}
                      className="w-1/3 aspect-[9/16] bg-zinc-900 relative"
                      onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                    >
                      <Image
                        source={{ uri: vid.thumbnail_url }}
                        className="w-full h-full opacity-80"
                        resizeMode="cover"
                      />
                      <View className="absolute bottom-1 left-1 flex-row items-center gap-1">
                        <Play size={8} color="#fff" fill="#fff" />
                        <Text className="text-[9px] font-bold text-white">{vid.views || 0}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {activeTab === 'vault' && isOwner && (
              <View className="p-2">
                {/* Info box */}
                <View className="p-3 bg-zinc-900/30 border border-zinc-800 rounded flex-row gap-3 mb-4">
                  <Lock size={16} color="#52525b" />
                  <View className="flex-1">
                    <Text className="text-white text-xs font-bold mb-1">ARCHIVO MAESTRO</Text>
                    <Text className="text-zinc-400 text-[10px] leading-relaxed">
                      Gestiona la visibilidad de tu contenido.
                    </Text>
                  </View>
                </View>

                {videos.length === 0 ? (
                  <View className="items-center justify-center py-16">
                    <Lock size={40} color="#27272a" />
                    <Text className="text-zinc-600 text-xs uppercase tracking-widest mt-4">
                      Bóveda vacía
                    </Text>
                  </View>
                ) : (
                  videos.map((vid) => (
                    <View
                      key={vid.id}
                      className="flex-row gap-3 p-2 bg-[#0a0a0a] border border-zinc-900 rounded mb-2"
                    >
                      <View className="w-16 h-16 bg-zinc-800 rounded overflow-hidden">
                        <Image
                          source={{ uri: vid.thumbnail_url }}
                          className="w-full h-full opacity-60"
                          resizeMode="cover"
                        />
                      </View>
                      <View className="flex-1 justify-center">
                        <Text className="text-xs font-bold text-white mb-1">{vid.title}</Text>
                        <View className="flex-row items-center gap-2">
                          {vid.is_public ? (
                            <View className="flex-row items-center gap-1 border border-green-900 bg-green-900/10 px-1 rounded">
                              <Eye size={8} color="#22c55e" />
                              <Text className="text-[9px] text-green-500 font-bold uppercase">
                                Público
                              </Text>
                            </View>
                          ) : (
                            <View className="flex-row items-center gap-1 border border-zinc-800 px-1 rounded">
                              <EyeOff size={8} color="#71717a" />
                              <Text className="text-[9px] text-zinc-500 font-bold uppercase">
                                Privado
                              </Text>
                            </View>
                          )}
                          <Text className="text-[9px] text-zinc-600">
                            {new Date(vid.created_at).toLocaleDateString('es', {
                              day: '2-digit',
                              month: 'short',
                            })}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity className="px-2 justify-center">
                        <Edit2 size={14} color="#52525b" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        </View>

        {/* Espaciado inferior */}
        <View className="h-20" />
      </ScrollView>

      {/* Modal Añadir Récord */}
      <AddRecordModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddRecord}
      />
    </View>
  );
}
