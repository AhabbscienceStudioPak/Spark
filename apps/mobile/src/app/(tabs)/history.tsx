import React, { useEffect, useState, useCallback } from 'react';
import type { ReactElement } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  Modal, ScrollView, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SQLite from 'expo-sqlite';
import { colors, radius, shadow, spacing } from '../../theme/tokens';

interface HistoryEntry {
  offer_id: string;
  merchant_name: string;
  discount_percentage: number;
  accepted_at: string;
  redeemed_at: string | null;
  status: string;
}

type FilterStatus = 'all' | 'redeemed' | 'accepted' | 'expired';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  redeemed: { label: '✅ Redeemed', color: colors.primary, bg: colors.primarySoft },
  accepted: { label: '⏳ Pending', color: '#B45309', bg: '#FEF3C7' },
  expired: { label: '⌛ Expired', color: colors.textMuted, bg: colors.surfaceMuted },
};

const FILTERS: FilterStatus[] = ['all', 'redeemed', 'accepted', 'expired'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function MonthYearPicker({ visible, title, value, onSelect, onClose }: {
  visible: boolean; title: string; value: Date | null;
  onSelect: (d: Date) => void; onClose: () => void;
}): ReactElement {
  const now = new Date();
  const [year, setYear] = useState(value?.getFullYear() ?? now.getFullYear());
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerSheet}>
          <Text style={styles.pickerTitle}>{title}</Text>
          <View style={styles.yearRow}>
            <Pressable onPress={() => setYear(y => y - 1)} style={styles.yearBtn}>
              <Text style={styles.yearBtnText}>‹</Text>
            </Pressable>
            <Text style={styles.yearText}>{year}</Text>
            <Pressable
              onPress={() => setYear(y => Math.min(y + 1, now.getFullYear()))}
              style={styles.yearBtn}
            >
              <Text style={styles.yearBtnText}>›</Text>
            </Pressable>
          </View>
          <View style={styles.monthGrid}>
            {MONTHS.map((m, i) => {
              const isSelected = value?.getMonth() === i && value?.getFullYear() === year;
              const isFuture = new Date(year, i, 1) > now;
              return (
                <Pressable
                  key={m}
                  style={[styles.monthBtn, isSelected && styles.monthBtnActive, isFuture && styles.monthBtnDisabled]}
                  onPress={() => { if (!isFuture) { onSelect(new Date(year, i, 1)); onClose(); } }}
                  disabled={isFuture}
                >
                  <Text style={[styles.monthText, isSelected && styles.monthTextActive, isFuture && { opacity: 0.3 }]}>{m}</Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable style={styles.pickerClose} onPress={onClose}>
            <Text style={styles.pickerCloseText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function HistoryScreen(): ReactElement {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [totalSavings, setTotalSavings] = useState(0);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const loadHistory = useCallback(async (): Promise<void> => {
    const db = SQLite.openDatabaseSync('gcw.db');
    const rows = await db.getAllAsync<HistoryEntry>('SELECT * FROM offer_history ORDER BY accepted_at DESC');
    setEntries(rows);
    const savings = rows.filter(r => r.status === 'redeemed')
      .reduce((sum, r) => sum + 15 * (r.discount_percentage / 100), 0);
    setTotalSavings(Math.round(savings * 100) / 100);
  }, []);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  const filtered = entries.filter(e => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    const d = new Date(e.accepted_at);
    if (startDate && d < startDate) return false;
    if (endDate) {
      const end = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0, 23, 59, 59);
      if (d > end) return false;
    }
    return true;
  });

  const hasFilter = startDate !== null || endDate !== null;
  const fmt = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>📋 History</Text>
          <Text style={styles.savings}>€{totalSavings.toFixed(2)} total saved</Text>
        </View>
      </View>

      {/* Status filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map(f => (
          <Pressable
            key={f}
            style={[styles.filterTab, statusFilter === f && styles.filterTabActive]}
            onPress={() => setStatusFilter(f)}
          >
            <Text style={[styles.filterText, statusFilter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Date range */}
      <View style={styles.dateRow}>
        <Pressable
          style={[styles.dateBtn, startDate && styles.dateBtnActive]}
          onPress={() => setShowStartPicker(true)}
        >
          <Text style={[styles.dateBtnText, startDate && styles.dateBtnTextActive]}>
            📅 {startDate ? fmt(startDate) : 'From'}
          </Text>
        </Pressable>
        <Text style={styles.dateSep}>→</Text>
        <Pressable
          style={[styles.dateBtn, endDate && styles.dateBtnActive]}
          onPress={() => setShowEndPicker(true)}
        >
          <Text style={[styles.dateBtnText, endDate && styles.dateBtnTextActive]}>
            📅 {endDate ? fmt(endDate) : 'To'}
          </Text>
        </Pressable>
        {hasFilter && (
          <Pressable style={styles.clearBtn} onPress={() => { setStartDate(null); setEndDate(null); }}>
            <Text style={styles.clearBtnText}>✕</Text>
          </Pressable>
        )}
      </View>

      {hasFilter && (
        <Text style={styles.filterSummary}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</Text>
      )}

      <FlatList
        data={filtered}
        keyExtractor={item => item.offer_id}
        renderItem={({ item }) => {
          const cfg = STATUS_CONFIG[item.status] ?? { label: item.status, color: colors.textMuted, bg: colors.surfaceMuted };
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardLeft}>
                  <Text style={styles.merchantName} numberOfLines={1}>{item.merchant_name}</Text>
                  <Text style={styles.dateText}>
                    {new Date(item.accepted_at).toLocaleDateString('de-DE', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.discount}>{item.discount_percentage}% OFF</Text>
                  <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>
              </View>
              {item.redeemed_at && (
                <Text style={styles.redeemedAt}>
                  Redeemed at {new Date(item.redeemed_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.empty}>
              {hasFilter || statusFilter !== 'all' ? 'No offers match your filters.' : 'No offer history yet.'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.list}
        refreshing={false}
        onRefresh={loadHistory}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />

      <MonthYearPicker visible={showStartPicker} title="Start Month" value={startDate} onSelect={setStartDate} onClose={() => setShowStartPicker(false)} />
      <MonthYearPicker visible={showEndPicker} title="End Month" value={endDate} onSelect={setEndDate} onClose={() => setShowEndPicker(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: colors.text },
  savings: { fontSize: 13, color: colors.primary, fontWeight: '700', marginTop: 2 },
  filterScroll: { maxHeight: 48 },
  filterRow: { paddingHorizontal: spacing.md, gap: 8, paddingVertical: 8 },
  filterTab: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: radius.pill, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  filterTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 13, color: colors.textMuted, fontWeight: '700' },
  filterTextActive: { color: '#FFFFFF' },
  dateRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, gap: 6, marginBottom: 4,
  },
  dateBtn: {
    flex: 1, paddingHorizontal: 8, paddingVertical: 9,
    borderRadius: radius.sm, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, minWidth: 0,
  },
  dateBtnActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  dateBtnText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  dateBtnTextActive: { color: colors.primary, fontWeight: '700' },
  dateSep: { color: colors.textMuted, fontSize: 14 },
  clearBtn: {
    paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: radius.sm, backgroundColor: colors.dangerSoft,
  },
  clearBtnText: { fontSize: 13, color: colors.danger, fontWeight: '800' },
  filterSummary: { fontSize: 12, color: colors.textMuted, paddingHorizontal: spacing.md, marginBottom: 4 },
  list: { paddingHorizontal: spacing.md, flexGrow: 1, paddingBottom: 16 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flex: 1, gap: 3, paddingRight: 8 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  merchantName: { fontSize: 15, fontWeight: '700', color: colors.text },
  dateText: { fontSize: 12, color: colors.textMuted },
  discount: { fontSize: 16, fontWeight: '900', color: colors.text },
  statusBadge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  redeemedAt: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  emptyContainer: { flex: 1, alignItems: 'center', paddingTop: 64, gap: 8 },
  emptyEmoji: { fontSize: 44 },
  empty: { textAlign: 'center', color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  pickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  pickerSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 16,
  },
  pickerTitle: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  yearBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center',
  },
  yearBtnText: { fontSize: 22, color: colors.text, fontWeight: '700' },
  yearText: { fontSize: 20, fontWeight: '800', color: colors.text, minWidth: 60, textAlign: 'center' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  monthBtn: {
    width: 68, paddingVertical: 10,
    borderRadius: radius.sm, backgroundColor: colors.bg, alignItems: 'center',
  },
  monthBtnActive: { backgroundColor: colors.primary },
  monthBtnDisabled: {},
  monthText: { fontSize: 14, fontWeight: '600', color: colors.text },
  monthTextActive: { color: '#FFFFFF' },
  pickerClose: {
    backgroundColor: colors.surfaceMuted, borderRadius: 12, padding: 14, alignItems: 'center',
  },
  pickerCloseText: { fontSize: 15, fontWeight: '700', color: colors.text },
});
