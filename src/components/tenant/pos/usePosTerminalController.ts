'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useToast } from '@/context/ToastContext';
import { fetchWithCache, invalidateCache } from '@/lib/clientCache';
import { subscribeRealtime } from '@/lib/realtimeManager';
import {
  playOrderChime,
  playSuccessChime,
  playDeliveryChime,
  playServiceCallChime,
  playButtonTapSound,
  speakThaiVoice,
  speakMoneyReceived,
  speakSlipSubmitted,
  speakCustomerNotifyTransfer,
  speakServiceCall,
} from '@/lib/sound';
import { ServiceCallItem, ServiceCallAlertMode } from './ServiceCallModal';

export interface UsePosTerminalOptions {
  slug?: string;
  isSplitView?: boolean;
}

export function usePosTerminalController({
  slug = 'lung-pa',
  isSplitView = false,
}: UsePosTerminalOptions = {}) {
  const { showSuccess, showError, showInfo } = useToast();
  const [tables, setTables] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'PAYMENT_PENDING' | 'DELIVERY'>('ALL');

  // Delivery Channels & Hub State
  const [orderChannel, setOrderChannel] = useState<'DINE_IN' | 'TAKEAWAY' | 'LINEMAN' | 'GRAB' | 'SHOPEE_FOOD' | 'ROBINHOOD'>('DINE_IN');
  const [deliveryOrderId, setDeliveryOrderId] = useState('');
  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');
  const [deliveryOrders, setDeliveryOrders] = useState<any[]>([]);

  // Selected Table Drawer & Modal Triggers
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [isCashierOrderOpen, setIsCashierOrderOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);

  // Print Receipt Modal
  const [receiptOrder, setReceiptOrder] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Bank Alert Queue & Modal State
  const [bankAlertQueue, setBankAlertQueue] = useState<any[]>([]);
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState<boolean>(false);
  const [activeServiceCalls, setActiveServiceCalls] = useState<{ [tableKey: string]: { requestType: string; timestamp: number } }>({});

  // Service Call Queue & Pop-up Modal State
  const [serviceCallQueue, setServiceCallQueue] = useState<ServiceCallItem[]>([]);
  const [activeServiceCallIndex, setActiveServiceCallIndex] = useState<number>(0);
  const [isServiceCallModalOpen, setIsServiceCallModalOpen] = useState<boolean>(false);

  const [serviceCallAlertMode, setServiceCallAlertMode] = useState<ServiceCallAlertMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_service_call_alert_mode');
      if (saved === 'BOTH' || saved === 'VOICE_ONLY' || saved === 'CHIME_ONLY' || saved === 'MUTE') {
        return saved;
      }
    }
    return 'BOTH';
  });
  const serviceCallAlertModeRef = useRef(serviceCallAlertMode);
  useEffect(() => {
    serviceCallAlertModeRef.current = serviceCallAlertMode;
  }, [serviceCallAlertMode]);

  const updateServiceCallAlertMode = (mode: ServiceCallAlertMode) => {
    setServiceCallAlertMode(mode);
    serviceCallAlertModeRef.current = mode;
    if (typeof window !== 'undefined') {
      localStorage.setItem('pos_service_call_alert_mode', mode);
    }
  };

  // Repeat service call alert every 20 seconds as long as there is an unacknowledged call
  useEffect(() => {
    if (serviceCallQueue.length === 0 || serviceCallAlertMode === 'MUTE') return;

    const repeatTimer = setInterval(() => {
      const call = serviceCallQueue[activeServiceCallIndex] || serviceCallQueue[0];
      if (call) {
        if (serviceCallAlertMode === 'BOTH') {
          playServiceCallChime();
          setTimeout(() => {
            speakServiceCall(call.tableNo, call.requestType, call.note, 1.15);
          }, 650);
        } else if (serviceCallAlertMode === 'VOICE_ONLY') {
          speakServiceCall(call.tableNo, call.requestType, call.note, 1.15);
        } else if (serviceCallAlertMode === 'CHIME_ONLY') {
          playServiceCallChime();
        }
      }
    }, 20000);

    return () => clearInterval(repeatTimer);
  }, [serviceCallQueue, activeServiceCallIndex, serviceCallAlertMode]);

  const addServiceCall = (call: Omit<ServiceCallItem, 'id'> & { id?: string }) => {
    const callId = call.id || `call_${call.tableNo}_${Date.now()}`;
    const newCall: ServiceCallItem = { ...call, id: callId };

    setServiceCallQueue((prev) => {
      const idx = prev.findIndex((p) => p.tableNo === call.tableNo);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = newCall;
        return updated;
      }
      return [...prev, newCall];
    });

    const key = String(call.tableNo);
    setActiveServiceCalls((prev) => ({
      ...prev,
      [key]: { requestType: call.requestType, timestamp: call.timestamp || Date.now() },
    }));

    setIsServiceCallModalOpen(true);
  };

  const dismissedCallKeysRef = useRef<Set<string>>(new Set());

  const dismissServiceCall = (callId: string) => {
    setServiceCallQueue((prev) => {
      const call = prev.find((c) => c.id === callId);
      if (call) {
        dismissedCallKeysRef.current.add(`${call.tableNo}_${call.timestamp}`);
        const key = String(call.tableNo);
        setActiveServiceCalls((activePrev) => {
          const next = { ...activePrev };
          delete next[key];
          return next;
        });
      }
      const nextQueue = prev.filter((c) => c.id !== callId);
      if (nextQueue.length === 0) {
        setIsServiceCallModalOpen(false);
        setActiveServiceCallIndex(0);
      } else {
        setActiveServiceCallIndex((idx) => Math.min(idx, nextQueue.length - 1));
      }
      return nextQueue;
    });

    fetch(`/api/r/${slug}/service-call`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: callId, action: 'DISMISS' }),
    }).catch(() => {});
  };

  const dismissAllServiceCalls = () => {
    serviceCallQueue.forEach((call) => {
      dismissedCallKeysRef.current.add(`${call.tableNo}_${call.timestamp}`);
    });
    setServiceCallQueue([]);
    setActiveServiceCalls({});
    setIsServiceCallModalOpen(false);
    setActiveServiceCallIndex(0);

    fetch(`/api/r/${slug}/service-call`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'DISMISS_ALL' }),
    }).catch(() => {});
  };

  const addBankAlert = (alert: any) => {
    const alertId = alert.id || `${alert.tableNo || alert.tableId || 'table'}_${Date.now()}`;
    const itemWithId = { ...alert, id: alertId };

    setBankAlertQueue((prev) => {
      const existingIndex = prev.findIndex(
        (p) =>
          (alert.tableNo && p.tableNo === alert.tableNo) ||
          (alert.tableId && p.tableId === alert.tableId)
      );
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...prev[existingIndex], ...itemWithId };
        return updated;
      }
      return [...prev, itemWithId];
    });

    setActiveAlertId((curr) => curr || alertId);
    setIsAlertModalOpen(true);
  };

  const dismissCurrentAlert = () => {
    setIsAlertModalOpen(false);
  };

  const resolveAlertAndNext = (alertId: string) => {
    setBankAlertQueue((prev) => {
      const nextQueue = prev.filter((a) => a.id !== alertId);
      if (nextQueue.length === 0) {
        setIsAlertModalOpen(false);
        setActiveAlertId(null);
      } else {
        setActiveAlertId(nextQueue[0].id);
      }
      return nextQueue;
    });
  };

  // Voice Announcement State
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_voice_enabled');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pos_audio_unlocked') === 'true';
    }
    return false;
  });

  const unlockAudio = () => {
    setIsAudioUnlocked(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pos_audio_unlocked', 'true');
    }
    playSuccessChime();
    speakThaiVoice('ระบบเสียงแจ้งเตือนเงินเข้าพร้อมทำงานแล้วค่ะ');
    showSuccess('🔊 เปิดระบบเสียงแจ้งเตือนสำเร็จ', 'พร้อมรับเสียงพูดแจ้งเตือนเงินเข้าภาษาไทยอัตโนมัติ');
  };

  const toggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pos_voice_enabled', next ? 'true' : 'false');
      localStorage.setItem('pos_audio_unlocked', 'true');
      window.dispatchEvent(new CustomEvent('pos-voice-changed', { detail: { enabled: next } }));
    }
    if (next) {
      speakThaiVoice('เปิดระบบเสียงอ่านแจ้งเตือนเงินเข้าแล้วค่ะ');
      showSuccess('🔊 เปิดเสียงอ่านแจ้งเตือนเงินเข้าแล้ว');
    } else {
      showInfo('🔇 ปิดเสียงอ่านแจ้งเตือนเงินเข้า');
    }
  };

  useEffect(() => {
    const handleFirstInteraction = () => {
      setIsAudioUnlocked(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('pos_audio_unlocked', 'true');
      }
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);
    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  // Sync voice state across components (Navbar, Kitchen, POS)
  useEffect(() => {
    const handleVoiceChange = (e: any) => {
      if (typeof e.detail?.enabled === 'boolean') {
        setVoiceEnabled(e.detail.enabled);
      }
    };
    window.addEventListener('pos-voice-changed', handleVoiceChange);
    return () => window.removeEventListener('pos-voice-changed', handleVoiceChange);
  }, []);

  const fetchData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        invalidateCache(slug);
      }
      const [tData, mData, sData, oData] = await Promise.all([
        fetch(`/api/r/${slug}/tables`).then((r) => r.json()).catch(() => []),
        fetchWithCache(`menu_${slug}`, () => fetch(`/api/r/${slug}/menu`).then((r) => r.json()).catch(() => []), 60000),
        fetchWithCache(`settings_${slug}`, () => fetch(`/api/r/${slug}/settings`).then((r) => r.json()).catch(() => null), 60000),
        fetch(`/api/r/${slug}/orders`).then((r) => r.json()).catch(() => []),
      ]);
      setTables(Array.isArray(tData) ? tData : []);
      setCategories(Array.isArray(mData) ? mData : []);
      setStore(sData?.error ? null : sData);

      const safeOrders = Array.isArray(oData) ? oData : [];
      const activeDeliveries = safeOrders.filter(
        (o: any) =>
          ['LINEMAN', 'GRAB', 'SHOPEE_FOOD', 'ROBINHOOD'].includes(o.orderChannel) &&
          ['PENDING', 'COOKING', 'READY', 'SERVED'].includes(o.status)
      );
      setDeliveryOrders(activeDeliveries);

      if (selectedTable && Array.isArray(tData)) {
        const updated = tData.find((t: any) => t.id === selectedTable.id || t.tableNo === selectedTable.tableNo);
        if (updated) setSelectedTable(updated);
      }

      // Synchronize active service calls from DB
      if (Array.isArray(tData)) {
        tData.forEach((tableItem: any) => {
          if (tableItem.activeServiceCall) {
            const call = tableItem.activeServiceCall;
            const callKey = `${call.tableNo}_${call.timestamp}`;
            if (!dismissedCallKeysRef.current.has(callKey)) {
              setServiceCallQueue((prevQueue) => {
                const alreadyExists = prevQueue.some(
                  (q) => q.tableNo === call.tableNo && Math.abs(q.timestamp - call.timestamp) < 5000
                );
                if (!alreadyExists) {
                  const mode = serviceCallAlertModeRef.current;
                  if (mode === 'BOTH') {
                    playServiceCallChime();
                    setTimeout(() => {
                      speakServiceCall(call.tableNo, call.requestType, call.note, 1.15);
                    }, 650);
                  } else if (mode === 'VOICE_ONLY') {
                    speakServiceCall(call.tableNo, call.requestType, call.note, 1.15);
                  } else if (mode === 'CHIME_ONLY') {
                    playServiceCallChime();
                  }
                  setIsServiceCallModalOpen(true);
                  return [...prevQueue, call];
                }
                return prevQueue;
              });

              setActiveServiceCalls((prev) => ({
                ...prev,
                [String(call.tableNo)]: { requestType: call.requestType, timestamp: call.timestamp },
              }));
            }
          }
        });
      }
    } catch (err) {
      console.error('Error loading POS data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Dedicated poll for service calls
  useEffect(() => {
    let isMounted = true;
    const pollServiceCalls = async () => {
      try {
        const res = await fetch(`/api/r/${slug}/service-call`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const calls: ServiceCallItem[] = data.calls || [];
        if (!isMounted) return;

        if (calls.length > 0) {
          calls.forEach((call) => {
            const callKey = `${call.tableNo}_${call.timestamp}`;
            if (!dismissedCallKeysRef.current.has(callKey)) {
              setServiceCallQueue((prevQueue) => {
                const alreadyExists = prevQueue.some(
                  (q) => q.tableNo === call.tableNo && Math.abs(q.timestamp - call.timestamp) < 5000
                );
                if (!alreadyExists) {
                  const mode = serviceCallAlertModeRef.current;
                  if (mode === 'BOTH') {
                    playServiceCallChime();
                    setTimeout(() => {
                      speakServiceCall(call.tableNo, call.requestType, call.note, 1.15);
                    }, 650);
                  } else if (mode === 'VOICE_ONLY') {
                    speakServiceCall(call.tableNo, call.requestType, call.note, 1.15);
                  } else if (mode === 'CHIME_ONLY') {
                    playServiceCallChime();
                  }
                  setIsServiceCallModalOpen(true);
                  return [...prevQueue, call];
                }
                return prevQueue;
              });

              setActiveServiceCalls((prev) => ({
                ...prev,
                [String(call.tableNo)]: { requestType: call.requestType, timestamp: call.timestamp },
              }));
            }
          });
        }
      } catch (e) {}
    };

    const intervalId = setInterval(pollServiceCalls, 12000);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [slug]);

  // Realtime subscription
  useEffect(() => {
    fetchData();

    const unsubscribe = subscribeRealtime(slug, (payload) => {
      try {
        if (payload.type === 'BANK_NOTIFY_RECEIVED') {
          const d = payload.data;
          addBankAlert(d);

          if (d.action === 'AUTO_PAID') {
            playSuccessChime();
            if (voiceEnabled) {
              speakMoneyReceived(d.amount, d.tableName || (d.tableNo ? `โต๊ะ ${d.tableNo}` : ''));
            }
            showSuccess(
              `💰 รับเงิน ฿${d.amount?.toLocaleString()} จาก ${d.bankName || d.bank}`,
              `ปิดบิลและเคลียร์ ${d.tableName || `โต๊ะ ${d.tableNo}`} สำเร็จแล้ว 🎉`
            );
            fetchData();
          } else if (d.action === 'MANUAL_CONFIRM') {
            playOrderChime();
            if (voiceEnabled) {
              const rawTable = d.tableName || (d.tableNo ? `โต๊ะ ${d.tableNo}` : '');
              const target = rawTable ? (rawTable.startsWith('โต๊ะ') ? ` ${rawTable}` : ` โต๊ะ ${rawTable}`) : '';
              speakThaiVoice(`เงินเข้า ${d.amount} บาท${target} ค่ะ กรุณากดยืนยันปิดบิลค่ะ`.replace(/\s+/g, ' ').trim());
            }
            showInfo(
              `🔔 เงินเข้า ฿${d.amount?.toLocaleString()} (${d.bankName || d.bank})`,
              `ตรงกับ ${d.tableName || `โต๊ะ ${d.tableNo}`} กรุณากดยืนยันปิดบิล`
            );
          } else if (d.action === 'AMBIGUOUS_CHOICE') {
            playOrderChime();
            if (voiceEnabled) {
              speakThaiVoice(`มีเงินเข้า ${d.amount} บาท กรุณาเลือกโต๊ะค่ะ`);
            }
            showInfo(
              `🔔 เงินเข้า ฿${d.amount?.toLocaleString()} (${d.bankName || d.bank})`,
              `มียอดตรงกับ ${d.candidates?.length} โต๊ะ กรุณาเลือกโต๊ะที่ต้องการตัดยอด`
            );
          } else if (d.action === 'UNMATCHED') {
            playOrderChime();
            if (voiceEnabled) {
              speakThaiVoice(`มีเงินเข้า ${d.amount} บาท แต่ไม่พบยอดที่ตรงกันค่ะ`);
            }
            showInfo(
              `🔔 เงินเข้า ฿${d.amount?.toLocaleString()} (${d.bankName || d.bank})`,
              `ไม่พบบิลที่มียอดตรงกัน กรุณาตรวจสอบ`
            );
          }
        } else if (payload.type === 'CUSTOMER_NOTIFY_TRANSFER') {
          playOrderChime();
          const d = payload.data;
          if (voiceEnabled && d) {
            const tableText = d.tableNo ? `โต๊ะ ${d.tableNo}` : (d.tableName || '');
            speakCustomerNotifyTransfer(tableText, d.amount || 0);
          }
          showInfo(
            `🔔 ลูกค้าแจ้งโอนเงิน!`,
            `${d.tableName || `โต๊ะ ${d.tableNo}`} แจ้งโอนเงินแล้ว กรุณาตรวจสอบยอดเงินเข้า`
          );
          fetchData();
        } else if (payload.type === 'SLIP_SUBMITTED') {
          playOrderChime();
          const d = payload.data;
          if (voiceEnabled && d) {
            const tableText = d.tableNo ? `โต๊ะ ${d.tableNo}` : (d.tableName || '');
            speakSlipSubmitted(tableText);
          }
          showInfo(
            `📷 มีลูกค้าแนบสลิปใหม่!`,
            `${d.tableName || `โต๊ะ ${d.tableNo}`} รอตรวจสอบสลิป`
          );
          fetchData();
        } else if (payload.type === 'DELIVERY_ORDER_CREATED') {
          playDeliveryChime();
          const d = payload.data;
          if (voiceEnabled && d) {
            const channelName =
              d.orderChannel === 'LINEMAN'
                ? 'ไลน์แมน'
                : d.orderChannel === 'GRAB'
                ? 'แกร็บฟู้ด'
                : d.orderChannel === 'SHOPEE_FOOD'
                ? 'ช้อปปี้ฟู้ด'
                : 'เดลิเวอรี';
            speakThaiVoice(`มีออเดอร์ใหม่จาก ${channelName} ค่ะ`);
          }
          showSuccess(
            `🛵 มีออเดอร์เดลิเวอรีใหม่! (${d.orderChannel})`,
            `รหัสออเดอร์: #${d.deliveryOrderId || d.id?.slice(-4)}`
          );
          fetchData();
        } else if (payload.type === 'PAYMENT_RECEIVED') {
          playSuccessChime();
          if (voiceEnabled && payload.data) {
            const orderData = payload.data;
            const tableText = orderData.tableNo ? `โต๊ะ ${orderData.tableNo}` : (orderData.tableName || '');
            const amt = orderData.netAmount || orderData.totalAmount || orderData.slipAmount;
            if (amt) {
              speakMoneyReceived(amt, tableText);
            }
          }
          fetchData();
        } else if (payload.type === 'SERVICE_CALLED') {
          const d = payload.data;
          const mode = serviceCallAlertModeRef.current;
          if (mode === 'BOTH') {
            playServiceCallChime();
            setTimeout(() => {
              speakServiceCall(d.tableNo, d.requestType, d.note, 1.15);
            }, 650);
          } else if (mode === 'VOICE_ONLY') {
            speakServiceCall(d.tableNo, d.requestType, d.note, 1.15);
          } else if (mode === 'CHIME_ONLY') {
            playServiceCallChime();
          }
          showInfo(`🔔 ${d.tableName || `โต๊ะ ${d.tableNo}`} เรียกพนักงาน!`, `${d.requestType} ${d.note ? `(${d.note})` : ''}`);
          addServiceCall({
            id: d.id,
            tableNo: Number(d.tableNo) || 1,
            tableName: d.tableName || (d.tableNo ? `โต๊ะ ${d.tableNo}` : 'โต๊ะอาหาร'),
            requestType: d.requestType || 'เรียกพนักงาน',
            note: d.note || '',
            timestamp: d.timestamp || Date.now(),
          });
        } else if (
          payload.type === 'ORDER_CREATED' ||
          payload.type === 'ORDER_UPDATED' ||
          payload.type === 'TABLE_UPDATED'
        ) {
          fetchData();
        }
      } catch (e) {}
    });

    const pollInterval = setInterval(() => {
      fetchData();
    }, 15000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [slug]);

  // Filter Tables
  const filteredTables = useMemo(() => {
    if (statusFilter === 'ALL') return tables;
    return tables.filter((t) => t.status === statusFilter);
  }, [tables, statusFilter]);

  const totalOccupied = tables.filter((t) => t.status === 'OCCUPIED' || t.status === 'PAYMENT_PENDING').length;
  const totalAvailable = tables.filter((t) => t.status === 'AVAILABLE').length;

  const handleOpenDeliveryModal = (channel: 'LINEMAN' | 'GRAB' | 'SHOPEE_FOOD' | 'ROBINHOOD' = 'LINEMAN') => {
    setOrderChannel(channel);
    setSelectedTable(null);
    const prefix = channel === 'LINEMAN' ? 'LM' : channel === 'GRAB' ? 'GF' : channel === 'SHOPEE_FOOD' ? 'SF' : 'RB';
    setDeliveryOrderId(`${prefix}-${Math.floor(1000 + Math.random() * 9000)}`);
    setRiderName('');
    setRiderPhone('');
    setIsCashierOrderOpen(true);
  };

  const handleUpdateDeliveryStatus = async (orderId: string, newStatus: string) => {
    if (newStatus === 'COMPLETED') {
      playSuccessChime();
      showSuccess('ไรเดอร์รับอาหารแล้ว 🛵✨', 'เคลียร์ออเดอร์และบันทึกยอดขายเรียบร้อย');
    } else if (newStatus === 'SERVED') {
      playSuccessChime();
      showSuccess('เสิร์ฟอาหารแล้ว ✨', 'ออเดอร์เดลิเวอรีเสร็จสมบูรณ์');
    } else if (newStatus === 'READY') {
      playSuccessChime();
      showSuccess('ปรุงเสร็จแล้ว 🔔', 'พร้อมส่งมอบให้ไรเดอร์');
    } else if (newStatus === 'COOKING') {
      playButtonTapSound('pop');
      showInfo('เริ่มปรุงออเดอร์แล้ว 🍳');
    } else {
      playButtonTapSound('tap');
      showInfo('อัปเดตสถานะเรียบร้อย');
    }

    const prevDeliveries = [...deliveryOrders];
    if (newStatus === 'COMPLETED') {
      setDeliveryOrders((prev) => prev.filter((o) => o.id !== orderId));
    } else {
      setDeliveryOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    }

    try {
      const res = await fetch(`/api/r/${slug}/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        setDeliveryOrders(prevDeliveries);
        showError('ไม่สามารถอัปเดตสถานะได้');
      }
    } catch (err) {
      setDeliveryOrders(prevDeliveries);
      showError('ไม่สามารถอัปเดตสถานะได้');
    }
  };

  const handleClearAllDeliveries = async () => {
    if (deliveryOrders.length === 0) return;
    const prevDeliveries = [...deliveryOrders];
    const clearedCount = deliveryOrders.length;

    playSuccessChime();
    showSuccess('ไรเดอร์รับครบทุกออเดอร์แล้ว 🛵✨', `เคลียร์ ${clearedCount} ออเดอร์และบันทึกยอดขายเรียบร้อย`);

    setDeliveryOrders([]);

    try {
      await Promise.all(
        prevDeliveries.map((o) =>
          fetch(`/api/r/${slug}/orders/${o.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'COMPLETED' }),
          })
        )
      );
    } catch (err) {
      setDeliveryOrders(prevDeliveries);
      showError('ไม่สามารถเคลียร์ออเดอร์ได้');
    }
  };

  const handleOpenCheckoutForTable = (table: any) => {
    setSelectedTable(table);
    setIsPayModalOpen(true);
  };

  const handlePrintBillForTable = (table: any) => {
    const orders = table.activeOrders || [];
    const total = orders.reduce((sum: number, o: any) => sum + (o.netAmount ?? o.totalAmount ?? 0), 0);
    const existingPhone = orders.find((o: any) => o.memberPhone)?.memberPhone;
    const existingName = orders.find((o: any) => o.customerName)?.customerName;

    setReceiptOrder({
      storeName: store?.storeName || store?.name || 'ร้านอาหารตามสั่ง',
      promptPayName: store?.promptPayName || '',
      promptPayId: store?.promptPayId || '',
      phone: store?.phone || '',
      address: store?.address || '',
      receiptFooter: store?.receiptFooter || '',
      tableId: table.tableNo || table.id,
      tableName: table.name || `โต๊ะ ${table.tableNo || table.id}`,
      orders: orders,
      items: orders.flatMap((o: any) => o.items || []),
      totalAmount: total,
      discountAmount: 0,
      netAmount: total,
      paymentMethod: 'PENDING',
      isPreCheck: true,
      customerName: existingName && !/^\d{9,10}$/.test(existingName.replace(/\D/g, '')) ? existingName : '',
      memberPhone: existingPhone || (existingName && /^\d{9,10}$/.test(existingName.replace(/\D/g, '')) ? existingName : ''),
      pointsEarned: existingPhone ? Math.floor(total / (store?.pointsRate || 25)) : 0,
      orderId: orders[0]?.id || `BILL-${table.tableNo || table.id}-${Date.now().toString().slice(-4)}`,
      paidAt: new Date().toISOString(),
      autoPrint: true,
    });
    setIsReceiptModalOpen(true);
  };

  const handleAcknowledgeServiceCall = (tableKey: string) => {
    setActiveServiceCalls((prev) => {
      const next = { ...prev };
      delete next[tableKey];
      return next;
    });
    showSuccess('รับทราบคำขอแล้ว 👍', `โต๊ะ ${tableKey}`);
  };

  return {
    slug,
    isSplitView,
    tables,
    setTables,
    categories,
    store,
    loading,
    statusFilter,
    setStatusFilter,
    orderChannel,
    setOrderChannel,
    deliveryOrderId,
    setDeliveryOrderId,
    riderName,
    setRiderName,
    riderPhone,
    setRiderPhone,
    deliveryOrders,
    setDeliveryOrders,
    selectedTable,
    setSelectedTable,
    isCashierOrderOpen,
    setIsCashierOrderOpen,
    isMoveModalOpen,
    setIsMoveModalOpen,
    isAddTableModalOpen,
    setIsAddTableModalOpen,
    isPayModalOpen,
    setIsPayModalOpen,
    receiptOrder,
    setReceiptOrder,
    isReceiptModalOpen,
    setIsReceiptModalOpen,
    bankAlertQueue,
    activeAlertId,
    setActiveAlertId,
    isAlertModalOpen,
    setIsAlertModalOpen,
    activeServiceCalls,
    setActiveServiceCalls,
    serviceCallQueue,
    activeServiceCallIndex,
    setActiveServiceCallIndex,
    isServiceCallModalOpen,
    setIsServiceCallModalOpen,
    serviceCallAlertMode,
    updateServiceCallAlertMode,
    dismissServiceCall,
    dismissAllServiceCalls,
    addBankAlert,
    dismissCurrentAlert,
    resolveAlertAndNext,
    voiceEnabled,
    setVoiceEnabled,
    isAudioUnlocked,
    setIsAudioUnlocked,
    unlockAudio,
    toggleVoice,
    fetchData,
    filteredTables,
    totalOccupied,
    totalAvailable,
    handleOpenDeliveryModal,
    handleUpdateDeliveryStatus,
    handleClearAllDeliveries,
    handleOpenCheckoutForTable,
    handlePrintBillForTable,
    handleAcknowledgeServiceCall,
  };
}

export type PosTerminalController = ReturnType<typeof usePosTerminalController>;
