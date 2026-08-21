import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    setError(null);
    setMessage(null);
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMessage('Account created — check your email if confirmation is required, then log in.');
    setTimeout(() => router.replace('/(auth)/login'), 1500);
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark} />
          <Text style={styles.brandName}>Crossout</Text>
        </View>

        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>One account — this is a personal tracker.</Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        {message && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{message}</Text>
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
          autoComplete="password-new"
          placeholder="At least 8 characters"
          placeholderTextColor={colors.inkFaint}
        />

        <Pressable style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleSignup} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.accentInk} /> : <Text style={styles.buttonText}>Sign up</Text>}
        </Pressable>

        <Text style={styles.footerText}>
          Already have an account?{' '}
          <Link href="/(auth)/login" style={styles.link}>
            Log in
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
  successBox: { backgroundColor: 'rgba(79,191,159,0.1)', borderColor: 'rgba(79,191,159,0.3)', borderWidth: 1, borderRadius: 6, padding: 10, marginBottom: 14 },
  successText: { color: colors.accent, fontSize: 13 },
  label: { color: colors.inkMuted, fontSize: 12, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, color: colors.ink, fontSize: 14 },
  button: { backgroundColor: colors.accent, borderRadius: 6, paddingVertical: 12, alignItems: 'center', marginTop: 18 },
  buttonText: { color: colors.accentInk, fontWeight: '700', fontSize: 14 },
  footerText: { color: colors.inkFaint, fontSize: 13, marginTop: 18, textAlign: 'center' },
  link: { color: colors.accent },
});
