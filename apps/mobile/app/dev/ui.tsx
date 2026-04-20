/**
 * Dev-only UI gallery. Mount path: `/_dev/ui`. Gated in _layout by __DEV__.
 * Use it to eyeball every primitive against the live theme in light + dark.
 */
import { View, ScrollView } from 'react-native';
import { Bell, Check, Play } from 'lucide-react-native';
import {
  Screen,
  Text,
  Card,
  Badge,
  Button,
  ProgressBar,
  Icon,
  Avatar,
  Input,
  OwlLogo,
  FadeInUp,
  Skeleton,
} from '@/components/ui';
import { useTheme } from '@/lib/theme';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing[2], marginBottom: theme.spacing[6] }}>
      <Text variant="h3">{title}</Text>
      <View style={{ gap: theme.spacing[2] }}>{children}</View>
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2] }}>
      {children}
    </View>
  );
}

export default function UIGallery() {
  const theme = useTheme();

  return (
    <Screen padded>
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[12] }}>
        <Section title="OwlLogo">
          <Row>
            <OwlLogo size={48} />
            <OwlLogo size={56} framed />
            <OwlLogo size={72} framed />
          </Row>
        </Section>

        <Section title="Text variants">
          <Text variant="h1">Heading 1</Text>
          <Text variant="h2">Heading 2</Text>
          <Text variant="h3">Heading 3</Text>
          <Text variant="bodyMedium">Body medium</Text>
          <Text variant="body">Body</Text>
          <Text variant="caption" color="mutedForeground">
            Caption
          </Text>
        </Section>

        <Section title="Buttons — variants">
          <Row>
            <Button>Default</Button>
            <Button variant="gradient">Gradient</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
          </Row>
        </Section>

        <Section title="Buttons — sizes">
          <Row>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="xl">Extra</Button>
            <Button size="icon" iconLeft={<Icon icon={Play} size={16} color="primaryForeground" />} />
          </Row>
          <Row>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
            <Button iconLeft={<Icon icon={Check} size={16} color="primaryForeground" />}>
              With icon
            </Button>
          </Row>
        </Section>

        <Section title="Badges">
          <Row>
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </Row>
        </Section>

        <Section title="Avatars">
          <Row>
            <Avatar size="sm" initials="AL" />
            <Avatar size="md" initials="BO" />
            <Avatar size="lg" initials="CA" />
            <Avatar size="lg" initials="DA" tone="muted" />
          </Row>
        </Section>

        <Section title="Cards">
          <Card>
            <Text variant="bodyMedium">Default card</Text>
            <Text variant="caption" color="mutedForeground">
              Neutral surface
            </Text>
          </Card>
          <Card tone="brand">
            <Text variant="bodyMedium">Brand-tinted card</Text>
          </Card>
          <Card tone="success">
            <Text variant="bodyMedium">Success-tinted card</Text>
          </Card>
        </Section>

        <Section title="Inputs">
          <Input label="Email" placeholder="you@example.com" keyboardType="email-address" />
          <Input label="Password" placeholder="••••••••" secureTextEntry />
          <Input label="Notes" multiline numberOfLines={3} placeholder="Multi-line" />
          <Input label="With error" error="Required field" placeholder="Invalid" />
        </Section>

        <Section title="ProgressBar">
          <ProgressBar value={0.25} />
          <ProgressBar value={0.6} tone="success" />
          <ProgressBar value={0.85} tone="warning" />
        </Section>

        <Section title="Icons">
          <Row>
            <Icon icon={Bell} size={20} color="primary" />
            <Icon icon={Check} size={20} color="success" />
            <Icon icon={Play} size={20} color="mutedForeground" />
          </Row>
        </Section>

        <Section title="Skeleton">
          <Skeleton height={20} />
          <Skeleton height={20} width="80%" />
          <Skeleton height={80} radius={theme.radii.md} />
        </Section>

        <Section title="FadeInUp">
          <FadeInUp>
            <Card>
              <Text variant="body">Fades + slides up on mount.</Text>
            </Card>
          </FadeInUp>
          <FadeInUp delay={200}>
            <Card>
              <Text variant="body">Staggered (200ms).</Text>
            </Card>
          </FadeInUp>
        </Section>
      </ScrollView>
    </Screen>
  );
}
