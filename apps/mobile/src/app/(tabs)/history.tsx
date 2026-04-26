/**
 * Offer History screen — Req 23.
 * Date range filter using a pure React Native modal (no native modules).
 * Req 23.3: total savings. Req 23.4: filter by date range + status.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  Modal, ScrollView,
} from 'react-native';
import * as SQLite from 'expo-sqlite';

interface HistoryEntry {
  offer_id: string;
  merchant_name: string;
  discount_percentage: number;
  accepted_at: string;
  redeemed_at: string | null;
  status: string;
}

type FilterStatus = 'all' | 'redeemed' | 'accepted' | 'expired';

const STATUS_LABELS: Record<string, string> = {
  redeemed: '✅ Redeemed',
  accepted: '⏳ Pending',
  expired: '⌛ Expired',
};

const FILTERS: FilterStatus[] = ['all', 'redeemed', 'accepted', 'expired'];

// Simple month picker — no native deps
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function MonthYearPicker({
  visible, title, value, onSelect, onClose,
}: {
  visible: boolean;
  title: string;
  value: Date | null;
  onSelect: (d: Date) => void;
  onClose: () => void;
}): JSX.Element {
  const now = new Date();
  const [year, setYear] = useState(value?.getFullYear() ?? now.getFullYear());

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerSheet}>
          <Text style={styles.pickerTitle}>{title}</Text>

          {/* Year selector */}
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

          {/* Month grid */}
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
                  accessibilityRole="button"
                  accessibilityLabel={`${m} ${year}`}
                >
                  <Text style={[styles.monthText, isSelected && styles.monthTextActive, isFuture && styles.monthTextDisabled]}>
                    {m}
                  </Text>
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

export default function HistoryScreen(): JSX.Element {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [totalSavings, setTotalSavings] = useState(0);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const loadHistory = useCallback(async (): Promise<void> => {
    const db = SQLite.openDatabaseSync('gcw.db');
    const rows = await db.getAllAsync<HistoryEntry>(
      'SELECT * FROM offer_history ORDER BY accepted_at DESC',
    );
    setEntries(rows);
    const savings = rows
      .filter(r => r.status === 'redeemed')
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Offer History</Text>
        <Text style={styles.savings}>Total saved: €{totalSavings.toFixed(2)}</Text>
      </View>

      {/* Status filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {FILTERS.map(f => (
          <Pressable
            key={f}
            style={[styles.filterTab, statusFilter === f && styles.filterTabActive]}
            onPress={() => setStatusFilter(f)}
            accessibilityRole="tab"
            accessibilityState={{ selected: statusFilter === f }}
          >
            <Text style={[styles.filterText, statusFilter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Date range row */}
      <View style={styles.dateRow}>
        <Pressable
          style={[styles.dateBtn, startDate && styles.dateBtnActive]}
          onPress={() => setShowStartPicker(true)}
          accessibilityRole="button"
          accessibilityLabel="Select start month"
        >
          <Text style={[styles.dateBtnText, startDate && styles.dateBtnTextActive]}>
            📅 {startDate ? fmt(startDate) : 'From'}
          </Text>
        </Pressable>
        <Text style={styles.dateSep}>→</Text>
        <Pressable
          style={[styles.dateBtn, endDate && styles.dateBtnActive]}
          onPress={() => setShowEndPicker(true)}
          accessibilityRole="button"
          accessibilityLabel="Select end month"
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
        <Text style={styles.filterSummary}>
          {filtered.length} offer{filtered.length !== 1 ? 's' : ''} found
        </Text>
      )}

      <FlatList
        data={filtered}
        keyExtractor={item => item.offer_id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.merchantName}>{item.merchant_name}</Text>
              <Text style={styles.discount}>{item.discount_percentage}% OFF</Text>
            </View>
            <View style={styles.cardBottom}>
              <Text style={styles.statusText}>{STATUS_LABELS[item.status] ?? item.status}</Text>
              <Text style={styles.dateText}>
                {new Date(item.accepted_at).toLocaleDateString('de-DE', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </Text>
            </View>
            {item.redeemed_at && (
              <Text style={styles.redeemedAt}>
                Redeemed: {new Date(item.redeemed_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>
        )}
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
      />

      <MonthYearPicker
        visible={showStartPicker}
        title="Select Start Month"
        value={startDate}
        onSelect={setStartDate}
        onClose={() => setShowStartPicker(false)}
      />
      <MonthYearPicker
        visible={showEndPicker}
        title="Select End Month"
        value={endDate}
        onSelect={setEndDate}
        onClose={() => setShowEndPicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { padding: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#1A1A2E' },
  savings: { fontSize: 14, color: '#2D6A4F', fontWeight: '600', marginTop: 4 },
  filterScroll: { maxHeight: 44 },
  filterRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#E9ECEF' },
  filterTabActive: { backgroundColor: '#2D6A4F' },
  filterText: { fontSize: 13, color: '#6C757D', fontWeight: '600' },
  filterTextActive: { color: '#FFFFFF' },
  dateRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8, marginBottom: 4 },
  dateBtn: { flex: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DEE2E6' },
  dateBtnActive: { borderColor: '#2D6A4F', backgroundColor: '#F0FFF4' },
  dateBtnText: { fontSize: 13, color: '#6C757D', textAlign: 'center' },
  dateBtnTextActive: { color: '#2D6A4F', fontWeight: '600' },
  dateSep: { color: '#ADB5BD', fontSize: 14 },
  clearBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: '#FFF0F0' },
  clearBtnText: { fontSize: 13, color: '#E63946', fontWeight: '700' },
  filterSummary: { fontSize: 12, color: '#6C757D', paddingHorizontal: 16, marginBottom: 4 },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  merchantName: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', flex: 1 },
  discount: { fontSize: 16, fontWeight: '800', color: '#E63946' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  statusText: { fontSize: 13, color: '#495057' },
  dateText: { fontSize: 13, color: '#6C757D' },
  redeemedAt: { fontSize: 12, color: '#2D6A4F' },
  emptyContainer: { flex: 1, alignItems: 'center', paddingTop: 64, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  empty: { textAlign: 'center', color: '#6C757D', fontSize: 15 },
  // Month picker modal
  pickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  pickerSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 },
  pickerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', textAlign: 'center' },
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  yearBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E9ECEF', alignItems: 'center', justifyContent: 'center' },
  yearBtnText: { fontSize: 22, color: '#1A1A2E', fontWeight: '700' },
  yearText: { fontSize: 20, fontWeight: '800', color: '#1A1A2E', minWidth: 60, textAlign: 'center' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  monthBtn: { width: 72, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F8F9FA', alignItems: 'center' },
  monthBtnActive: { backgroundColor: '#2D6A4F' },
  monthBtnDisabled: { opacity: 0.3 },
  monthText: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  monthTextActive: { color: '#FFFFFF' },
  monthTextDisabled: { color: '#ADB5BD' },
  pickerClose: { backgroundColor: '#E9ECEF', borderRadius: 12, padding: 14, alignItems: 'center' },
  pickerCloseText: { fontSize: 15, fontWeight: '600', color: '#495057' },
});
