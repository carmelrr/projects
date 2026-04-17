import { VideoView, useVideoPlayer } from 'expo-video';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  visible: boolean;
  videoUrl?: string | null;
  title?: string;
  onClose: () => void;
}

export function ExerciseVideoModal({ visible, videoUrl, title, onClose }: Props) {
  const player = useVideoPlayer(videoUrl ?? null, (p) => {
    p.loop = true;
    if (videoUrl) p.play();
  });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {title ?? 'Demo'}
          </Text>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={16}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          {!videoUrl ? (
            <View style={styles.center}>
              <Text style={styles.emptyText}>No demo video for this exercise.</Text>
            </View>
          ) : (
            <VideoView
              player={player}
              style={styles.video}
              contentFit="contain"
              allowsFullscreen
              allowsPictureInPicture
              nativeControls
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '700' },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  closeText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  video: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: '#9ca3af', fontSize: 14 },
});
