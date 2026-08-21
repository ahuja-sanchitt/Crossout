import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    // on success, app/_layout.tsx's session listener handles the redirect
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark} />
          <Text style={styles.brandName}>Crossout</Text>
        </View>

        <Text style={styles.title}>Log in</Text>
        <Text style={styles.subtitle}>Pick up where you left off.</Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor={colors.inkFaint}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          placeholder="••••••••"
          placeholderTextColor={colors.inkFaint}
        />

        <Pressable style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.accentInk} /> : <Text style={styles.buttonText}>Log in</Text>}
        </Pressable>

        <Text style={styles.footerText}>
          No account?{' '}
          <Link href="/(auth)/signup" style={styles.link}>
            Sign up
          </Link>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 360, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 24 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  brandMark: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.6, borderColor: colors.accent },
  brandName: { color: colors.ink, fontWeight: '700', fontSize: 15 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '700', marginBottom: 4 },
  subtitle: { color: colors.inkMuted, fontSize: 13, marginBottom: 20 },
  errorBox: { backgroundColor: 'rgba(214,131,114,0.1)', borderColor: 'rgba(214,131,114,0.3)', borderWidth: 1, borderRadius: 6, padding: 10, marginBottom: 14 },
  errorText: { color: colors.red, fontSize: 13 },
  label: { color: colors.inkMuted, fontSize: 12, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, color: colors.ink, fontSize: 14 },
  button: { backgroundColor: colors.accent, borderRadius: 6, paddingVertical: 12, alignItems: 'center', marginTop: 18 },
  buttonText: { color: colors.accentInk, fontWeight: '700', fontSize: 14 },
  footerText: { color: colors.inkFaint, fontSize: 13, marginTop: 18, textAlign: 'center' },
  link: { color: colors.accent },
});
