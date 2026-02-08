import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  ACCOUNTS,
  CARD_DETAILS,
  INITIAL_ACTIVITY,
  INSIGHTS,
  PAYEES,
  QUICK_AMOUNTS,
  SPENDING_BY_DAY,
  TRANSACTIONS,
  USER_NAME,
} from './src/data/mockData';
import { colors, radius } from './src/theme';
import { Account, ActivityEvent, TabKey } from './src/types';
import { compactCurrency, currency, percent, signedCurrency, timeStampLabel } from './src/utils/format';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type TabItem = {
  key: TabKey;
  label: string;
  icon: IconName;
  activeIcon: IconName;
};

const TAB_ITEMS: TabItem[] = [
  { key: 'dashboard', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { key: 'accounts', label: 'Accounts', icon: 'wallet-outline', activeIcon: 'wallet' },
  { key: 'card', label: 'Card', icon: 'card-outline', activeIcon: 'card' },
  { key: 'activity', label: 'Activity', icon: 'list-outline', activeIcon: 'list' },
  { key: 'transfer', label: 'Transfer', icon: 'swap-horizontal-outline', activeIcon: 'swap-horizontal' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [accounts, setAccounts] = useState<Account[]>(ACCOUNTS);
  const [isCardFrozen, setIsCardFrozen] = useState(false);
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>(INITIAL_ACTIVITY);
  const [selectedSourceId, setSelectedSourceId] = useState(ACCOUNTS[0].id);
  const [selectedPayeeId, setSelectedPayeeId] = useState(PAYEES[0].id);
  const [transferAmount, setTransferAmount] = useState('120.00');
  const [transferNotice, setTransferNotice] = useState<string | null>(null);

  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslate = useRef(new Animated.Value(10)).current;
  const todayLabel = useMemo(
    () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
    []
  );

  useEffect(() => {
    contentOpacity.setValue(0);
    contentTranslate.setValue(10);

    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.spring(contentTranslate, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 8,
        speed: 16,
      }),
    ]).start();
  }, [activeTab, contentOpacity, contentTranslate]);

  const checkingAccount = accounts.find((account) => account.type === 'Checking') ?? accounts[0];

  const liquidBalance = useMemo(() => {
    return accounts
      .filter((account) => account.type !== 'Credit')
      .reduce((total, account) => total + account.balance, 0);
  }, [accounts]);

  const spendProgress = Math.min(INSIGHTS.monthlySpend / INSIGHTS.monthlyBudget, 1);

  const transferValue = Number.parseFloat(transferAmount);
  const transferIsValid = Number.isFinite(transferValue) && transferValue > 0;
  const transferExceedsBalance = transferIsValid && transferValue > Math.max(0, checkingAccount.balance);

  const currentPayee = PAYEES.find((payee) => payee.id === selectedPayeeId) ?? PAYEES[0];

  const recordEvent = (event: ActivityEvent) => {
    setActivityEvents((existing) => [event, ...existing]);
  };

  const onConfirmCardFreezeToggle = () => {
    setShowFreezeModal(false);

    setIsCardFrozen((current) => {
      const next = !current;
      recordEvent({
        id: `evt-${Date.now()}`,
        title: next ? 'Card frozen' : 'Card unfrozen',
        detail: next
          ? 'All debit card purchases and tap-to-pay are now paused.'
          : 'Debit card purchases and tap-to-pay are now active.',
        timeLabel: timeStampLabel(),
        tone: next ? 'warning' : 'positive',
      });

      return next;
    });
  };

  const onSubmitTransfer = () => {
    if (!transferIsValid || transferExceedsBalance) {
      return;
    }

    setAccounts((existing) =>
      existing.map((account) => {
        if (account.id !== selectedSourceId) {
          return account;
        }

        const nextBalance = account.balance - transferValue;
        return {
          ...account,
          balance: nextBalance,
          subtitle:
            account.type === 'Checking' ? `Available ${currency.format(Math.max(0, nextBalance - 161.14))}` : account.subtitle,
        };
      })
    );

    setTransferNotice(`Transfer scheduled: ${currency.format(transferValue)} to ${currentPayee.name}.`);

    recordEvent({
      id: `evt-${Date.now()}`,
      title: 'Transfer scheduled',
      detail: `${currency.format(transferValue)} to ${currentPayee.name} • ${currentPayee.mask}`,
      timeLabel: timeStampLabel(),
      tone: 'positive',
    });

    setTransferAmount('');
    setActiveTab('activity');
  };

  const renderDashboard = () => {
    const maxSpend = Math.max(...SPENDING_BY_DAY);

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Total available</Text>
          <Text style={styles.heroValue}>{compactCurrency.format(liquidBalance)}</Text>
          <Text style={styles.heroSub}>{`${accounts.length} linked accounts`}</Text>

          <View style={styles.accountChipsRow}>
            {accounts.map((account) => (
              <View key={account.id} style={styles.accountChip}>
                <Text style={styles.accountChipLabel}>{account.type}</Text>
                <Text style={styles.accountChipValue}>{currency.format(account.balance)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.quickActionsRow}>
          <QuickAction
            icon="scan-outline"
            label="Scan to Pay"
            onPress={() => setTransferNotice('Scan to Pay is available in the next demo iteration.')}
          />
          <QuickAction
            icon="paper-plane-outline"
            label="Transfer"
            onPress={() => {
              setTransferNotice(null);
              setActiveTab('transfer');
            }}
          />
          <QuickAction
            icon="card-outline"
            label="Card"
            onPress={() => {
              setTransferNotice(null);
              setActiveTab('card');
            }}
          />
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Weekly Spend</Text>
            <Text style={styles.sectionCaption}>{`${percent(spendProgress * 100)} of monthly budget`}</Text>
          </View>
          <View style={styles.barChartRow}>
            {SPENDING_BY_DAY.map((value, index) => (
              <View key={`${value}-${index}`} style={styles.barWrap}>
                <View style={[styles.bar, { height: 24 + (value / maxSpend) * 78 }]} />
              </View>
            ))}
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${spendProgress * 100}%` }]} />
          </View>
          <Text style={styles.inlineMetric}>{`${currency.format(INSIGHTS.monthlySpend)} of ${currency.format(
            INSIGHTS.monthlyBudget
          )}`}</Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Recent activity</Text>
            <Pressable onPress={() => setActiveTab('activity')}>
              <Text style={styles.linkText}>See all</Text>
            </Pressable>
          </View>
          {TRANSACTIONS.slice(0, 4).map((transaction) => {
            const debit = transaction.amount < 0;
            return (
              <View key={transaction.id} style={styles.transactionRow}>
                <View style={styles.transactionMeta}>
                  <Text style={styles.transactionMerchant}>{transaction.merchant}</Text>
                  <Text style={styles.transactionCategory}>{`${transaction.category} • ${transaction.dateLabel}`}</Text>
                </View>
                <Text style={[styles.transactionAmount, debit ? styles.negativeAmount : styles.positiveAmount]}>
                  {signedCurrency(transaction.amount)}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  const renderAccounts = () => {
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {accounts.map((account) => {
          const isCredit = account.type === 'Credit';
          return (
            <View key={account.id} style={styles.accountCard}>
              <View>
                <Text style={styles.accountName}>{account.name}</Text>
                <Text style={styles.accountSubtitle}>{account.subtitle}</Text>
              </View>
              <Text style={[styles.accountBalance, isCredit ? styles.creditBalance : undefined]}>
                {currency.format(account.balance)}
              </Text>
              <View style={styles.accountFooter}>
                <View style={styles.pillTag}>
                  <Text style={styles.pillTagText}>{account.type}</Text>
                </View>
                <Text style={styles.accountFooterText}>{isCredit ? 'Statement in 13 days' : 'FDIC insured'}</Text>
              </View>
            </View>
          );
        })}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Savings goal</Text>
          <Text style={styles.sectionCaption}>Emergency fund progress</Text>
          <View style={styles.progressTrackTall}>
            <View style={[styles.progressFillTall, { width: `${INSIGHTS.savingsGoal}%` }]} />
          </View>
          <Text style={styles.inlineMetric}>{`${INSIGHTS.savingsGoal}% funded`}</Text>
        </View>
      </ScrollView>
    );
  };

  const renderCard = () => {
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.cardVisual}>
          <View style={styles.cardShine} />
          <Text style={styles.cardNetwork}>{CARD_DETAILS.network}</Text>
          <Text style={styles.cardName}>{CARD_DETAILS.name}</Text>
          <Text style={styles.cardDigits}>•••• •••• •••• {CARD_DETAILS.last4}</Text>

          <View style={styles.cardMetaRow}>
            <View>
              <Text style={styles.cardMetaLabel}>Cardholder</Text>
              <Text style={styles.cardMetaValue}>{CARD_DETAILS.holder}</Text>
            </View>
            <View>
              <Text style={styles.cardMetaLabel}>Expiry</Text>
              <Text style={styles.cardMetaValue}>{CARD_DETAILS.expiry}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Card status</Text>
            <View style={[styles.statusChip, isCardFrozen ? styles.statusChipWarning : styles.statusChipOk]}>
              <Text style={styles.statusChipText}>{isCardFrozen ? 'Frozen' : 'Active'}</Text>
            </View>
          </View>

          {isCardFrozen ? (
            <View style={styles.warningBanner}>
              <Ionicons name="snow-outline" size={16} color={colors.warning} />
              <Text style={styles.warningBannerText}>Card purchases and tap-to-pay are paused.</Text>
            </View>
          ) : null}

          <Pressable style={styles.featureButton} onPress={() => setShowFreezeModal(true)}>
            <Ionicons name={isCardFrozen ? 'lock-open-outline' : 'lock-closed-outline'} size={18} color={colors.text} />
            <Text style={styles.featureButtonLabel}>{isCardFrozen ? 'Unfreeze card' : 'Freeze card'}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>

          <Pressable style={[styles.featureButton, isCardFrozen && styles.featureButtonDisabled]}>
            <Ionicons name="wifi-outline" size={18} color={isCardFrozen ? '#94A5BE' : colors.text} />
            <Text style={[styles.featureButtonLabel, isCardFrozen && styles.featureButtonLabelDisabled]}>Tap to Pay</Text>
            <Text style={styles.featurePill}>{isCardFrozen ? 'Off' : 'On'}</Text>
          </Pressable>

          <Pressable style={styles.featureButton}>
            <Ionicons name="compass-outline" size={18} color={colors.text} />
            <Text style={styles.featureButtonLabel}>Travel notice</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      </ScrollView>
    );
  };

  const renderActivity = () => {
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {activityEvents.map((event) => (
          <View key={event.id} style={styles.activityRow}>
            <View
              style={[
                styles.timelineDot,
                event.tone === 'positive'
                  ? styles.timelineDotPositive
                  : event.tone === 'warning'
                    ? styles.timelineDotWarning
                    : styles.timelineDotNeutral,
              ]}
            />
            <View style={styles.activityCard}>
              <Text style={styles.activityTitle}>{event.title}</Text>
              <Text style={styles.activityDetail}>{event.detail}</Text>
              <Text style={styles.activityTime}>{event.timeLabel}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderTransfer = () => {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fullHeight}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>From</Text>
            <View style={styles.selectorRow}>
              {accounts
                .filter((account) => account.type !== 'Credit')
                .map((account) => {
                  const selected = selectedSourceId === account.id;
                  return (
                    <Pressable
                      key={account.id}
                      onPress={() => setSelectedSourceId(account.id)}
                      style={[styles.selectorChip, selected && styles.selectorChipSelected]}
                    >
                      <Text style={[styles.selectorChipTitle, selected && styles.selectorChipTitleSelected]}>{account.name}</Text>
                      <Text style={[styles.selectorChipAmount, selected && styles.selectorChipAmountSelected]}>
                        {currency.format(account.balance)}
                      </Text>
                    </Pressable>
                  );
                })}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>To</Text>
            <View style={styles.selectorRow}>
              {PAYEES.map((payee) => {
                const selected = selectedPayeeId === payee.id;
                return (
                  <Pressable
                    key={payee.id}
                    onPress={() => setSelectedPayeeId(payee.id)}
                    style={[styles.selectorChip, selected && styles.selectorChipSelected]}
                  >
                    <Text style={[styles.selectorChipTitle, selected && styles.selectorChipTitleSelected]}>{payee.name}</Text>
                    <Text style={[styles.selectorChipAmount, selected && styles.selectorChipAmountSelected]}>{payee.mask}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Amount</Text>
            <TextInput
              value={transferAmount}
              onChangeText={setTransferAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#8EA0B8"
              style={styles.amountInput}
            />
            <View style={styles.quickAmountRow}>
              {QUICK_AMOUNTS.map((amount) => (
                <Pressable key={amount} onPress={() => setTransferAmount(amount.toFixed(2))} style={styles.quickAmountChip}>
                  <Text style={styles.quickAmountText}>{currency.format(amount)}</Text>
                </Pressable>
              ))}
            </View>
            {transferExceedsBalance ? <Text style={styles.inputWarning}>Amount exceeds available balance.</Text> : null}
          </View>

          {transferNotice ? (
            <View style={styles.noticeCard}>
              <Ionicons name="checkmark-circle" size={18} color={colors.positive} />
              <Text style={styles.noticeText}>{transferNotice}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={onSubmitTransfer}
            style={[styles.primaryButton, (!transferIsValid || transferExceedsBalance) && styles.primaryButtonDisabled]}
            disabled={!transferIsValid || transferExceedsBalance}
          >
            <Text style={styles.primaryButtonText}>Schedule transfer</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  const renderCurrentTab = () => {
    switch (activeTab) {
      case 'accounts':
        return renderAccounts();
      case 'card':
        return renderCard();
      case 'activity':
        return renderActivity();
      case 'transfer':
        return renderTransfer();
      case 'dashboard':
      default:
        return renderDashboard();
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.bgOrbTop} />
      <View style={styles.bgOrbBottom} />

      <View style={styles.safeFrame}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.appLabel}>Summit Bank</Text>
            <Text style={styles.headerTitle}>{`Good afternoon, ${USER_NAME}`}</Text>
            <Text style={styles.headerCaption}>{todayLabel}</Text>
          </View>
          <Pressable style={styles.profileBubble}>
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
          </Pressable>
        </View>

        <Animated.View
          style={[
            styles.contentWrap,
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslate }],
            },
          ]}
        >
          {renderCurrentTab()}
        </Animated.View>

        <View style={styles.tabBar}>
          {TAB_ITEMS.map((tab) => {
            const selected = activeTab === tab.key;
            return (
              <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} style={styles.tabItem}>
                <Ionicons name={selected ? tab.activeIcon : tab.icon} size={20} color={selected ? colors.brand : '#7E8FA7'} />
                <Text style={[styles.tabItemText, selected && styles.tabItemTextSelected]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Modal visible={showFreezeModal} transparent animationType="fade" onRequestClose={() => setShowFreezeModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowFreezeModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <Text style={styles.modalTitle}>{isCardFrozen ? 'Unfreeze debit card?' : 'Freeze debit card?'}</Text>
            <Text style={styles.modalBody}>
              {isCardFrozen
                ? 'Your card can be used immediately after unfreezing.'
                : 'This pauses new purchases, online checkout, and tap-to-pay until you unfreeze.'}
            </Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalButtonSecondary} onPress={() => setShowFreezeModal(false)}>
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalButtonPrimary} onPress={onConfirmCardFreezeToggle}>
                <Text style={styles.modalButtonPrimaryText}>{isCardFrozen ? 'Unfreeze' : 'Freeze'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function QuickAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.quickAction} onPress={onPress}>
      <View style={styles.quickActionIcon}>
        <Ionicons name={icon} size={18} color={colors.brand} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  bgOrbTop: {
    position: 'absolute',
    top: -120,
    right: -90,
    width: 280,
    height: 280,
    borderRadius: 280,
    backgroundColor: '#E3EEFF',
  },
  bgOrbBottom: {
    position: 'absolute',
    bottom: -150,
    left: -120,
    width: 300,
    height: 300,
    borderRadius: 300,
    backgroundColor: '#EAF6F0',
  },
  safeFrame: {
    flex: 1,
    paddingTop: Platform.select({ ios: 58, default: 24 }),
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  appLabel: {
    color: colors.brand,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontSize: 11,
    fontWeight: '700',
  },
  headerTitle: {
    marginTop: 4,
    color: colors.text,
    fontSize: 27,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Avenir Next', default: undefined }),
  },
  headerCaption: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  profileBubble: {
    width: 42,
    height: 42,
    borderRadius: 42,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contentWrap: {
    flex: 1,
    marginTop: 8,
  },
  fullHeight: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 22,
    gap: 12,
  },
  heroCard: {
    backgroundColor: colors.cardBlue,
    borderRadius: radius.l,
    padding: 18,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  heroEyebrow: {
    color: '#BFD8FF',
    fontSize: 12,
    letterSpacing: 0.4,
    fontWeight: '600',
  },
  heroValue: {
    marginTop: 5,
    color: '#FFFFFF',
    fontSize: 34,
    letterSpacing: -0.4,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Avenir Next', default: undefined }),
  },
  heroSub: {
    marginTop: 4,
    color: '#DCEAFF',
    fontSize: 13,
  },
  accountChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  accountChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.s,
    padding: 10,
  },
  accountChipLabel: {
    color: '#D9E8FF',
    fontSize: 11,
    fontWeight: '600',
  },
  accountChipValue: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickAction: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.m,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActionIcon: {
    width: 34,
    height: 34,
    borderRadius: 34,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    marginTop: 8,
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Avenir Next', default: undefined }),
  },
  sectionCaption: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  barChartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 106,
  },
  barWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bar: {
    borderRadius: 8,
    backgroundColor: colors.brand,
  },
  progressTrack: {
    marginTop: 4,
    width: '100%',
    height: 10,
    borderRadius: 10,
    backgroundColor: '#E8EEF8',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 10,
    backgroundColor: colors.brand,
  },
  inlineMetric: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  linkText: {
    color: colors.brand,
    fontWeight: '700',
    fontSize: 12,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#EDF2F9',
  },
  transactionMeta: {
    flex: 1,
    paddingRight: 12,
  },
  transactionMerchant: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  transactionCategory: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 12,
  },
  transactionAmount: {
    fontWeight: '700',
    fontSize: 14,
  },
  positiveAmount: {
    color: colors.positive,
  },
  negativeAmount: {
    color: colors.text,
  },
  accountCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  accountName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  accountSubtitle: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 12,
  },
  accountBalance: {
    color: colors.text,
    fontSize: 30,
    letterSpacing: -0.6,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Avenir Next', default: undefined }),
  },
  creditBalance: {
    color: '#9A3745',
  },
  accountFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pillTag: {
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillTagText: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: '700',
  },
  accountFooterText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  progressTrackTall: {
    width: '100%',
    height: 12,
    borderRadius: 12,
    backgroundColor: '#E8EEF8',
    overflow: 'hidden',
  },
  progressFillTall: {
    height: '100%',
    borderRadius: 12,
    backgroundColor: colors.positive,
  },
  cardVisual: {
    borderRadius: radius.l,
    padding: 18,
    backgroundColor: colors.cardNavy,
    minHeight: 200,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  cardShine: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 190,
    backgroundColor: 'rgba(255,255,255,0.16)',
    top: -70,
    right: -65,
  },
  cardNetwork: {
    color: '#CCDFFF',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
    letterSpacing: 1,
  },
  cardName: {
    color: '#E6F0FF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 10,
  },
  cardDigits: {
    marginTop: 14,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: Platform.select({ ios: 'Menlo', default: undefined }),
  },
  cardMetaRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardMetaLabel: {
    color: '#AFC8EE',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  cardMetaValue: {
    marginTop: 3,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  statusChip: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusChipWarning: {
    backgroundColor: '#FCEFD9',
  },
  statusChipOk: {
    backgroundColor: '#E5F6EC',
  },
  statusChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF4E5',
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: '#F1D4A9',
    padding: 10,
  },
  warningBannerText: {
    flex: 1,
    color: '#8A5600',
    fontSize: 12,
    fontWeight: '600',
  },
  featureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: colors.surfaceMuted,
  },
  featureButtonDisabled: {
    backgroundColor: '#F1F4F8',
  },
  featureButtonLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  featureButtonLabelDisabled: {
    color: '#8F9FB4',
  },
  featurePill: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  activityRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    marginTop: 20,
  },
  timelineDotNeutral: {
    backgroundColor: '#7B8EA8',
  },
  timelineDotPositive: {
    backgroundColor: colors.positive,
  },
  timelineDotWarning: {
    backgroundColor: colors.warning,
  },
  activityCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  activityTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  activityDetail: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 12,
  },
  activityTime: {
    marginTop: 7,
    color: '#7F90A8',
    fontSize: 11,
    fontWeight: '600',
  },
  selectorRow: {
    gap: 8,
  },
  selectorChip: {
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 11,
    backgroundColor: colors.surfaceMuted,
  },
  selectorChipSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  selectorChipTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  selectorChipTitleSelected: {
    color: colors.brand,
  },
  selectorChipAmount: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 12,
  },
  selectorChipAmountSelected: {
    color: colors.brand,
    opacity: 0.9,
  },
  amountInput: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.s,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    backgroundColor: '#FAFCFF',
    fontFamily: Platform.select({ ios: 'Avenir Next', default: undefined }),
  },
  quickAmountRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAmountChip: {
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FBFDFF',
  },
  quickAmountText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  inputWarning: {
    color: '#9A3745',
    fontSize: 12,
    fontWeight: '600',
  },
  noticeCard: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: '#BFE5D2',
    backgroundColor: '#ECF8F1',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noticeText: {
    flex: 1,
    color: '#2A6E4E',
    fontSize: 12,
    fontWeight: '600',
  },
  primaryButton: {
    marginTop: 4,
    borderRadius: radius.s,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  primaryButtonDisabled: {
    backgroundColor: '#9DB8DB',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 6,
    gap: 2,
    shadowColor: colors.shadow,
    shadowOpacity: 0.7,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: radius.s,
    paddingVertical: 6,
  },
  tabItemText: {
    fontSize: 11,
    color: '#7E8FA7',
    fontWeight: '600',
  },
  tabItemTextSelected: {
    color: colors.brand,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 30, 50, 0.32)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '700',
  },
  modalBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  modalButtonSecondary: {
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalButtonSecondaryText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  modalButtonPrimary: {
    borderRadius: radius.s,
    backgroundColor: colors.brand,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalButtonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
