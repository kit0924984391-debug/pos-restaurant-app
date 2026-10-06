'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import {
  Utensils,
  ShoppingBag,
  Clock,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  X,
  ChevronRight,
  Flame,
  Sparkles,
  RefreshCw,
  Search,
  BellRing,
  ChefHat,
  Check,
  Receipt,
  Banknote,
  Volume2,
  Gift,
  Award,
  Phone,
  User,
  Tag,
  Loader2,
  Camera,
  ShieldCheck,
  UploadCloud,
  Users,
  Share2,
} from 'lucide-react';
import { formatPrice, formatTime, formatImageUrl } from '@/lib/utils';
import { playSuccessChime, playOrderChime, speakThaiVoice } from '@/lib/sound';
import { generatePromptPayPayload } from '@/lib/promptpay';
import { scanSlipQrClient } from '@/lib/slip-scanner-client';
import { useToast } from '@/context/ToastContext';
import { getUpsellingRecommendations } from '@/lib/aiUpselling';

const QUICK_NOTES = [
  'ไม่ใส่ผงชูรส',
  'เผ็ดน้อย',
  'ข้าวน้อย',
  'ไม่ใส่กระเทียม',
  'ไม่ใส่ผัก',
  'แยกน้ำปลาพริก',
  'ขอช้อนส้อมเพิ่ม',
];

export default function CustomerOrderingView({
  slug = 'lung-pa',
  tableId = 1,
}: {
  slug?: string;
  tableId?: number;
}) {
  const { showSuccess, showError, showInfo } = useToast();
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [tableData, setTableData] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'menu' | 'status'>('menu');

  // Customization Modal State
  const [selectedMenuItem, setSelectedMenuItem] = useState<any>(null);
  const [dishQuantity, setDishQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<{ [groupTitle: string]: { name: string; extraPrice: number }[] }>({});
  const [specialNote, setSpecialNote] = useState('');

  // Cart State
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [clientUuid] = useState(() => {
    if (typeof window !== 'undefined') {
      let id = sessionStorage.getItem('pos_client_uuid');
      if (!id) {
        id = `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        sessionStorage.setItem('pos_client_uuid', id);
      }
      return id;
    }
    return 'client';
  });
  const [viewingReceiptOrder, setViewingReceiptOrder] = useState<any | null>(null);
  
  // Enterprise Loyalty & Reward States
  const [memberPhone, setMemberPhone] = useState('');
  const [memberData, setMemberData] = useState<any>(null);
  const [memberRewards, setMemberRewards] = useState<any[]>([]);
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [isMemberLoading, setIsMemberLoading] = useState(false);

  // Payment Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<'PROMPTPAY' | 'CASH'>('PROMPTPAY');
  const [isCashCalled, setIsCashCalled] = useState(false);
  const [isBillRequested, setIsBillRequested] = useState(false);
  const [isRequestingBill, setIsRequestingBill] = useState(false);

  // Slip Upload & Direct Web Transfer Notification State for Customer
  const [customerSlipPreview, setCustomerSlipPreview] = useState<string | null>(null);
  const [isCustomerUploadingSlip, setIsCustomerUploadingSlip] = useState(false);
  const [isCustomerNotifyingTransfer, setIsCustomerNotifyingTransfer] = useState(false);
  const [customerSlipSubmitted, setCustomerSlipSubmitted] = useState(false);
  const [customerSlipMessage, setCustomerSlipMessage] = useState<string | null>(null);
  const [customerSlipError, setCustomerSlipError] = useState<string | null>(null);

  // Service Call Bell State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isCallingService, setIsCallingService] = useState(false);
  const [serviceCallSuccess, setServiceCallSuccess] = useState<string | null>(null);

  // Send Service Call notification to cashier
  const handleSendServiceCall = async (requestType: string, note?: string) => {
    setIsCallingService(true);
    try {
      const res = await fetch(`/api/r/${slug}/service-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNo: tableId,
          tableName: tableData?.name || `โต๊ะ ${tableId}`,
          requestType,
          note: note || '',
        }),
      });

      if (requestType.includes('เช็คบิล')) {
        try {
          await fetch(`/api/r/${slug}/tables/${tableId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'PAYMENT_PENDING' }),
          });
          setIsBillRequested(true);
        } catch (e) {}
      }

      if (res.ok) {
        playSuccessChime();
        showSuccess('เรียกพนักงานสำเร็จ 🔔', `${requestType} • พนักงานกำลังมาให้บริการครับ`);
        setServiceCallSuccess(requestType);
        setTimeout(() => {
          setIsServiceModalOpen(false);
          setServiceCallSuccess(null);
        }, 1500);
      } else {
        showError('ไม่สามารถเรียกพนักงานได้', 'กรุณาลองใหม่อีกครั้ง');
      }
    } catch (e) {
      showError('เกิดข้อผิดพลาด', 'กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsCallingService(false);
    }
  };

  // Direct checkout request from customer (notifies cashier immediately)
  const handleCustomerRequestBill = async () => {
    if (isRequestingBill) return;
    setIsRequestingBill(true);
    try {
      const note = `ยอดรวม ฿${totalAmountToPay.toLocaleString()}`;
      const res = await fetch(`/api/r/${slug}/service-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNo: tableId,
          tableName: tableData?.name || `โต๊ะ ${tableId}`,
          requestType: 'เรียกเช็คบิล',
          note,
        }),
      });

      try {
        await fetch(`/api/r/${slug}/tables/${tableId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'PAYMENT_PENDING' }),
        });
      } catch (err) {
        console.error('Failed to update table status:', err);
      }

      if (res.ok) {
        playSuccessChime();
        const wasRequested = isBillRequested;
        setIsBillRequested(true);
        if (wasRequested) {
          showSuccess(
            'แจ้งเตือนซ้ำเรียบร้อยแล้ว 🔔',
            `เรียกเช็คบิล (${note}) • แคชเชียร์รับทราบแล้วครับ`
          );
        } else {
          showSuccess(
            'แจ้งแคชเชียร์เรียบร้อยแล้ว 🔔',
            `เรียกเช็คบิล (${note}) • กรุณารอสักครู่หรือชำระเงินที่เคาน์เตอร์ครับ`
          );
        }
      } else {
        showError('ไม่สามารถแจ้งเช็คบิลได้', 'กรุณาลองใหม่อีกครั้ง หรือติดต่อพนักงานที่เคาน์เตอร์ครับ');
      }
    } catch (e) {
      showError('เกิดข้อผิดพลาด', 'กรุณาลองใหม่อีกครั้ง หรือติดต่อพนักงานที่เคาน์เตอร์ครับ');
    } finally {
      setIsRequestingBill(false);
    }
  };

  const handleCustomerNotifyTransfer = async () => {
    setIsCustomerNotifyingTransfer(true);
    setCustomerSlipError(null);
    try {
      const res = await fetch(`/api/r/${slug}/orders/notify-transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          tableNo: tableId,
          amount: totalAmountToPay,
          memberPhone: memberPhone ? memberPhone.replace(/\D/g, '') : undefined,
          customerName: customerName.trim() || undefined,
          pointsRedeemed: selectedReward ? selectedReward.pointsRequired : 0,
          discountAmount: rewardMilestoneDiscount,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        playSuccessChime();
        speakThaiVoice('แจ้งโอนเงินเรียบร้อยแล้วค่ะ รอพนักงานตรวจสอบค่ะ');
        setCustomerSlipSubmitted(true);
        setCustomerSlipMessage('แจ้งโอนเงินเรียบร้อยแล้ว แคชเชียร์กำลังตรวจสอบยอดเงินครับ 🔔');
        showSuccess('แจ้งโอนเงินสำเร็จ 🔔', 'ระบบส่งสัญญาณแจ้งเตือนไปยังเคาน์เตอร์แคชเชียร์แล้ว');
      } else {
        setCustomerSlipError(data.error || 'เกิดข้อผิดพลาดในการแจ้งเตือน');
        showError('แจ้งเตือนไม่สำเร็จ', data.error);
      }
    } catch (err: any) {
      console.error(err);
      setCustomerSlipError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsCustomerNotifyingTransfer(false);
    }
  };

  const handleCustomerSlipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCustomerUploadingSlip(true);
    setCustomerSlipError(null);
    setCustomerSlipSubmitted(false);
    try {
      const scan = await scanSlipQrClient(file);
      setCustomerSlipPreview(scan.compressedBase64);

      const res = await fetch(`/api/r/${slug}/orders/verify-slip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          tableNo: tableId,
          qrPayload: scan.qrText,
          slipImage: scan.compressedBase64,
          manualConfirm: false,
          memberPhone: memberPhone ? memberPhone.replace(/\D/g, '') : undefined,
          customerName: customerName.trim() || undefined,
          pointsRedeemed: selectedReward ? selectedReward.pointsRequired : 0,
          discountAmount: rewardMilestoneDiscount,
        }),
      });

      const data = await res.json();
      if (data.isPaid) {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        playSuccessChime();
        speakThaiVoice('ชำระเงินเรียบร้อยแล้วค่ะ ขอบคุณที่ใช้บริการค่ะ');
        setCustomerSlipSubmitted(true);
        setCustomerSlipMessage('ชำระเงินเรียบร้อยแล้ว ขอบคุณที่ใช้บริการครับ! 🎉');
        showSuccess('ชำระเงินเรียบร้อยแล้ว 🎉', 'ระบบตรวจสอบสลิปและปิดบิลสำเร็จ');
        setTimeout(() => {
          setIsPayModalOpen(false);
          fetchData();
        }, 2500);
      } else if (data.isDuplicate) {
        speakThaiVoice('สลิปนี้เคยใช้งานแล้วค่ะ');
        setCustomerSlipError(data.error || 'สลิปนี้เคยถูกใช้งานแล้ว');
        showError('สลิปนี้เคยถูกใช้งานแล้ว', data.error);
      } else if (data.isAmountMismatch) {
        speakThaiVoice('ยอดเงินในสลิปไม่ตรงกับยอดบิลค่ะ');
        setCustomerSlipError(data.error || 'ยอดเงินในสลิปไม่ตรงกับยอดบิล');
        showError('ยอดเงินไม่ตรง', data.error);
      } else if (data.success) {
        speakThaiVoice('ส่งสลิปเรียบร้อยแล้วค่ะ รอพนักงานตรวจสอบค่ะ');
        setCustomerSlipSubmitted(true);
        setCustomerSlipMessage('แนบสลิปเรียบร้อยแล้ว แจ้งแคชเชียร์ตรวจสอบแล้วครับ 🔔');
        showSuccess('แนบสลิปเรียบร้อยแล้ว 📷', 'แจ้งเตือนพนักงานเคาน์เตอร์แล้วครับ');
      } else {
        setCustomerSlipError(data.error || 'เกิดข้อผิดพลาดในการตรวจสอบสลิป');
      }
    } catch (err: any) {
      console.error(err);
      setCustomerSlipError('เกิดข้อผิดพลาดในการประมวลผลรูปภาพ');
    } finally {
      setIsCustomerUploadingSlip(false);
    }
  };

  // Bug #9: Notify POS cashier that customer called staff to pay cash
  const handleCallStaffCash = async () => {
    setIsCashCalled(true);
    playSuccessChime();
    try {
      await fetch(`/api/r/${slug}/tables/${tableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAYMENT_PENDING' }),
      });
      showSuccess('เรียกพนักงานสำเร็จ 🔔', 'พนักงานแคชเชียร์กำลังมาเก็บเงินสดที่โต๊ะครับ');
    } catch (err) {
      console.error('Failed to notify staff for cash payment:', err);
    }
  };

  const fetchData = async () => {
    try {
      const [menuRes, tableRes, settingsRes] = await Promise.all([
        fetch(`/api/r/${slug}/menu`),
        fetch(`/api/r/${slug}/tables/${tableId}`),
        fetch(`/api/r/${slug}/settings/public`),
      ]);

      const [m, t, s] = await Promise.all([
        menuRes.json().catch(() => []),
        tableRes.json().catch(() => null),
        settingsRes.json().catch(() => null),
      ]);

      setCategories(Array.isArray(m) ? m : []);
      setTableData(t?.error ? null : t);
      setStore(s?.error ? null : s);

      if (t?.status === 'PAYMENT_PENDING') {
        setIsBillRequested(true);
      } else if (t?.status === 'AVAILABLE' || !t?.orders || t?.orders?.length === 0) {
        setIsBillRequested(false);
      }

      if (t?.orders && Array.isArray(t.orders) && t.orders.length > 0) {
        const orderWithPhone = t.orders.find((o: any) => o.memberPhone);
        if (orderWithPhone?.memberPhone && !memberPhone) {
          handleMemberLookup(orderWithPhone.memberPhone);
        }
        const orderWithName = t.orders.find((o: any) => o.customerName);
        if (orderWithName?.customerName && !customerName) {
          setCustomerName(orderWithName.customerName);
        }
      }
    } catch (err) {
      console.error('Error fetching table order data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;
    let isSubscribed = true;

    const connectSSE = () => {
      if (!isSubscribed || typeof window === 'undefined' || !('EventSource' in window)) return;
      try {
        eventSource = new EventSource(`/api/r/${slug}/stream`);
        eventSource.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'TABLE_CART_UPDATED') {
              const d = payload.data || {};
              if (Number(d.tableId) === Number(tableId) && d.clientUuid !== clientUuid) {
                setCart(Array.isArray(d.cart) ? d.cart : []);
                if (Array.isArray(d.cart) && d.cart.length > 0) {
                  showInfo(`🛒 ${d.updatedBy || 'เพื่อนที่โต๊ะ'} อัปเดตตะกร้าเรียลไทม์`);
                }
              }
            }

            if (
              payload.type === 'ORDER_CREATED' ||
              payload.type === 'ORDER_UPDATED' ||
              payload.type === 'TABLE_UPDATED' ||
              payload.type === 'PAYMENT_RECEIVED' ||
              payload.type === 'MENU_UPDATED'
            ) {
              if (payload.type === 'ORDER_UPDATED') {
                playOrderChime();
              }
              if (payload.type === 'PAYMENT_RECEIVED') {
                setIsPayModalOpen(false);
                setIsCashCalled(false);
                setIsBillRequested(false);
                playSuccessChime();
                confetti({
                  particleCount: 120,
                  spread: 90,
                  origin: { y: 0.5 },
                });
              }
              fetchData();
            }
          } catch (e) {}
        };
        eventSource.onerror = () => {
          eventSource?.close();
          if (isSubscribed) {
            reconnectTimeout = setTimeout(connectSSE, 3000);
          }
        };
      } catch (e) {
        if (isSubscribed) {
          reconnectTimeout = setTimeout(connectSSE, 3000);
        }
      }
    };

    connectSSE();

    // Polling fallback every 15s to guarantee fresh table order status
    const pollInterval = setInterval(() => {
      if (isSubscribed) {
        fetchData();
      }
    }, 15000);

    return () => {
      isSubscribed = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(pollInterval);
      eventSource?.close();
    };
  }, [slug, tableId, clientUuid]);

  // Load initial shared table cart from server
  useEffect(() => {
    fetch(`/api/r/${slug}/tables/${tableId}/cart`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.cart) && data.cart.length > 0) {
          setCart(data.cart);
        } else if (typeof window !== 'undefined') {
          try {
            const saved = localStorage.getItem(`pos_cart_${slug}_t${tableId}`);
            if (saved) {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setCart(parsed);
              }
            }
          } catch (e) {}
        }
      })
      .catch(() => {});
  }, [slug, tableId]);

  // Broadcast cart update to all phones sitting at this table
  const broadcastCartChange = (newCart: any[]) => {
    fetch(`/api/r/${slug}/tables/${tableId}/cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cart: newCart,
        clientUuid,
        updatedBy: customerName || 'เพื่อนที่โต๊ะ',
      }),
    }).catch(() => {});
  };

  // Save cart to localStorage on change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        if (cart && cart.length > 0) {
          localStorage.setItem(`pos_cart_${slug}_t${tableId}`, JSON.stringify(cart));
        } else {
          localStorage.removeItem(`pos_cart_${slug}_t${tableId}`);
        }
      } catch (e) {}
    }
  }, [cart, slug, tableId]);

  // Flattened active orders
  const activeOrders = useMemo(() => {
    return tableData?.orders || [];
  }, [tableData]);

  // Device-to-Table Session Binding (Anti-Tampering)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storageKey = `pos_active_table_${slug}`;
      if (activeOrders.length === 0) {
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, tableId.toString());
      }
    }
  }, [slug, tableId, activeOrders.length]);

  const rawTotalAmountToPay = useMemo(() => {
    return activeOrders.reduce((sum: number, o: any) => sum + (o.netAmount || 0), 0);
  }, [activeOrders]);

  const rewardMilestoneDiscount = useMemo(() => {
    return selectedReward && selectedReward.rewardType === 'DISCOUNT' ? selectedReward.discountAmount : 0;
  }, [selectedReward]);

  const totalAmountToPay = useMemo(() => {
    return Math.max(0, rawTotalAmountToPay - rewardMilestoneDiscount);
  }, [rawTotalAmountToPay, rewardMilestoneDiscount]);

  // Overall primary stage of table orders: 1 (Received), 2 (Cooking), 3 (Ready), 4 (Served)
  const currentStep = useMemo(() => {
    if (activeOrders.length === 0) return 0;
    const allStatuses = activeOrders.map((o: any) => o.status);
    if (allStatuses.some((s: string) => s === 'COOKING')) return 2;
    if (allStatuses.some((s: string) => s === 'READY')) return 3;
    if (allStatuses.every((s: string) => s === 'SERVED')) return 4;
    return 1; // PENDING
  }, [activeOrders]);

  // PromptPay QR Payload for Customer Bill Pay
  const promptPayQr = useMemo(() => {
    if (!store?.promptPayId || totalAmountToPay <= 0) return '';
    return generatePromptPayPayload(store.promptPayId, totalAmountToPay);
  }, [store?.promptPayId, totalAmountToPay]);

  // Filtered Menu Items
  const filteredMenuItems = useMemo(() => {
    let items: any[] = [];
    if (selectedCategory === 'ALL') {
      categories.forEach((cat) => {
        if (Array.isArray(cat.items)) {
          items.push(...cat.items);
        }
      });
    } else {
      const cat = categories.find((c) => c.id === selectedCategory);
      if (cat && Array.isArray(cat.items)) {
        items = cat.items;
      }
    }

    if (searchQuery.trim()) {
      items = items.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return items;
  }, [categories, selectedCategory, searchQuery]);

  // Open item customizer modal
  const handleOpenItem = (item: any) => {
    if (!item.isAvailable) return;
    setSelectedMenuItem(item);
    setDishQuantity(1);
    setSpecialNote('');

    const initialOpts: { [key: string]: any[] } = {};
    if (Array.isArray(item.options)) {
      item.options.forEach((group: any) => {
        if (group.isRequired && group.choices?.length > 0) {
          initialOpts[group.title] = [group.choices[0]];
        } else {
          initialOpts[group.title] = [];
        }
      });
    }
    setSelectedOptions(initialOpts);
  };

  const calculateCustomizedPrice = () => {
    if (!selectedMenuItem) return 0;
    let extra = 0;
    Object.values(selectedOptions).forEach((choices) => {
      choices.forEach((c) => {
        extra += c.extraPrice || 0;
      });
    });
    return (selectedMenuItem.basePrice + extra) * dishQuantity;
  };

  const handleAddToCart = () => {
    if (!selectedMenuItem) return;

    let extraPerUnit = 0;
    const flattenedOpts: any[] = [];
    Object.entries(selectedOptions).forEach(([group, choices]) => {
      choices.forEach((c) => {
        extraPerUnit += c.extraPrice || 0;
        flattenedOpts.push({
          group,
          choice: c.name,
          extra: c.extraPrice || 0,
          extraPrice: c.extraPrice || 0,
        });
      });
    });

    const itemPrice = selectedMenuItem.basePrice + extraPerUnit;

    const cartItem = {
      menuItemId: selectedMenuItem.id,
      name: selectedMenuItem.name,
      price: itemPrice,
      quantity: dishQuantity,
      selectedOptions: flattenedOpts,
      specialNote: specialNote.trim() || undefined,
    };

    const newCart = [...cart, cartItem];
    setCart(newCart);
    broadcastCartChange(newCart);
    showSuccess('เพิ่มลงตะกร้าแล้ว 🛒', `${dishQuantity}x ${selectedMenuItem.name}`);
    setSelectedMenuItem(null);
  };

  const handleRemoveCartItem = (idx: number) => {
    const item = cart[idx];
    const newCart = cart.filter((_, i) => i !== idx);
    setCart(newCart);
    broadcastCartChange(newCart);
    if (item) showInfo('นำออกจากตะกร้าแล้ว', item.name);
  };

  const handleAddUpsellToCart = (recItem: any) => {
    const cartItem = {
      menuItemId: recItem.id,
      name: recItem.name,
      price: recItem.price,
      quantity: 1,
      selectedOptions: [],
    };
    const newCart = [...cart, cartItem];
    setCart(newCart);
    broadcastCartChange(newCart);
    showSuccess(`เพิ่ม ${recItem.name} ลงตะกร้าแล้ว 🛒`, `+฿${recItem.price}`);
  };

  const modalUpsellItems = useMemo(() => {
    if (!selectedMenuItem) return [];
    return getUpsellingRecommendations([selectedMenuItem], categories, 4);
  }, [selectedMenuItem, categories]);

  const cartUpsellItems = useMemo(() => {
    if (cart.length === 0) return [];
    return getUpsellingRecommendations(cart, categories, 4);
  }, [cart, categories]);

  const handleMemberLookup = async (phone: string) => {
    setMemberPhone(phone);
    setSelectedReward(null);
    const clean = phone.replace(/\D/g, '');
    if (clean.length >= 9) {
      setIsMemberLoading(true);
      try {
        const res = await fetch(`/api/r/${slug}/members?phone=${clean}`);
        const data = await res.json();
        if (data.member) {
          setMemberData(data.member);
          if (data.member.name) {
            setCustomerName(data.member.name);
          }
          showSuccess(`สวัสดีคุณ ${data.member.name || phone} ⭐`, `แต้มสะสม: ${data.member.points} แต้ม`);
        } else {
          setMemberData(null);
        }
        if (data.rewards) setMemberRewards(data.rewards);
      } catch (e) {
        console.error(e);
      } finally {
        setIsMemberLoading(false);
      }
    } else {
      setMemberData(null);
      setMemberRewards([]);
      setSelectedReward(null);
    }
  };

  const cartTotalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleSendOrderToKitchen = async () => {
    if (cart.length === 0) return;
    setIsSubmittingOrder(true);
    try {
      const res = await fetch(`/api/r/${slug}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          orderType: 'DINE_IN',
          items: cart,
        }),
      });

      if (res.ok) {
        showSuccess('ส่งรายการอาหารเข้าครัวแล้ว! 🍳', `โต๊ะ ${tableId} • ส่งรายการเรียบร้อย`);
        setCart([]);
        // Clear shared table cart on server
        fetch(`/api/r/${slug}/tables/${tableId}/cart`, { method: 'DELETE' }).catch(() => {});
        setIsCartOpen(false);
        setActiveTab('status');
        playSuccessChime();
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
        });
        fetchData();
      } else {
        showError('ไม่สามารถส่งรายการได้', 'กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err) {
      console.error(err);
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถส่งรายการอาหารได้');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const toggleQuickNote = (tag: string) => {
    if (specialNote.includes(tag)) {
      setSpecialNote(
        specialNote
          .replace(tag, '')
          .replace(/,\s*,/g, ',')
          .replace(/^,\s*|,\s*$/g, '')
          .trim()
      );
    } else {
      setSpecialNote(specialNote ? `${specialNote}, ${tag}` : tag);
    }
  };

  return (
    <div className="min-h-screen w-full min-w-full bg-slate-950 flex flex-col items-center pb-24 text-slate-100 selection:bg-orange-500 selection:text-white overflow-x-hidden">
      <div className="w-full max-w-md bg-slate-950 min-h-screen shadow-2xl flex flex-col relative sm:border-x border-slate-800/80 overflow-x-hidden box-border">
        
        {/* Customer Header - Isolated Branding with NO Admin links */}
        <header className="bg-slate-950/95 backdrop-blur-xl text-white px-3 py-2.5 sm:px-4 sm:py-3 sticky top-0 z-30 border-b border-slate-800 shadow-lg w-full max-w-full box-border overflow-hidden">
          
          {/* Row 1: Table & Store Branding + Call Staff Button */}
          <div className="flex items-center justify-between gap-2 w-full min-w-0">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 flex items-center justify-center text-white font-black text-sm sm:text-base shadow-md shadow-orange-500/25 flex-shrink-0">
                {tableId}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-extrabold text-sm sm:text-base text-white leading-tight truncate">
                  {store?.storeName || store?.name || 'ร้านอาหารตามสั่ง'}
                </h1>
                <div className="flex items-center space-x-1.5 text-[11px] text-orange-400 font-bold mt-0.5 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block flex-shrink-0" />
                  <span className="truncate">โต๊ะ {tableId} • สั่งอาหารออนไลน์</span>
                </div>
              </div>
            </div>

            {/* Quick Call Staff Button */}
            <button
              onClick={() => setIsServiceModalOpen(true)}
              className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl font-bold text-xs text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 border border-amber-500/30 flex items-center space-x-1 sm:space-x-1.5 transition-all flex-shrink-0 shadow-sm"
              title="เรียกพนักงาน"
            >
              <BellRing className="w-3.5 h-3.5 animate-pulse text-amber-400" />
              <span>เรียก</span>
            </button>
          </div>

          {/* Row 2: Full-width Segmented Control Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs font-bold mt-2 gap-1 shadow-inner w-full box-border">
            <button
              onClick={() => setActiveTab('menu')}
              className={`py-2 px-2 rounded-lg font-extrabold transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'menu'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🍽️ เมนูอาหาร</span>
            </button>
            <button
              onClick={() => setActiveTab('status')}
              className={`py-2 px-2 rounded-lg font-extrabold transition-all relative flex items-center justify-center space-x-1.5 ${
                activeTab === 'status'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>📋 สถานะออเดอร์</span>
              {activeOrders.length > 0 && (
                <span className="flex items-center space-x-1 bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] px-1.5 py-0.5 rounded-full font-black ml-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                  <span>{activeOrders.length}</span>
                </span>
              )}
            </button>
          </div>

          {/* Row 3: Search bar (when activeTab === 'menu') */}
          {activeTab === 'menu' && (
            <div className="mt-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาเมนูอาหาร..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          )}
        </header>

        {/* Category Filter Pills */}
        {activeTab === 'menu' && (
          <div className="p-2 sm:p-2.5 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 flex items-center space-x-2 overflow-x-auto scrollbar-none sticky top-[125px] sm:top-[132px] z-20 w-full max-w-full box-border touch-pan-x">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${
                selectedCategory === 'ALL'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              ทั้งหมด
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Content Body */}
        <main className="flex-1 p-3 sm:p-4 space-y-4 w-full max-w-full box-border overflow-x-hidden">
          {activeTab === 'menu' ? (
            /* Menu Items View */
            filteredMenuItems.length === 0 ? (
              <div className="text-center py-20 text-slate-500 text-xs font-semibold">
                ไม่พบรายการอาหารในหมวดหมู่นี้
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMenuItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleOpenItem(item)}
                    className={`p-3.5 rounded-3xl border transition-all flex items-center justify-between gap-3 ${
                      item.isAvailable
                        ? 'bg-slate-900/90 border-slate-800 hover:border-orange-500/50 hover:shadow-lg cursor-pointer'
                        : 'bg-slate-900/30 border-slate-800/40 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-extrabold text-sm text-white truncate">{item.name}</h4>
                        {!item.isAvailable && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            หมด
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{item.description}</p>
                      )}
                      <span className="text-sm font-black text-orange-400 block mt-1.5">
                        ฿{item.basePrice}
                      </span>
                    </div>

                    {item.imageUrl ? (
                      <img
                        src={formatImageUrl(item.imageUrl)}
                        alt={item.name}
                        className="w-16 h-16 rounded-2xl object-cover border border-slate-800 flex-shrink-0 bg-slate-900"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-2xl bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center justify-center font-bold text-lg flex-shrink-0">
                        +
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Order Tracking & Animated Cooking Stages Pipeline */
            <div className="space-y-5">
              
              {/* Animated Progress Card */}
              {activeOrders.length > 0 && (
                <div className="p-5 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-orange-500/30 shadow-2xl space-y-5 relative overflow-hidden">
                  
                  {/* Decorative Glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <ChefHat className="w-5 h-5 text-orange-400" />
                      <span className="font-black text-sm text-white">ขั้นตอนการเตรียมอาหาร</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-orange-500/20 text-orange-300 border border-orange-500/30 animate-pulse">
                      {currentStep === 1 && '⏳ รับตั๋วเข้าครัวแล้ว'}
                      {currentStep === 2 && '🔥 กำลังปรุงอาหารสดๆ'}
                      {currentStep === 3 && '🍽️ ปรุงเสร็จ พร้อมเสิร์ฟ'}
                      {currentStep === 4 && '✅ เสิร์ฟครบเรียบร้อย'}
                    </span>
                  </div>

                  {/* 4-Stage Animated Stepper Bar */}
                  <div className="relative pt-2 pb-1">
                    {/* Background line */}
                    <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-1 bg-slate-800 rounded-full z-0" />
                    
                    {/* Active Progress line */}
                    <div
                      className="absolute top-1/2 left-4 -translate-y-1/2 h-1 bg-gradient-to-r from-orange-500 to-amber-400 rounded-full z-0 transition-all duration-700"
                      style={{
                        width: currentStep === 1 ? '10%' : currentStep === 2 ? '45%' : currentStep === 3 ? '75%' : '90%',
                      }}
                    />

                    {/* Step Icons */}
                    <div className="flex justify-between relative z-10">
                      
                      {/* Step 1: Received */}
                      <div className="flex flex-col items-center space-y-2">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                            currentStep >= 1
                              ? 'bg-gradient-to-tr from-orange-500 to-amber-400 text-white shadow-lg shadow-orange-500/30 scale-105'
                              : 'bg-slate-900 text-slate-600 border border-slate-800'
                          }`}
                        >
                          <Receipt className="w-5 h-5" />
                        </div>
                        <span className={`text-[10px] font-bold ${currentStep >= 1 ? 'text-orange-400' : 'text-slate-600'}`}>
                          รับออเดอร์
                        </span>
                      </div>

                      {/* Step 2: Cooking */}
                      <div className="flex flex-col items-center space-y-2">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                            currentStep >= 2
                              ? 'bg-gradient-to-tr from-orange-500 to-amber-400 text-white shadow-lg shadow-orange-500/30 scale-105 animate-pulse'
                              : 'bg-slate-900 text-slate-600 border border-slate-800'
                          }`}
                        >
                          <Flame className={`w-5 h-5 ${currentStep === 2 ? 'text-amber-200 animate-bounce' : ''}`} />
                        </div>
                        <span className={`text-[10px] font-bold ${currentStep >= 2 ? 'text-orange-400' : 'text-slate-600'}`}>
                          กำลังปรุง
                        </span>
                      </div>

                      {/* Step 3: Ready */}
                      <div className="flex flex-col items-center space-y-2">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                            currentStep >= 3
                              ? 'bg-gradient-to-tr from-orange-500 to-amber-400 text-white shadow-lg shadow-orange-500/30 scale-105 animate-bounce'
                              : 'bg-slate-900 text-slate-600 border border-slate-800'
                          }`}
                        >
                          <BellRing className="w-5 h-5" />
                        </div>
                        <span className={`text-[10px] font-bold ${currentStep >= 3 ? 'text-orange-400' : 'text-slate-600'}`}>
                          พร้อมเสิร์ฟ
                        </span>
                      </div>

                      {/* Step 4: Served */}
                      <div className="flex flex-col items-center space-y-2">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                            currentStep >= 4
                              ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-500/30 scale-105'
                              : 'bg-slate-900 text-slate-600 border border-slate-800'
                          }`}
                        >
                          <Check className="w-5 h-5" />
                        </div>
                        <span className={`text-[10px] font-bold ${currentStep >= 4 ? 'text-emerald-400' : 'text-slate-600'}`}>
                          เสิร์ฟแล้ว
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stage description message */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                    <p className="text-xs text-slate-300 font-medium">
                      {currentStep === 1 && '🍳 พ่อครัวได้รับรายการอาหารของโต๊ะคุณแล้ว กำลังจัดคิวปรุง'}
                      {currentStep === 2 && '🔥 กำลังผัด/ปรุงสดๆ ด้วยไฟแรง หอมกรุ่นจากเตา'}
                      {currentStep === 3 && '🍽️ อาหารปรุงเสร็จเรียบร้อยแล้ว พนักงานกำลังนำมาเสิร์ฟที่โต๊ะ'}
                      {currentStep === 4 && '😋 เสิร์ฟครบถ้วนแล้ว ทานให้อร่อยนะครับ!'}
                    </p>
                  </div>
                </div>
              )}

              {/* Total & PromptPay Checkout Box */}
              <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 block">ยอดรวมทั้งโต๊ะ:</span>
                  <span className="text-2xl font-black text-orange-400">
                    ฿{totalAmountToPay.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setActiveTab('menu')}
                    className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5 text-orange-400" />
                    <span>สั่งเพิ่ม</span>
                  </button>

                  {totalAmountToPay > 0 && (
                    <button
                      onClick={handleCustomerRequestBill}
                      disabled={isRequestingBill}
                      className={`px-4 py-2.5 rounded-2xl font-black text-xs shadow-lg flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer ${
                        isBillRequested
                          ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/25'
                      }`}
                    >
                      {isRequestingBill ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>กำลังแจ้ง...</span>
                        </>
                      ) : isBillRequested ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>แจ้งเช็คบิลแล้ว</span>
                        </>
                      ) : (
                        <>
                          <Receipt className="w-4 h-4" />
                          <span>เช็คบิล</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Orders List */}
              {activeOrders.length === 0 ? (
                <div className="text-center py-16 bg-slate-900/50 rounded-3xl border border-slate-800 p-8 space-y-3">
                  <Utensils className="w-12 h-12 text-slate-600 mx-auto" />
                  <h4 className="font-extrabold text-base text-white">ยังไม่มีรายการสั่งอาหาร</h4>
                  <p className="text-xs text-slate-400">กดแท็บ "เมนูอาหาร" เพื่อเลือกสั่งเมนูอร่อยๆ ได้เลยครับ</p>
                  <button
                    onClick={() => setActiveTab('menu')}
                    className="px-5 py-2.5 rounded-2xl bg-orange-500 text-white font-black text-xs shadow-lg shadow-orange-500/25"
                  >
                    เปิดดูเมนูอาหาร 🍳
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeOrders.map((order: any, idx: number) => (
                    <div
                      key={order.id}
                      className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-md space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                        <div>
                          <span className="font-extrabold text-xs text-white block">ออเดอร์ชุดที่ #{idx + 1}</span>
                          <span className="text-[10px] text-slate-400">{formatTime(order.createdAt)}</span>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-extrabold border ${
                            order.status === 'READY'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : order.status === 'COOKING'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                              : order.status === 'SERVED'
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          {order.status === 'READY'
                            ? '🍽️ พร้อมเสิร์ฟ'
                            : order.status === 'COOKING'
                            ? '🔥 กำลังปรุง'
                            : order.status === 'SERVED'
                            ? '✓ เสิร์ฟแล้ว'
                            : '⏳ รอคิวเข้าครัว'}
                        </span>
                      </div>

                      <div className="space-y-2.5 divide-y divide-slate-800/60">
                        {order.items?.map((item: any) => {
                          let parsedOptions: any[] = [];
                          if (item.selectedOptions) {
                            try {
                              parsedOptions = typeof item.selectedOptions === 'string' ? JSON.parse(item.selectedOptions) : item.selectedOptions;
                            } catch (e) {}
                          }

                          return (
                            <div key={item.id} className="pt-2 first:pt-0 flex justify-between items-start text-xs">
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-extrabold text-white">
                                    {item.name}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-orange-400 font-black text-[10px]">
                                    x{item.quantity}
                                  </span>
                                </div>

                                {parsedOptions.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {parsedOptions.map((opt: any, oIdx: number) => (
                                      <span
                                        key={oIdx}
                                        className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800/80 text-slate-300"
                                      >
                                        {opt.choice || opt.name}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {item.specialNote && (
                                  <span className="text-[11px] text-amber-400 block mt-0.5">💬 {item.specialNote}</span>
                                )}
                              </div>
                              <span className="font-black text-orange-400">฿{item.price * item.quantity}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* E-Receipt Link & Subtotal */}
                      <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          รวมออเดอร์นี้: <strong className="text-orange-400 font-extrabold text-xs">฿{order.totalAmount || order.items?.reduce((s: number, it: any) => s + (it.price * it.quantity), 0)}</strong>
                        </span>
                        <a
                          href={`/r/${slug}/receipt/${order.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[11px] font-bold transition-all active:scale-95"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>ดู E-Receipt</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Floating Cart Button */}
        {cart.length > 0 && activeTab === 'menu' && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-30 box-border pointer-events-none">
            <button
              onClick={() => setIsCartOpen(true)}
              className="w-full p-4 rounded-3xl bg-gradient-to-r from-orange-500 to-amber-500 hover:scale-[1.02] active:scale-95 text-white font-black text-sm shadow-2xl shadow-orange-500/40 flex items-center justify-between transition-all pointer-events-auto"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-white text-orange-600 flex items-center justify-center font-black text-xs shadow-md">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)}
                </div>
                <span>ดูตะกร้าสั่งอาหาร</span>
              </div>
              <div className="flex items-center space-x-1">
                <span>฿{cartTotalAmount.toLocaleString()}</span>
                <ChevronRight className="w-5 h-5" />
              </div>
            </button>
          </div>
        )}

        {/* Item Customizer Pop-up */}
        {selectedMenuItem && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-3xl max-w-sm w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-800 text-white max-h-[90vh] overflow-y-auto">
              {selectedMenuItem.imageUrl && (
                <div className="w-full h-40 rounded-2xl overflow-hidden relative border border-slate-800 bg-slate-950">
                  <img
                    src={formatImageUrl(selectedMenuItem.imageUrl)}
                    alt={selectedMenuItem.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-black text-base text-white">{selectedMenuItem.name}</h3>
                  <span className="text-xs font-bold text-orange-400">เริ่มต้น ฿{selectedMenuItem.basePrice}</span>
                </div>
                <button onClick={() => setSelectedMenuItem(null)} className="text-slate-400 hover:text-white p-1">
                  ✕
                </button>
              </div>

              {selectedMenuItem.options?.map((group: any) => (
                <div key={group.id} className="space-y-2">
                  <span className="text-xs font-bold text-slate-300">{group.title}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {group.choices?.map((choice: any) => {
                      const isSelected = selectedOptions[group.title]?.some((c) => c.name === choice.name);
                      return (
                        <button
                          key={choice.id}
                          type="button"
                          onClick={() => {
                            if (group.isMulti) {
                              const current = selectedOptions[group.title] || [];
                              if (isSelected) {
                                setSelectedOptions({
                                  ...selectedOptions,
                                  [group.title]: current.filter((c) => c.name !== choice.name),
                                });
                              } else {
                                setSelectedOptions({
                                  ...selectedOptions,
                                  [group.title]: [...current, choice],
                                });
                              }
                            } else {
                              setSelectedOptions({
                                ...selectedOptions,
                                [group.title]: [choice],
                              });
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                            isSelected
                              ? 'bg-orange-500 border-orange-500 text-white shadow-md'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {choice.name} {choice.extraPrice > 0 && `(+฿${choice.extraPrice})`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Quick Note Tags */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 block">หมายเหตุยอดนิยม (แตะเพื่อเลือก):</span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_NOTES.map((tag) => {
                    const active = specialNote.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleQuickNote(tag)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                          active
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                            : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {tag} {active && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">หมายเหตุเพิ่มเติม</label>
                <input
                  type="text"
                  placeholder="พิมพ์ข้อความ เช่น เผ็ดน้อย, ไม่ใส่กระเทียม"
                  value={specialNote}
                  onChange={(e) => setSpecialNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* AI Smart Upsell Suggestions in Item Modal */}
              {modalUpsellItems.length > 0 && (
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-400">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    <span>สั่งคู่กันอร่อยยิ่งขึ้น (AI แนะนำ)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {modalUpsellItems.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-2 rounded-2xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-between gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                            {rec.badge}
                          </span>
                          <div className="text-xs font-black text-white truncate mt-0.5">{rec.name}</div>
                          <div className="text-[10px] text-orange-400 font-bold">+฿{rec.price}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddUpsellToCart(rec.item)}
                          className="px-2.5 py-1 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-[10px] font-black shrink-0 transition-all cursor-pointer shadow-xs"
                        >
                          + เพิ่ม
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <div className="flex items-center space-x-2 bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setDishQuantity(Math.max(1, dishQuantity - 1))}
                    className="w-8 h-8 rounded-lg bg-slate-700 font-black text-sm text-white"
                  >
                    -
                  </button>
                  <span className="font-extrabold text-sm px-2 text-white">{dishQuantity}</span>
                  <button
                    type="button"
                    onClick={() => setDishQuantity(dishQuantity + 1)}
                    className="w-8 h-8 rounded-lg bg-slate-700 font-black text-sm text-white"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:scale-105 text-white font-extrabold text-xs shadow-lg shadow-orange-500/25 transition-all"
                >
                  เพิ่มลงตะกร้า (฿{calculateCustomizedPrice()})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cart Drawer */}
        {isCartOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end justify-center">
            <div className="bg-slate-900 rounded-t-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border-t border-slate-800 max-h-[85vh] flex flex-col text-white">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-black text-base text-white">ตะกร้าอาหาร (โต๊ะ {tableId})</h3>
                <button onClick={() => setIsCartOpen(false)} className="text-slate-400 hover:text-white p-1">
                  ✕
                </button>
              </div>

              {/* Collaborative Live Table Cart Indicator */}
              <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold text-[11px]">
                  <Users className="w-3.5 h-3.5" />
                  <span>ตะกร้าร่วมโต๊ะ {tableId}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-bold">ซิงค์เรียลไทม์กับเพื่อนทุกคน</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 divide-y divide-slate-800">
                {cart.map((item, idx) => (
                  <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block">{item.name} x {item.quantity}</span>
                      <span className="text-[11px] text-orange-400 font-bold">฿{item.price * item.quantity}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveCartItem(idx)}
                      className="text-rose-400 hover:text-rose-300 p-1 text-xs font-bold cursor-pointer"
                    >
                      ลบ
                    </button>
                  </div>
                ))}
              </div>

              {/* Cart AI Smart Upselling Suggestions */}
              {cartUpsellItems.length > 0 && (
                <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-400">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    <span>สั่งเพิ่มคู่กันไหมครับ? (AI แนะนำ)</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {cartUpsellItems.map((rec) => (
                      <div
                        key={rec.id}
                        className="min-w-[135px] max-w-[145px] p-2.5 rounded-xl bg-slate-900 border border-slate-700/80 flex flex-col justify-between shrink-0"
                      >
                        <div>
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                            {rec.badge}
                          </span>
                          <div className="text-[11px] font-black text-white truncate mt-1">{rec.name}</div>
                          <div className="text-[10px] text-orange-400 font-bold">฿{rec.price}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddUpsellToCart(rec.item)}
                          className="mt-2 w-full py-1 rounded-lg bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-[10px] font-black transition-all cursor-pointer text-center shadow-xs"
                        >
                          + เพิ่ม ฿{rec.price}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div className="flex justify-between font-black text-base text-white">
                  <span>รวมสุทธิ:</span>
                  <span className="text-orange-400">฿{cartTotalAmount.toLocaleString()}</span>
                </div>

                <button
                  disabled={isSubmittingOrder}
                  onClick={handleSendOrderToKitchen}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:scale-105 text-white font-black text-sm shadow-xl shadow-orange-500/30 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingOrder ? 'กำลังส่งเข้าครัว...' : 'ยืนยันส่งออเดอร์เข้าครัว 🍳'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment & Bill Checkout Modal (PromptPay & Cash options) */}
        {isPayModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-800 text-center text-white">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="font-black text-base text-white">เช็คบิลชำระเงิน (โต๊ะ {tableId})</h3>
                <button onClick={() => setIsPayModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                  ✕
                </button>
              </div>

              {/* Total Summary */}
              <div className="p-3.5 bg-orange-500/10 rounded-2xl border border-orange-500/20">
                <span className="text-xs font-bold text-orange-300 block">ยอดสุทธิที่ต้องชำระ:</span>
                {selectedReward && rewardMilestoneDiscount > 0 && (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-bold my-1">
                    <span>แลกส่วนลด ({selectedReward.title}):</span>
                    <span>-฿{rewardMilestoneDiscount}</span>
                  </div>
                )}
                <span className="text-3xl font-black text-orange-400">฿{totalAmountToPay.toLocaleString()}</span>
              </div>

              {/* Member Phone & Customer Name for Points Accumulation */}
              <div className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-2 text-left">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-orange-400" />
                        เบอร์สะสมแต้ม
                      </span>
                      {isMemberLoading && <Loader2 className="w-3 h-3 animate-spin text-orange-400" />}
                    </label>
                    <input
                      type="tel"
                      placeholder="เช่น 0899998888"
                      value={memberPhone}
                      onChange={(e) => handleMemberLookup(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                      <User className="w-3 h-3 text-orange-400" />
                      ชื่อลูกค้า
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น คุณสมศรี"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Member Status Card */}
                {memberData ? (
                  <div className="p-2.5 rounded-xl bg-gradient-to-r from-orange-500/15 to-amber-500/15 border border-orange-500/30 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-black text-white flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                          <span>สมาชิก: <span className="text-orange-400">{memberData.name || 'คุณลูกค้า'}</span></span>
                        </div>
                        <div className="text-[10px] text-slate-300">
                          ชำระบิลนี้จะได้รับเพิ่ม <strong className="text-emerald-400 font-black">+{Math.floor(totalAmountToPay / (store?.pointsRate || 25))} แต้ม</strong>
                        </div>
                      </div>
                      <span className="text-xs font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/30">
                        ⭐ {memberData.points} แต้ม
                      </span>
                    </div>

                    {/* Reward Milestones in Payment Modal */}
                    {memberRewards.length > 0 && (
                      <div className="pt-2 border-t border-slate-800 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <Award className="w-3 h-3 text-orange-400" />
                          ของรางวัลแลกแต้ม / ส่วนลด:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {memberRewards.map((r) => {
                            const isEnough = memberData && memberData.points >= r.pointsRequired;
                            const isSelected = selectedReward?.id === r.id;
                            return (
                              <button
                                key={r.id}
                                type="button"
                                disabled={!isEnough}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedReward(null);
                                  } else {
                                    setSelectedReward(r);
                                  }
                                }}
                                className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1 ${
                                  isSelected
                                    ? 'bg-orange-500 text-white shadow-md ring-1 ring-white/50'
                                    : isEnough
                                    ? 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 border border-orange-500/40'
                                    : 'bg-slate-900 text-slate-600 border border-slate-800 opacity-50 cursor-not-allowed'
                                }`}
                              >
                                <span>🎁 {r.title} ({r.pointsRequired} แต้ม)</span>
                                {isSelected && <Check className="w-3 h-3" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : memberPhone.replace(/\D/g, '').length >= 9 ? (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs flex items-center justify-between text-emerald-300 font-bold">
                    <span>✨ ลูกค้าใหม่: จะบันทึกชื่อ &amp; สะสมแต้มหลังชำระเงิน</span>
                    <span className="text-emerald-400 font-black">+{Math.floor(totalAmountToPay / (store?.pointsRate || 25))} แต้ม</span>
                  </div>
                ) : null}
              </div>

              {/* Payment Method Selector */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPayMethod('PROMPTPAY')}
                  className={`py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 ${
                    payMethod === 'PROMPTPAY'
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>สแกนพร้อมเพย์</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPayMethod('CASH')}
                  className={`py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 ${
                    payMethod === 'CASH'
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>จ่ายเงินสด</span>
                </button>
              </div>

              {payMethod === 'PROMPTPAY' ? (
                /* PromptPay Option */
                promptPayQr ? (
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center space-y-2">
                    <div className="p-3 bg-white rounded-2xl shadow-md">
                      <QRCodeSVG value={promptPayQr} size={170} />
                    </div>
                    <span className="text-xs font-bold text-slate-300">
                      พร้อมเพย์: {store?.promptPayId} ({store?.promptPayName})
                    </span>
                    {/* Hidden file input for customer slip */}
                    <input
                      type="file"
                      accept="image/*"
                      id="customer-slip-upload-input"
                      className="hidden"
                      onChange={handleCustomerSlipUpload}
                    />

                    {/* Slip Status or Upload Button */}
                    {customerSlipSubmitted ? (
                      <div className="w-full p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-center space-x-2">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>{customerSlipMessage || 'แนบสลิปเรียบร้อยแล้ว'}</span>
                      </div>
                    ) : (
                      <div className="w-full space-y-2.5 pt-1">
                        {/* Option 1: Direct Web Notification Button */}
                        <button
                          type="button"
                          disabled={isCustomerNotifyingTransfer || isCustomerUploadingSlip}
                          onClick={handleCustomerNotifyTransfer}
                          className={`w-full py-3 px-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 transition-all active:scale-95 ${
                            isCustomerNotifyingTransfer ? 'opacity-50 pointer-events-none' : ''
                          }`}
                        >
                          {isCustomerNotifyingTransfer ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin text-white" />
                              <span>กำลังส่งสัญญาณแจ้งเตือน...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4 text-white" />
                              <span>✅ ฉันโอนเงินเรียบร้อยแล้ว (แจ้งแคชเชียร์)</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center my-1">
                          <div className="flex-1 border-t border-slate-800"></div>
                          <span className="px-2 text-[10px] text-slate-500 font-semibold">หรือมีสลิปแนบรูปได้</span>
                          <div className="flex-1 border-t border-slate-800"></div>
                        </div>

                        {/* Option 2: Upload Slip */}
                        <label
                          htmlFor="customer-slip-upload-input"
                          className={`w-full py-2.5 px-3 rounded-xl border border-dashed border-orange-400/60 bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 font-extrabold text-xs flex items-center justify-center space-x-2 cursor-pointer transition-all ${
                            isCustomerUploadingSlip || isCustomerNotifyingTransfer ? 'opacity-50 pointer-events-none' : ''
                          }`}
                        >
                          {isCustomerUploadingSlip ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin text-orange-400" />
                              <span>กำลังตรวจสอบสลิป...</span>
                            </>
                          ) : (
                            <>
                              <Camera className="w-4 h-4 text-orange-400" />
                              <span>📷 แนบรูปสลิปโอนเงิน (ตรวจอัตโนมัติ)</span>
                            </>
                          )}
                        </label>

                        {customerSlipError && (
                          <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] font-bold text-left flex items-start space-x-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                            <span>{customerSlipError}</span>
                          </div>
                        )}

                        <p className="text-[10px] text-slate-400">
                          เมื่อโอนเงินแล้ว กดปุ่มแจ้งแคชเชียร์ได้ทันที ระบบจะส่งเสียงเตือนที่หน้าเคาน์เตอร์
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-rose-400">ร้านยังไม่ได้ตั้งค่าพร้อมเพย์</p>
                )
              ) : (
                /* Cash Option */
                <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                  <Banknote className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                  <div>
                    <h4 className="font-extrabold text-sm text-white">ชำระด้วยเงินสด</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      กรุณาเรียกพนักงาน หรือนำยอด <strong className="text-orange-400 font-bold">฿{totalAmountToPay}</strong> ไปชำระที่เคาน์เตอร์แคชเชียร์
                    </p>
                  </div>

                  {!isCashCalled ? (
                    <button
                      type="button"
                      onClick={handleCallStaffCash}
                      className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-md shadow-emerald-500/25 transition-all"
                    >
                      🔔 กดเรียกพนักงานมาเก็บเงินสดที่โต๊ะ
                    </button>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 flex items-center justify-center space-x-1.5">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>แจ้งพนักงานแล้ว พนักงานกำลังเดินไปที่โต๊ะครับ</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Service Call Bell Modal */}
        {isServiceModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
                    <BellRing className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">เรียกพนักงาน (โต๊ะ {tableId})</h3>
                    <p className="text-[11px] text-slate-400">เลือกบริการที่ต้องการ พนักงานจะได้รับแจ้งเตือนทันที</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsServiceModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {serviceCallSuccess ? (
                <div className="p-6 text-center space-y-2 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl animate-in zoom-in-95 duration-200">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto animate-bounce" />
                  <h4 className="font-black text-sm text-emerald-300">แจ้งพนักงานเรียบร้อยแล้ว</h4>
                  <p className="text-xs text-slate-300">{serviceCallSuccess} • กำลังมาให้บริการครับ</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {(
                    (Array.isArray(store?.serviceCallItems) && store.serviceCallItems.length > 0
                      ? store.serviceCallItems.filter((i: any) => i.active !== false)
                      : [
                          { icon: '🌶️', label: 'ขอน้ำปลาพริก / พริกน้ำส้ม / เครื่องปรุง' },
                          { icon: '🧊', label: 'ขอเติมน้ำแข็ง / น้ำดื่ม' },
                          { icon: '🥢', label: 'ขอช้อนส้อม / ตะเกียบ / จานแบ่ง' },
                          { icon: '🧻', label: 'ขอกระดาษทิชชู่' },
                          { icon: '💵', label: 'เรียกเช็คบิล (ชำระด้วยเงินสด)' },
                          { icon: '❓', label: 'สอบถามพนักงาน / ความช่วยเหลืออื่นๆ' },
                        ]
                    )
                  ).map((srv: any, idx: number) => (
                    <button
                      key={srv.id || idx}
                      disabled={isCallingService}
                      onClick={() => handleSendServiceCall(srv.label)}
                      className="w-full p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:scale-[0.98] border border-slate-700/60 text-left flex items-center space-x-3 transition-all text-xs font-bold text-slate-200 group"
                    >
                      <span className="text-lg flex-shrink-0 group-hover:scale-110 transition-transform">{srv.icon}</span>
                      <span className="flex-1">{srv.label}</span>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
