import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { supabase } from './lib/supabase';

// Phase 2 placeholder — proves the app boots and can reach the same
// Supabase project as the web app. Real screens (Today/Calendar/
// Insights/Tasks) come next, reusing the data model from the web app's
// lib/ once auth + navigation are wired up.
export default function App() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(() => setStatus('connected'))
      .catch(() => setStatus('error'));
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.mark} />
      <Text style={styles.title}>Crossout</Text>
      <Text style={styles.subtitle}>Mobile — coming together</Text>
      <Text style={styles.status}>
        {status === 'checking' && 'Connecting to Supabase…'}
        {status === 'connected' && 'Connected to Supabase ✓'}
        {status === 'error' && 'Could not reach Supabase — check .env'}
      </Text>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f0d',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mark: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#4fbf9f',
    marginBottom: 8,
  },
  title: {
    color: '#e7ede9',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: '#93a39a',
    fontSize: 14,
  },
  status: {
    color: '#5f6f66',
    fontSize: 12,
    marginTop: 16,
  },
});
