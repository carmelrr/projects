import { VideoView, useVideoPlayer } from 'expo-video';
import { Modal, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { Text } from './ui/Text';
import { useTheme, withAlpha } from '@/lib/theme';

interface Props {
  visible: boolean;
  videoUrl?: string | null;
  title?: string;
  onClose: () => void;
}

export function ExerciseVideoModal({ visible, videoUrl, title, onClose }: Props) {
  const theme = useTheme();
  const player = useVideoPlayer(videoUrl ?? null, (p) => {
    p.loop = true;
    if (videoUrl) p.play();
  });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: theme.colors.scrim }}
        edges={['top', 'bottom']}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: theme.spacing[4],
            paddingVertical: theme.spacing[3],
          }}
        >
          <Text
            variant="body"
            weight="700"
            style={{ flex: 1, color: theme.colors.scrimForeground }}
            numberOfLines={1}
          >
            {title ?? 'Demo'}
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={16}
            accessibilityRole="button"
            accessibilityLabel="Close video"
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: withAlpha(theme.colors.scrimForeground, pressed ? 0.2 : 0.12),
            })}
          >
            <X size={18} color={theme.colors.scrimForeground} strokeWidth={2.25} />
          </Pressable>
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {!videoUrl ? (
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                padding: theme.spacing[6],
              }}
            >
              <Text variant="body" style={{ color: withAlpha(theme.colors.scrimForeground, 0.6) }}>
                No demo video for this exercise.
              </Text>
            </View>
          ) : (
            <VideoView
              player={player}
              style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: theme.colors.scrim }}
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
