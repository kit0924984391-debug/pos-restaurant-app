'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Phone,
  User,
  Loader2,
  Sparkles,
  Award,
  Tag,
  Percent,
  X,
  Check,
  QrCode,
  Banknote,
  Camera,
  MessageSquare,
  ShieldCheck,
  RefreshCw,
  Eye,
  AlertCircle,
  CheckCircle2,
  CheckCircle,
  Volume2,
  FileCheck,
  Clipboard,
  Printer,
} from 'lucide-react';
import { generatePromptPayPayload } from '@/lib/promptpay';
import { scanSlipQrClient } from '@/lib/slip-scanner-client';
import { parseBankNotificationText } from '@/lib/bank-message-parser';
import {
  playSuccessChime,
  speakMoneyReceived,
  speakSlipVerified,
  speakSlipReadSuccess,
  speakSlipDuplicate,
  speakSlipAmountMismatch,
  speakSlipReceiverMismatch,
  speakSlipNoQr,
  speakThaiVoice,
  speakPaymentConfirmed,
  playButtonTapSound,
} from '@/lib/sound';
import { useToast } from '@/context/ToastContext';

export interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTable: any;
  store: any;
  slug: string;
  voiceEnabled: boolean;
  onPaidSuccess: () => void;
  onPrintReceipt: (receiptData: any) => void;
  onPreCheckPrint: (receiptData: any) => void;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  selectedTable,
  store,
  slug,
  voiceEnabled,
  onPaidSuccess,
  onPrintReceipt,
  onPreCheckPrint,
}: CheckoutModalProps) {
  const { showSuccess, showError, showInfo } = useToast();

  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'PROMPTPAY'>('PROMPTPAY');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [isProcessingPay, setIsProcessingPay] = useState(false);

  // Enterprise Loyalty & Promo Checkout States
  const [discountTab, setDiscountTab] = useState<'NONE' | 'LOYALTY' | 'PROMO' | 'CUSTOM'>('NONE');
  const [customDiscountType, setCustomDiscountType] = useState<'FIXED' | 'PERCENT'>('FIXED');
  const [customDiscountValue, setCustomDiscountValue] = useState<string>('');
  const [availablePromotions, setAvailablePromotions] = useState<any[]>([]);
  const [memberPhone, setMemberPhone] = useState('');
  const [customerNameInput, setCustomerNameInput] = useState<string>('');
  const [memberData, setMemberData] = useState<any>(null);
  const [memberRewards, setMemberRewards] = useState<any[]>([]);
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [isLookingUpMember, setIsLookingUpMember] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);

  // Bank Slip Reader States
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [slipQrPayload, setSlipQrPayload] = useState<string | null>(null);
  const [isVerifyingSlip, setIsVerifyingSlip] = useState(false);
  const [slipResult, setSlipResult] = useState<any | null>(null);
  const [autoCheckoutEnabled, setAutoCheckoutEnabled] = useState<boolean>(false);
  const [isManualConfirming, setIsManualConfirming] = useState(false);
  const [previewSlipModalOpen, setPreviewSlipModalOpen] = useState(false);
  const [promptPayVerifyMode, setPromptPayVerifyMode] = useState<'SLIP' | 'TEXT'>('SLIP');
  const [bankNotificationInput, setBankNotificationInput] = useState('');
  const [isProcessingBankText, setIsProcessingBankText] = useState(false);

  // Fetch promotions on mount/slug change
  useEffect(() => {
    if (slug) {
      fetch(`/api/r/${slug}/promotions`)
        .then((r) => r.json())
        .then((data) => {
          if (data.promotions) setAvailablePromotions(data.promotions);
        })
        .catch(() => {});
    }
  }, [slug]);

  // Pre-fill existing data when selectedTable changes or modal opens
  useEffect(() => {
    if (!isOpen || !selectedTable) return;

    if (selectedTable.hasPendingSlip && selectedTable.latestSlipUrl) {
      setSlipPreview(selectedTable.latestSlipUrl);
      const slipOrder = selectedTable.activeOrders?.find((o: any) => o.slipUrl);
      if (slipOrder?.slipRawData) {
        try {
          const parsed = JSON.parse(slipOrder.slipRawData);
          setSlipResult({ parsed, success: true });
        } catch (e) {}
      }
      setPaymentMethod('PROMPTPAY');
    } else {
      setSlipPreview(null);
      setSlipQrPayload(null);
      setSlipResult(null);
    }

    const existingPhone = selectedTable.activeOrders?.find((o: any) => o.memberPhone)?.memberPhone;
    const existingName = selectedTable.activeOrders?.find((o: any) => o.customerName)?.customerName;
    const isNameActuallyPhone = existingName && /^\d{9,10}$/.test(existingName.replace(/\D/g, ''));

    if (existingPhone) {
      handleLookupMember(existingPhone);
      if (existingName && !/^\d{9,10}$/.test(existingName.replace(/\D/g, ''))) {
        setCustomerNameInput(existingName);
      }
    } else if (isNameActuallyPhone) {
      const detectedPhone = existingName.trim();
      setMemberPhone(detectedPhone);
      setCustomerNameInput('');
      handleLookupMember(detectedPhone);
    } else {
      setMemberPhone('');
      setMemberData(null);
      setMemberRewards([]);
      setIsNewCustomer(false);
      setIsLookingUpMember(false);
      setCustomerNameInput(existingName || '');
    }
  }, [isOpen, selectedTable]);

  // Handle Switch Discount Tab
  const handleSwitchDiscountTab = (tab: 'NONE' | 'LOYALTY' | 'PROMO' | 'CUSTOM') => {
    setDiscountTab(tab);
    if (tab === 'NONE') {
      setSelectedReward(null);
      setPointsToRedeem(0);
      setAppliedPromo(null);
      setCustomDiscountValue('');
    } else if (tab === 'LOYALTY') {
      setAppliedPromo(null);
      setCustomDiscountValue('');
    } else if (tab === 'PROMO') {
      setSelectedReward(null);
      setPointsToRedeem(0);
      setCustomDiscountValue('');
    } else if (tab === 'CUSTOM') {
      setSelectedReward(null);
      setPointsToRedeem(0);
      setAppliedPromo(null);
    }
  };

  // Handle Member Lookup
  const handleLookupMember = async (phone: string) => {
    setMemberPhone(phone);
    setSelectedReward(null);
    const clean = phone.replace(/\D/g, '');
    if (clean.length >= 9) {
      setIsLookingUpMember(true);
      try {
        const res = await fetch(`/api/r/${slug}/members?phone=${clean}`);
        const data = await res.json();
        if (data.member) {
          setMemberData(data.member);
          setMemberRewards(data.rewards || []);
          setIsNewCustomer(false);
          if (data.member.name) {
            setCustomerNameInput(data.member.name);
          }
          showInfo(`พบข้อมูลสมาชิก ⭐`, `คุณ ${data.member.name || phone} (แต้มคงเหลือ: ${data.member.points} แต้ม)`);
        } else {
          setMemberData(null);
          setMemberRewards(data.rewards || []);
          setIsNewCustomer(true);
          setCustomerNameInput('');
        }
      } catch (e) {
        setMemberData(null);
        setMemberRewards([]);
        setIsNewCustomer(true);
      } finally {
        setIsLookingUpMember(false);
      }
    } else {
      setMemberData(null);
      setMemberRewards([]);
      setPointsToRedeem(0);
      setSelectedReward(null);
      setIsNewCustomer(false);
      setIsLookingUpMember(false);
    }
  };

  // Payment Calculations
  const activeOrders = selectedTable?.activeOrders || [];
  const rawTotalAmount = activeOrders.reduce((sum: number, o: any) => sum + (o.netAmount ?? o.totalAmount ?? 0), 0);

  let calculatedDiscount = 0;
  if (discountTab === 'LOYALTY') {
    if (selectedReward && selectedReward.rewardType === 'DISCOUNT') {
      calculatedDiscount = selectedReward.discountAmount;
    } else if (pointsToRedeem > 0) {
      calculatedDiscount = pointsToRedeem * (store?.pointValue || 1);
    }
  } else if (discountTab === 'PROMO') {
    calculatedDiscount = appliedPromo?.calculatedDiscount || 0;
  } else if (discountTab === 'CUSTOM') {
    const val = parseFloat(customDiscountValue) || 0;
    if (customDiscountType === 'PERCENT') {
      calculatedDiscount = Math.round((rawTotalAmount * Math.min(100, val)) / 100);
    } else {
      calculatedDiscount = Math.min(rawTotalAmount, val);
    }
  }

  const totalCombinedDiscount = Math.min(rawTotalAmount, calculatedDiscount);
  const finalNetAmount = Math.max(0, rawTotalAmount - totalCombinedDiscount);

  const change =
    paymentMethod === 'CASH' && cashReceived
      ? parseFloat(cashReceived) - finalNetAmount
      : 0;

  // Handle Promo Code Apply
  const handleApplyPromo = async (codeOverride?: string) => {
    const code = codeOverride || promoCodeInput;
    if (!code) return;
    try {
      const res = await fetch(`/api/r/${slug}/promotions?code=${code}&amount=${rawTotalAmount}`);
      const data = await res.json();
      if (data.valid) {
        setAppliedPromo(data.promo);
        setPromoCodeInput(code.toUpperCase());
        showSuccess('ใช้คูปองส่วนลดแล้ว 🎉', `รับส่วนลด ฿${data.promo.calculatedDiscount}`);
      } else {
        showError('โค้ดส่วนลดไม่ถูกต้อง', data.error || 'กรุณาตรวจสอบเงื่อนไข');
      }
    } catch (e) {
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถตรวจสอบโค้ดได้');
    }
  };

  // Handle Print Bill From Checkout (Instant Zero Delay Action)
  const handlePrintBillFromCheckout = () => {
    if (!selectedTable) return;
    playButtonTapSound('pop');
    onPreCheckPrint({
      storeName: store?.storeName || store?.name || 'ร้านอาหารตามสั่ง',
      promptPayName: store?.promptPayName || '',
      promptPayId: store?.promptPayId || '',
      phone: store?.phone || '',
      address: store?.address || '',
      receiptFooter: store?.receiptFooter || '',
      tableId: selectedTable.tableNo || selectedTable.id,
      tableName: selectedTable.name,
      orders: activeOrders,
      items: activeOrders.flatMap((o: any) => o.items || []),
      totalAmount: rawTotalAmount,
      discountAmount: totalCombinedDiscount,
      netAmount: finalNetAmount,
      paymentMethod: paymentMethod,
      cashReceived: paymentMethod === 'CASH' && cashReceived ? parseFloat(cashReceived) || null : null,
      changeAmount: paymentMethod === 'CASH' ? Math.max(0, change) : 0,
      isPreCheck: true,
      customerName: customerNameInput.trim() || memberData?.name || '',
      memberPhone: memberPhone ? memberPhone.replace(/\D/g, '') : '',
      memberPoints: memberData?.points,
      pointsEarned: memberPhone ? Math.floor(finalNetAmount / (store?.pointsRate || 25)) : 0,
      orderId: activeOrders[0]?.id || `BILL-${selectedTable.tableNo || selectedTable.id}-${Date.now().toString().slice(-4)}`,
      paidAt: new Date().toISOString(),
      autoPrint: true,
    });
  };

  // Handle Process Payment (Instant Zero-Delay Optimistic Execution)
  const handleProcessPayment = () => {
    if (isProcessingPay || !selectedTable || activeOrders.length === 0) return;
    setIsProcessingPay(true);

    // 1. ปุ่มมี action ทันที & ส่งเสียงแจ้งเตือนภาษาไทย "ยืนยันชำระเงิน โต๊ะ X" และเสียง Chime แบบ 0ms
    playButtonTapSound('success');
    if (voiceEnabled !== false) {
      speakPaymentConfirmed(selectedTable.name || selectedTable.tableNo);
    }
    playSuccessChime();

    // 2. จัดเตรียม Snapshot ข้อมูลใบเสร็จ
    const receiptData = {
      storeName: store?.storeName || store?.name || 'ร้านอาหารตามสั่ง',
      promptPayName: store?.promptPayName || '',
      promptPayId: store?.promptPayId || '',
      phone: store?.phone || '',
      address: store?.address || '',
      receiptFooter: store?.receiptFooter || '',
      tableId: selectedTable.id || selectedTable.tableNo,
      tableName: selectedTable.name,
      orders: activeOrders,
      items: activeOrders.flatMap((o: any) => o.items || []),
      totalAmount: rawTotalAmount,
      discountAmount: totalCombinedDiscount,
      netAmount: finalNetAmount,
      paymentMethod,
      cashReceived: paymentMethod === 'CASH' ? parseFloat(cashReceived) : null,
      changeAmount: paymentMethod === 'CASH' ? Math.max(0, change) : 0,
      paidAt: new Date().toISOString(),
      customerName: customerNameInput.trim() || memberData?.name || '',
      memberPhone: memberPhone ? memberPhone.replace(/\D/g, '') : '',
      memberPoints: memberData?.points,
      pointsEarned: memberPhone ? Math.floor(finalNetAmount / (store?.pointsRate || 25)) : 0,
      orderId: activeOrders[0]?.id || `REC-${selectedTable.tableNo || selectedTable.id}-${Date.now().toString().slice(-4)}`,
      isPreCheck: false,
      autoPrint: true,
    };

    // 3. ปิดหน้าต่างทันทีและเคลียร์โต๊ะโดยไม่ต้องรอเซิร์ฟเวอร์ (Zero Delay Optimistic UI)
    showSuccess('ชำระเงินสำเร็จ 💰', `${selectedTable.name} • ยอดรับเงิน ฿${finalNetAmount}`);
    onClose();
    onPaidSuccess();
    onPrintReceipt(receiptData);

    // 4. Background Sync: ยิงส่งข้อมูลไปยังเซิร์ฟเวอร์แบบขนาน (Promise.all) ไม่บล็อก UI พร้อม Idempotency-Key
    const paymentBatchId = `pos_pay_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const orderPayPromises = [];
    let remainingDiscount = totalCombinedDiscount;
    for (let i = 0; i < activeOrders.length; i++) {
      const order = activeOrders[i];
      const isFirst = i === 0;
      const currentOrderAmount = order.netAmount ?? order.totalAmount ?? 0;
      const orderDiscount = Math.min(currentOrderAmount, remainingDiscount);
      remainingDiscount -= orderDiscount;

      const orderIdemKey = `${paymentBatchId}_${order.id}`;
      orderPayPromises.push(
        fetch(`/api/r/${slug}/orders/${order.id}/pay`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': orderIdemKey,
          },
          body: JSON.stringify({
            clientRequestId: orderIdemKey,
            paymentMethod,
            cashReceived: paymentMethod === 'CASH' && isFirst ? parseFloat(cashReceived) : null,
            changeAmount: paymentMethod === 'CASH' && isFirst ? Math.max(0, change) : 0,
            memberPhone: memberPhone || null,
            customerName: customerNameInput.trim() || undefined,
            pointsRedeemed: isFirst && discountTab === 'LOYALTY' ? pointsToRedeem || 0 : 0,
            promoCode: isFirst && discountTab === 'PROMO' ? appliedPromo?.code || null : null,
            discountAmount: orderDiscount,
            skipVisitIncrement: !isFirst,
          }),
        })
      );
    }

    Promise.all(orderPayPromises)
      .catch((err: any) => {
        console.error('[POS Payment Background Error]:', err);
        showError('เกิดข้อผิดพลาดในการบันทึกข้อมูลการชำระเงิน', err.message);
      })
      .finally(() => {
        setIsProcessingPay(false);
      });
  };

  // Generate PromptPay QR Payload for Checkout
  const promptPayQrPayload = useMemo(() => {
    if (!store?.promptPayId || finalNetAmount <= 0) return '';
    return generatePromptPayPayload(store.promptPayId, finalNetAmount);
  }, [store?.promptPayId, finalNetAmount]);

  // Handle Bank Slip Selection & Verification
  const handleSelectSlipFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsVerifyingSlip(true);
    setSlipResult(null);
    try {
      const scan = await scanSlipQrClient(file);
      setSlipPreview(scan.compressedBase64);
      setSlipQrPayload(scan.qrText);

      const activeOrder = activeOrders[0];
      if (!activeOrder) {
        showError('ไม่พบออเดอร์สำหรับตรวจสอบสลิป');
        return;
      }

      const res = await fetch(`/api/r/${slug}/orders/verify-slip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: activeOrder.id,
          qrPayload: scan.qrText,
          slipImage: scan.compressedBase64,
          manualConfirm: false,
          autoCheckout: autoCheckoutEnabled,
          discountAmount: totalCombinedDiscount,
          memberPhone: memberPhone || null,
          customerName: customerNameInput.trim() || undefined,
          pointsRedeemed: discountTab === 'LOYALTY' ? pointsToRedeem || 0 : 0,
          promoCode: discountTab === 'PROMO' ? appliedPromo?.code || null : null,
        }),
      });
      const data = await res.json();
      setSlipResult(data);

      if (data.isPaid) {
        playSuccessChime();
        if (voiceEnabled) {
          speakSlipVerified(finalNetAmount, selectedTable.name);
        }
        showSuccess('สลิปถูกต้อง และปิดบิลสำเร็จเรียบร้อย! 🎉', `${selectedTable.name} • ฿${finalNetAmount}`);

        onPrintReceipt({
          storeName: store?.storeName || store?.name || 'ร้านอาหารตามสั่ง',
          promptPayName: store?.promptPayName || '',
          phone: store?.phone || '',
          address: store?.address || '',
          receiptFooter: store?.receiptFooter || '',
          tableId: selectedTable.id || selectedTable.tableNo,
          tableName: selectedTable.name,
          orders: activeOrders,
          totalAmount: rawTotalAmount,
          discountAmount: totalCombinedDiscount,
          netAmount: finalNetAmount,
          paymentMethod: 'PROMPTPAY',
          cashReceived: null,
          changeAmount: 0,
          paidAt: new Date().toISOString(),
        });

        onClose();
        onPaidSuccess();
      } else if (data.isDuplicate) {
        if (voiceEnabled) speakSlipDuplicate();
        showError('สลิปนี้เคยถูกใช้งานแล้ว ⚠️', data.error);
      } else if (data.isAmountMismatch) {
        if (voiceEnabled) speakSlipAmountMismatch(data.slipAmount, data.netAmount || finalNetAmount);
        showError('ยอดเงินในสลิปไม่ตรงกับยอดบิล ⚠️', data.error);
      } else if (data.isReceiverMismatch) {
        if (voiceEnabled) speakSlipReceiverMismatch();
        showError('บัญชีผู้รับเงินไม่ตรง ⚠️', data.error);
      } else if (data.parsed?.isValid) {
        if (voiceEnabled) speakSlipReadSuccess(data.parsed.amount || finalNetAmount, selectedTable.name);
        showSuccess('อ่านสลิปสำเร็จ ตรวจสอบยอดเงินตรง ✅', 'สามารถกดปุ่ม "บันทึกมือ" เพื่อยืนยันปิดบิล');
      } else {
        if (voiceEnabled) speakSlipNoQr();
        showInfo('แนบรูปสลิปแล้ว (ไม่พบ Mini-QR บนรูป)', 'กรุณาตรวจทานด้วยสายตา แล้วกดปุ่ม "บันทึกมือ"');
      }
    } catch (err: any) {
      console.error(err);
      showError('ไม่สามารถตรวจสอบสลิปได้', err.message);
    } finally {
      setIsVerifyingSlip(false);
    }
  };

  // Handle Manual Confirm with Slip
  const handleManualConfirmSlip = async () => {
    const activeOrder = activeOrders[0];
    if (!activeOrder) return;

    // ประกาศเสียง "ยืนยันชำระเงิน โต๊ะ X" ทันทีที่กดปุ่ม โดยไม่มีการหน่วงเวลา
    if (voiceEnabled !== false) {
      speakPaymentConfirmed(selectedTable.name || selectedTable.tableNo);
    }

    setIsManualConfirming(true);
    try {
      const res = await fetch(`/api/r/${slug}/orders/verify-slip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: activeOrder.id,
          qrPayload: slipQrPayload,
          slipImage: slipPreview,
          manualConfirm: true,
          discountAmount: totalCombinedDiscount,
          memberPhone: memberPhone || null,
          customerName: customerNameInput.trim() || undefined,
          pointsRedeemed: discountTab === 'LOYALTY' ? pointsToRedeem || 0 : 0,
          promoCode: discountTab === 'PROMO' ? appliedPromo?.code || null : null,
        }),
      });
      const data = await res.json();
      if (data.isPaid) {
        playSuccessChime();
        showSuccess('บันทึกปิดบิลด้วยสลิปสำเร็จแล้ว ✅', `${selectedTable.name} • ยอด ฿${finalNetAmount}`);

        onPrintReceipt({
          storeName: store?.storeName || store?.name || 'ร้านอาหารตามสั่ง',
          promptPayName: store?.promptPayName || '',
          phone: store?.phone || '',
          address: store?.address || '',
          receiptFooter: store?.receiptFooter || '',
          tableId: selectedTable.id || selectedTable.tableNo,
          tableName: selectedTable.name,
          orders: activeOrders,
          totalAmount: rawTotalAmount,
          discountAmount: totalCombinedDiscount,
          netAmount: finalNetAmount,
          paymentMethod: 'PROMPTPAY',
          cashReceived: null,
          changeAmount: 0,
          paidAt: new Date().toISOString(),
        });

        onClose();
        onPaidSuccess();
      } else {
        showError('ไม่สามารถปิดบิลได้', data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err: any) {
      showError('เกิดข้อผิดพลาด', err.message);
    } finally {
      setIsManualConfirming(false);
    }
  };

  // Live Parsed Result of Bank Notification Text
  const parsedBankText = useMemo(() => {
    return parseBankNotificationText(bankNotificationInput);
  }, [bankNotificationInput]);

  // Handle Process Payment from Bank Text Notification
  const handleProcessBankTextMessage = async () => {
    if (!selectedTable || activeOrders.length === 0) return;
    if (!parsedBankText.isValid || !parsedBankText.amount) {
      showError('ไม่พบยอดเงินเข้าที่ถูกต้องในข้อความ', parsedBankText.message);
      return;
    }

    if (Math.abs(parsedBankText.amount - finalNetAmount) >= 0.01) {
      const ok = window.confirm(
        `⚠️ ยอดเงินในข้อความ (฿${parsedBankText.amount.toLocaleString()}) ไม่ตรงกับยอดบิล (฿${finalNetAmount.toLocaleString()})\n\nคุณต้องการยืนยันปิดบิลด้วยยอดนี้หรือไม่?`
      );
      if (!ok) return;
    }

    // ประกาศเสียง "ยืนยันชำระเงิน โต๊ะ X" ทันทีที่กดปุ่ม โดยไม่มีการหน่วงเวลา
    if (voiceEnabled !== false) {
      speakPaymentConfirmed(selectedTable.name || selectedTable.tableNo);
    }

    setIsProcessingBankText(true);
    try {
      let remainingDiscount = totalCombinedDiscount;
      for (let i = 0; i < activeOrders.length; i++) {
        const order = activeOrders[i];
        const isFirst = i === 0;
        const currentOrderAmount = order.netAmount ?? order.totalAmount ?? 0;
        const orderDiscount = Math.min(currentOrderAmount, remainingDiscount);
        remainingDiscount -= orderDiscount;

        await fetch(`/api/r/${slug}/orders/${order.id}/pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentMethod: 'PROMPTPAY',
            memberPhone: memberPhone || null,
            pointsRedeemed: isFirst && discountTab === 'LOYALTY' ? pointsToRedeem || 0 : 0,
            promoCode: isFirst && discountTab === 'PROMO' ? appliedPromo?.code || null : null,
            discountAmount: orderDiscount,
            skipVisitIncrement: !isFirst,
            note: `${selectedTable.name} (ชำระผ่าน ${parsedBankText.bankName || parsedBankText.bank || 'ธนาคาร'})`,
          }),
        });
      }

      playSuccessChime();
      showSuccess(
        `ตัดยอดเงินเข้า ฿${parsedBankText.amount.toLocaleString()} สำเร็จ! 🎉`,
        `${selectedTable.name} • (${parsedBankText.bankName || parsedBankText.bank || 'ธนาคาร'})`
      );

      onPrintReceipt({
        storeName: store?.storeName || store?.name || 'ร้านอาหารตามสั่ง',
        promptPayName: store?.promptPayName || '',
        phone: store?.phone || '',
        address: store?.address || '',
        receiptFooter: store?.receiptFooter || '',
        tableId: selectedTable.id || selectedTable.tableNo,
        tableName: selectedTable.name,
        orders: activeOrders,
        totalAmount: rawTotalAmount,
        discountAmount: totalCombinedDiscount,
        netAmount: finalNetAmount,
        paymentMethod: 'PROMPTPAY',
        cashReceived: null,
        changeAmount: 0,
        paidAt: new Date().toISOString(),
      });

      onClose();
      onPaidSuccess();
    } catch (err: any) {
      console.error(err);
      showError('ไม่สามารถปิดบิลได้', err.message);
    } finally {
      setIsProcessingBankText(false);
    }
  };

  if (!isOpen || !selectedTable) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
          {/* Mobile Handle */}
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6 shrink-0">
            <div>
              <h3 className="font-black text-lg text-slate-900">เช็คบิล {selectedTable?.name}</h3>
              <p className="text-xs text-slate-400">เลือกวิธีชำระเงินและพิมพ์ใบเสร็จ</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
            {/* Member Phone & Customer Name for Points Accumulation */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-extrabold text-slate-700 mb-1.5 flex items-center justify-between h-5">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span>เบอร์โทรสะสมแต้ม</span>
                    </span>
                    {isLookingUpMember && (
                      <span className="flex items-center gap-1 text-[10px] text-orange-600 font-bold shrink-0">
                        <Loader2 className="w-3 h-3 animate-spin text-orange-500" />
                        <span>ค้นหา...</span>
                      </span>
                    )}
                  </label>
                  <input
                    type="tel"
                    placeholder="เช่น 0899998888"
                    value={memberPhone}
                    onChange={(e) => handleLookupMember(e.target.value)}
                    className="w-full h-11 sm:h-9 px-3 py-2 rounded-xl border border-slate-200 text-base sm:text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-extrabold text-slate-700 mb-1.5 flex items-center justify-between h-5">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span>ชื่อลูกค้า</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder={isNewCustomer ? 'พิมพ์ชื่อลูกค้าใหม่' : 'ชื่อลูกค้า (เช่น คุณสมศรี)'}
                    value={customerNameInput}
                    onChange={(e) => setCustomerNameInput(e.target.value)}
                    className={`w-full h-11 sm:h-9 px-3 py-2 rounded-xl border text-base sm:text-xs font-bold bg-white focus:outline-none focus:ring-2 transition-all ${
                      isNewCustomer
                        ? 'border-blue-300 ring-2 ring-blue-500/20 focus:ring-blue-500'
                        : memberData
                        ? 'border-emerald-300 focus:ring-emerald-500'
                        : 'border-slate-200 focus:ring-orange-500'
                    }`}
                  />
                </div>
              </div>

            {/* Member Status Card */}
            {memberData ? (
              <div className="p-3 rounded-2xl bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50/60 border border-orange-200 shadow-sm text-xs flex items-center justify-between gap-2 animate-in fade-in zoom-in-95 duration-150">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-emerald-800 font-extrabold bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1 shadow-xs shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      สมาชิกเดิม
                    </span>
                    <span className="font-black text-slate-900 text-xs truncate">
                      {memberData.name || 'คุณลูกค้า'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium shrink-0">
                      ({memberData.phone})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                    <span>บิลนี้ได้รับเพิ่ม:</span>
                    <strong className="text-emerald-700 font-black bg-emerald-100/90 px-2 py-0.5 rounded-md text-[11px]">
                      +{Math.floor(finalNetAmount / (store?.pointsRate || 25))} แต้ม
                    </strong>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-500 font-bold block mb-0.5">คะแนนสะสมคงเหลือ</span>
                  <span className="text-xs font-black text-orange-600 bg-white border border-orange-200 px-2.5 py-1 rounded-xl shadow-sm inline-block">
                    ⭐ {memberData.points?.toLocaleString() || 0} แต้ม
                  </span>
                </div>
              </div>
            ) : isNewCustomer || (memberPhone.replace(/\D/g, '').length >= 9 && !isLookingUpMember) ? (
              <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50/50 to-blue-50 border border-blue-200 text-xs flex items-center justify-between gap-2 text-blue-900 shadow-sm animate-in fade-in zoom-in-95 duration-150">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-blue-800 font-extrabold bg-blue-100/90 px-2 py-0.5 rounded-full border border-blue-300 flex items-center gap-1 shadow-xs shrink-0">
                      <Sparkles className="w-3 h-3 text-blue-600" />
                      ลูกค้าใหม่
                    </span>
                    <span className="text-xs font-bold text-slate-700 truncate">
                      {customerNameInput.trim() ? `คุณ${customerNameInput.trim()}` : '(ยังไม่ระบุชื่อ)'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    กรอกชื่อลูกค้าเพื่อเริ่มสะสมแต้ม • บิลนี้จะได้รับสะสมทันที
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-500 font-bold block mb-0.5">แต้มที่จะได้รับ</span>
                  <span className="text-xs font-black text-blue-700 bg-white border border-blue-200 px-2.5 py-1 rounded-xl shadow-sm inline-block">
                    +{Math.floor(finalNetAmount / (store?.pointsRate || 25))} แต้ม
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Segmented Discount / Promo / Loyalty Tabs */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                เลือกใช้สิทธิ์ส่วนลด / โปรโมชั่น:
              </span>
              {discountTab !== 'NONE' && (
                <button
                  type="button"
                  onClick={() => handleSwitchDiscountTab('NONE')}
                  className="text-[11px] font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                >
                  <X className="w-3 h-3" />
                  ไม่ใช้ส่วนลด
                </button>
              )}
            </div>

            {/* 3 Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/70 rounded-xl">
              <button
                type="button"
                onClick={() => handleSwitchDiscountTab('LOYALTY')}
                className={`py-2 px-2 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1 ${
                  discountTab === 'LOYALTY'
                    ? 'bg-white text-orange-600 shadow-sm border border-orange-200 ring-1 ring-orange-500/20'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>⭐ แต้มสะสม</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchDiscountTab('PROMO')}
                className={`py-2 px-2 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1 ${
                  discountTab === 'PROMO'
                    ? 'bg-white text-orange-600 shadow-sm border border-orange-200 ring-1 ring-orange-500/20'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>🏷️ คูปองโปร</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchDiscountTab('CUSTOM')}
                className={`py-2 px-2 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1 ${
                  discountTab === 'CUSTOM'
                    ? 'bg-white text-orange-600 shadow-sm border border-orange-200 ring-1 ring-orange-500/20'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Percent className="w-3.5 h-3.5" />
                <span>💵 ลดเอง</span>
              </button>
            </div>

            {/* TAB 1: LOYALTY */}
            {discountTab === 'LOYALTY' && (
              <div className="space-y-2.5 pt-1 border-t border-slate-200/60 animate-fade-in">
                {!memberData ? (
                  <div className="p-2.5 rounded-xl bg-orange-50/70 border border-orange-100 text-xs text-orange-800">
                    กรุณากรอกเบอร์โทรศัพท์ลูกค้าด้านบน เพื่อดึงแต้มและของรางวัลที่สามารถแลกได้
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {memberRewards.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                          ของรางวัลเป้าหมาย (Milestones):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {memberRewards.map((r) => {
                            const isEnough = memberData.points >= r.pointsRequired;
                            const isSelected = selectedReward?.id === r.id;
                            return (
                              <button
                                key={r.id}
                                type="button"
                                disabled={!isEnough}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedReward(null);
                                    setPointsToRedeem(0);
                                  } else {
                                    setSelectedReward(r);
                                    setPointsToRedeem(r.pointsRequired);
                                  }
                                }}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1.5 ${
                                  isSelected
                                    ? 'bg-orange-600 text-white shadow-sm ring-2 ring-orange-500/50'
                                    : isEnough
                                    ? 'bg-orange-100/70 text-orange-700 hover:bg-orange-200/70 border border-orange-200'
                                    : 'bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed'
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

                    {memberData.points > 0 && !selectedReward && (
                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-xs text-slate-500">หรือแลกแต้มส่วนลดทั่วไป:</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (pointsToRedeem > 0) {
                              setPointsToRedeem(0);
                            } else {
                              const maxPoints = Math.min(
                                memberData.points,
                                Math.floor(rawTotalAmount / (store?.pointValue || 1))
                              );
                              setPointsToRedeem(maxPoints);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                            pointsToRedeem > 0
                              ? 'bg-orange-600 text-white shadow-sm'
                              : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
                          }`}
                        >
                          {pointsToRedeem > 0
                            ? `แลก ฿${pointsToRedeem * (store?.pointValue || 1)} ✓`
                            : 'แลกแต้มส่วนลดสูงสุด'}
                        </button>
                      </div>
                    )}

                    {selectedReward && (
                      <div className="p-2.5 bg-orange-100/70 text-orange-800 text-xs font-bold rounded-xl border border-orange-200 flex items-center justify-between">
                        <span>✓ แลกรับ: {selectedReward.title}</span>
                        <span>(หัก {selectedReward.pointsRequired} แต้ม)</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PROMO / COUPONS */}
            {discountTab === 'PROMO' && (
              <div className="space-y-2.5 pt-1 border-t border-slate-200/60 animate-fade-in">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="เช่น WELCOME50, DISC10"
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                    className="flex-1 h-11 sm:h-9 px-3 py-2 rounded-xl border border-slate-200 text-base sm:text-xs font-black uppercase tracking-wider bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyPromo()}
                    className="px-4 py-2 min-h-[44px] sm:min-h-[36px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold shadow-sm cursor-pointer"
                  >
                    ใช้โค้ด
                  </button>
                </div>

                {availablePromotions.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      คูปองโปรโมชั่นของร้าน (คลิกเพื่อใช้):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {availablePromotions.map((p) => {
                        const isSelected = appliedPromo?.code === p.code;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleApplyPromo(p.code)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1 ${
                              isSelected
                                ? 'bg-orange-600 text-white shadow-sm ring-2 ring-orange-500/50'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                          >
                            <span>
                              🏷️ {p.code} (
                              {p.discountType === 'PERCENT' ? `${p.discountValue}%` : `฿${p.discountValue}`})
                            </span>
                            {isSelected && <Check className="w-3 h-3" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {appliedPromo && (
                  <div className="flex items-center justify-between text-xs text-emerald-700 font-extrabold bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                    <span>✓ {appliedPromo.title} ({appliedPromo.code})</span>
                    <span>-฿{appliedPromo.calculatedDiscount}</span>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: CUSTOM DISCOUNT */}
            {discountTab === 'CUSTOM' && (
              <div className="space-y-2.5 pt-1 border-t border-slate-200/60 animate-fade-in">
                <div className="flex items-center gap-2">
                  <div className="flex p-0.5 bg-slate-200 rounded-lg border border-slate-300/80">
                    <button
                      type="button"
                      onClick={() => setCustomDiscountType('FIXED')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-black transition-all ${
                        customDiscountType === 'FIXED' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      ฿ (บาท)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomDiscountType('PERCENT')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-black transition-all ${
                        customDiscountType === 'PERCENT' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      % (เปอร์เซ็นต์)
                    </button>
                  </div>

                  <input
                    type="number"
                    min="0"
                    placeholder={customDiscountType === 'PERCENT' ? 'เช่น 10 (ลด 10%)' : 'เช่น 30 (ลด 30 บ.)'}
                    value={customDiscountValue}
                    onChange={(e) => setCustomDiscountValue(e.target.value)}
                    className="flex-1 h-11 sm:h-9 px-3 py-2 rounded-xl border border-slate-200 text-base sm:text-xs font-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] font-bold text-slate-500">ปุ่มลัด:</span>
                  {customDiscountType === 'PERCENT'
                    ? [5, 10, 15, 20, 50].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setCustomDiscountValue(pct.toString())}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors ${
                            customDiscountValue === pct.toString()
                              ? 'bg-orange-600 text-white'
                              : 'bg-slate-200/80 hover:bg-slate-300 text-slate-700'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))
                    : [10, 20, 30, 50, 100].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setCustomDiscountValue(amt.toString())}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors ${
                            customDiscountValue === amt.toString()
                              ? 'bg-orange-600 text-white'
                              : 'bg-slate-200/80 hover:bg-slate-300 text-slate-700'
                          }`}
                        >
                          ฿{amt}
                        </button>
                      ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-orange-50/80 border border-orange-100 flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-orange-900 block">ยอดสุทธิที่ต้องชำระ:</span>
              {totalCombinedDiscount > 0 && (
                <span className="text-[11px] text-emerald-600 font-bold">
                  (ประหยัดไป ฿{totalCombinedDiscount})
                </span>
              )}
            </div>
            <span className="text-2xl font-black text-orange-600">฿{finalNetAmount.toLocaleString()}</span>
          </div>

          {/* Payment Method Switch */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('PROMPTPAY')}
              className={`py-3 rounded-2xl text-xs font-extrabold border flex items-center justify-center space-x-2 transition-all ${
                paymentMethod === 'PROMPTPAY'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <QrCode className="w-4 h-4 text-orange-400" />
              <span>PromptPay QR</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('CASH')}
              className={`py-3 rounded-2xl text-xs font-extrabold border flex items-center justify-center space-x-2 transition-all ${
                paymentMethod === 'CASH'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Banknote className="w-4 h-4 text-emerald-400" />
              <span>เงินสด (Cash)</span>
            </button>
          </div>

          {/* PromptPay QR & Bank Slip Reader View */}
          {paymentMethod === 'PROMPTPAY' && (
            <div className="space-y-3">
              <div className="text-center p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                {promptPayQrPayload ? (
                  <div className="flex flex-col items-center">
                    <div className="p-2.5 bg-white rounded-2xl shadow-sm border border-slate-200">
                      <QRCodeSVG value={promptPayQrPayload} size={145} />
                    </div>
                    <span className="text-xs font-bold text-slate-700 mt-1.5">
                      พร้อมเพย์: {store?.promptPayId} ({store?.promptPayName})
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-rose-500 font-semibold">
                    ยังไม่ได้ตั้งค่าเบอร์พร้อมเพย์ในหน้าตั้งค่าร้าน
                  </p>
                )}
              </div>

              {/* Mode Selector: Slip Photo vs Bank Text Message */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setPromptPayVerifyMode('SLIP')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                    promptPayVerifyMode === 'SLIP'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>📷 แนบรูปสลิป / Mini-QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPromptPayVerifyMode('TEXT')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                    promptPayVerifyMode === 'TEXT'
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>💬 อ่านข้อความเงินเข้า (LINE/SMS)</span>
                </button>
              </div>

              {/* Sub-mode 1: Slip Upload & Verification Section */}
              {promptPayVerifyMode === 'SLIP' && (
                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2.5 text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-black text-slate-800">
                        ระบบอ่านสลิปโอนเงิน (Slip Reader)
                      </span>
                    </div>
                    <label className="flex items-center space-x-1.5 cursor-pointer select-none text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={autoCheckoutEnabled}
                        onChange={(e) => setAutoCheckoutEnabled(e.target.checked)}
                        className="rounded text-orange-600 focus:ring-orange-500 w-3.5 h-3.5"
                      />
                      <span>⚡ บันทึกอัตโนมัติ</span>
                    </label>
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    id="cashier-slip-input"
                    className="hidden"
                    onChange={handleSelectSlipFile}
                  />

                  {!slipPreview ? (
                    <label
                      htmlFor="cashier-slip-input"
                      className={`w-full py-3 px-4 rounded-xl border-2 border-dashed border-orange-300 bg-orange-50/50 hover:bg-orange-50 text-orange-700 font-extrabold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                        isVerifyingSlip ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    >
                      {isVerifyingSlip ? (
                        <div className="flex items-center space-x-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-orange-600" />
                          <span>กำลังอ่าน Mini-QR และตรวจสอบสลิป...</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center space-x-1.5">
                            <Camera className="w-4 h-4 text-orange-600" />
                            <span>📷 สแกนสลิป / แนบรูปภาพสลิปโอนเงิน</span>
                          </div>
                          <span className="text-[10px] text-orange-500 font-normal">
                            รองรับไฟล์ภาพจากมือถือ, แคปหน้าจอ, หรือถ่ายจากกล้อง
                          </span>
                        </>
                      )}
                    </label>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 min-w-0">
                          <div
                            onClick={() => setPreviewSlipModalOpen(true)}
                            className="relative w-12 h-14 rounded-lg overflow-hidden border border-slate-300 flex-shrink-0 cursor-pointer group bg-black/5"
                          >
                            <img
                              src={slipPreview}
                              alt="Slip"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Eye className="w-3.5 h-3.5 text-white" />
                            </div>
                          </div>
                          <div className="truncate text-left text-xs">
                            <span className="font-extrabold text-slate-800 block truncate">
                              {slipResult?.parsed?.bankName || 'สลิปโอนเงินธนาคาร'}
                            </span>
                            <span className="text-[11px] text-slate-500 block">
                              {slipResult?.parsed?.amount !== undefined
                                ? `ยอดในสลิป: ฿${slipResult.parsed.amount.toLocaleString()}`
                                : 'แนบรูปภาพแล้ว'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => setPreviewSlipModalOpen(true)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 text-xs font-bold cursor-pointer"
                            title="ดูรูปใหญ่"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <label
                            htmlFor="cashier-slip-input"
                            className="p-1.5 rounded-lg text-orange-600 hover:bg-orange-100 cursor-pointer text-xs font-bold"
                            title="เปลี่ยนรูปสลิป"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setSlipPreview(null);
                              setSlipQrPayload(null);
                              setSlipResult(null);
                            }}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-100 text-xs font-bold cursor-pointer"
                            title="ลบสลิป"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {isVerifyingSlip ? (
                        <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold flex items-center space-x-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-orange-500" />
                          <span>กำลังตรวจสอบสลิปกับระบบ...</span>
                        </div>
                      ) : slipResult?.isDuplicate ? (
                        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center space-x-2">
                          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                          <span>⚠️ สลิปนี้เคยถูกใช้งานและปิดบิลไปแล้วในระบบ!</span>
                        </div>
                      ) : slipResult?.isAmountMismatch ? (
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center space-x-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>
                            ⚠️ ยอดในสลิป (฿{slipResult.slipAmount}) ไม่ตรงกับยอดบิล (฿{finalNetAmount})
                          </span>
                        </div>
                      ) : slipResult?.parsed?.isValid ? (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <span>ตรวจสลิปผ่านแล้ว ✅ (ยอด ฿{slipResult.parsed.amount || finalNetAmount})</span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                            สลิปแท้ ไม่ซ้ำ
                          </span>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-bold">
                          ℹ️ รูปสลิปพร้อมใช้งาน สามารถกด "บันทึกมือ" เพื่อยืนยันปิดบิล
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            if (slipResult?.isDuplicate) {
                              speakSlipDuplicate();
                            } else if (slipResult?.isAmountMismatch) {
                              speakSlipAmountMismatch(slipResult.slipAmount, finalNetAmount);
                            } else if (slipResult?.isReceiverMismatch) {
                              speakSlipReceiverMismatch();
                            } else if (slipResult?.parsed?.isValid) {
                              speakSlipReadSuccess(
                                slipResult.parsed.amount || finalNetAmount,
                                selectedTable?.name
                              );
                            } else if (slipResult?.isPaid) {
                              speakSlipVerified(finalNetAmount, selectedTable?.name);
                            } else {
                              speakThaiVoice(
                                `สลิปโต๊ะ ${selectedTable?.name || ''} ยอดบิล ${finalNetAmount} บาทค่ะ`
                              );
                            }
                          }}
                          className="flex items-center space-x-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 cursor-pointer transition-colors"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                          <span>🔊 ฟังเสียงอ่านสลิป</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={isManualConfirming}
                        onClick={handleManualConfirmSlip}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/25 flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isManualConfirming ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <FileCheck className="w-4 h-4" />
                            <span>💾 บันทึกมือ (ยืนยันปิดบิลด้วยสลิปนี้)</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-mode 2: Bank Notification Text Reader */}
              {promptPayVerifyMode === 'TEXT' && (
                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3 text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <MessageSquare className="w-4 h-4 text-orange-600" />
                      <span className="text-xs font-black text-slate-800">
                        ระบบอ่านข้อความเงินเข้าธนาคาร
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (voiceEnabled) {
                          if (parsedBankText?.isValid && parsedBankText?.amount) {
                            speakMoneyReceived(parsedBankText.amount, selectedTable?.name);
                          } else {
                            speakThaiVoice(`ยอดบิลนี้คือ ${finalNetAmount} บาทค่ะ`);
                          }
                        } else {
                          showInfo('กรุณาเปิดเสียงที่แถบด้านบนเพื่อฟังเสียงอ่าน');
                        }
                      }}
                      className="flex items-center space-x-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 cursor-pointer transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                      <span>🔊 ฟังเสียงอ่าน</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-tight">
                    คัดลอกข้อความแจ้งเตือนเงินเข้าจาก LINE (SCB Connect, KBank Live, Krungthai Connext, เป๋าตัง ฯลฯ) หรือ SMS มาวางที่นี่
                  </p>

                  <div className="relative">
                    <textarea
                      value={bankNotificationInput}
                      onChange={(e) => setBankNotificationInput(e.target.value)}
                      rows={3}
                      placeholder="ตัวอย่าง: เงินเข้า ฿150.00 จาก นาย ก เข้าบัญชี SCB xxx-1234 เวลา 12:30 น."
                      className="w-full p-3 text-base sm:text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium text-slate-800 placeholder:text-slate-400 resize-none"
                    />
                    {bankNotificationInput && (
                      <button
                        type="button"
                        onClick={() => setBankNotificationInput('')}
                        className="absolute top-2 right-2 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                        title="ล้างข้อความ"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
                            const text = await navigator.clipboard.readText();
                            if (text && text.trim()) {
                              setBankNotificationInput(text);
                              showSuccess('วางข้อความจากคลิปบอร์ดแล้ว 📋');
                            } else {
                              showInfo('คลิปบอร์ดว่างเปล่า ไม่พบข้อความ');
                            }
                          } else {
                            showInfo('คลิกในช่องข้อความแล้วกด Ctrl+V เพื่อวาง');
                          }
                        } catch {
                          showInfo('คลิกในช่องข้อความแล้วกด Ctrl+V เพื่อวาง');
                        }
                      }}
                      className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center space-x-1 cursor-pointer transition-colors"
                    >
                      <Clipboard className="w-3.5 h-3.5 text-slate-500" />
                      <span>📋 วางข้อความจากคลิปบอร์ด</span>
                    </button>

                    {bankNotificationInput && (
                      <button
                        type="button"
                        onClick={() => setBankNotificationInput('')}
                        className="py-1.5 px-2.5 rounded-lg text-slate-500 hover:bg-slate-100 font-bold text-[11px] cursor-pointer"
                      >
                        ล้างค่า
                      </button>
                    )}
                  </div>

                  {bankNotificationInput.trim() && (
                    <div className="space-y-2.5 pt-1">
                      {parsedBankText.isValid && parsedBankText.amount !== undefined ? (
                        <div
                          className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                            Math.abs(parsedBankText.amount - finalNetAmount) < 0.01
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                              : 'bg-amber-50 border-amber-200 text-amber-900'
                          }`}
                        >
                          <div className="flex items-center justify-between font-black">
                            <span className="flex items-center gap-1.5">
                              {Math.abs(parsedBankText.amount - finalNetAmount) < 0.01 ? (
                                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                              )}
                              <span>{parsedBankText.bankName || parsedBankText.bank || 'ธนาคาร'}</span>
                            </span>
                            <span className="text-sm font-extrabold">
                              ยอดเงินเข้า: ฿{parsedBankText.amount.toLocaleString()}
                            </span>
                          </div>

                          <div className="text-[11px] font-semibold flex items-center justify-between">
                            {Math.abs(parsedBankText.amount - finalNetAmount) < 0.01 ? (
                              <span className="text-emerald-700 font-bold">
                                ✅ ยอดเงินเข้าตรงกับยอดบิลเป๊ะ (฿{finalNetAmount})
                              </span>
                            ) : (
                              <span className="text-amber-700 font-bold">
                                ⚠️ ยอดในข้อความ (฿{parsedBankText.amount}) ไม่ตรงกับยอดบิล (฿{finalNetAmount})
                              </span>
                            )}
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/5 text-slate-600">
                              ไม่อ่านยอดคงเหลือ
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center space-x-2">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                          <span>{parsedBankText.message || 'ไม่พบยอดเงินเข้าในข้อความนี้ กรุณาตรวจทาน'}</span>
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={isProcessingBankText || !parsedBankText.isValid || !parsedBankText.amount}
                        onClick={handleProcessBankTextMessage}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/25 flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isProcessingBankText ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>
                              ⚡ ตัดยอดเงินเข้า &amp; ปิดบิลทันที (฿{parsedBankText.amount || finalNetAmount})
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Cash Input */}
          {paymentMethod === 'CASH' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">รับเงินสดมา (บาท):</label>
                <input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder="เช่น 100, 500, 1000"
                  className="w-full h-12 px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-xl sm:text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Quick Cash Buttons */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] font-bold text-slate-500">ปุ่มลัด:</span>
                <button
                  type="button"
                  onClick={() => setCashReceived(finalNetAmount.toString())}
                  className="px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  พอดี (฿{finalNetAmount})
                </button>
                {[100, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCashReceived(amt.toString())}
                    className="px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    ฿{amt}
                  </button>
                ))}
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-100 text-xs">
                <span className="font-bold text-slate-600">เงินทอน:</span>
                <span className={`font-black text-base ${change < 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                  ฿{change.toLocaleString()}
                </span>
              </div>
            </div>
          )}
          </div>

          {/* Sticky Bottom Actions */}
          <div className="shrink-0 p-3.5 sm:p-4 border-t border-slate-100 bg-white safe-area-bottom">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                data-sound="pop"
                onClick={handlePrintBillFromCheckout}
                className="py-3 sm:py-3.5 px-4 min-h-[48px] rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-orange-100 text-slate-700 hover:text-slate-900 active:text-orange-950 font-extrabold text-sm sm:text-xs border border-slate-300 active:border-orange-400 transition-all duration-75 flex items-center justify-center space-x-1.5 shadow-sm active:scale-95 cursor-pointer select-none ring-0 active:ring-2 active:ring-orange-300"
                title="พิมพ์ใบแจ้งค่าอาหาร / ใบเช็คบิลพร้อม QR Code ก่อนชำระเงิน"
              >
                <Printer className="w-4 h-4 text-orange-500" />
                <span>พิมพ์บิล</span>
              </button>

              <button
                type="button"
                data-sound="success"
                disabled={(paymentMethod === 'CASH' && change < 0) || isProcessingPay}
                onClick={handleProcessPayment}
                className="sm:col-span-2 py-3.5 min-h-[52px] rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 active:from-emerald-700 active:to-teal-700 text-white font-black text-base sm:text-sm shadow-lg shadow-emerald-500/25 active:shadow-sm transition-all duration-75 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center space-x-2 active:scale-95 cursor-pointer select-none ring-0 active:ring-2 active:ring-emerald-300"
              >
                {isProcessingPay ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>กำลังปิดบิล...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>ยืนยันชำระเงิน &amp; ปิดบิล</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full Resolution Slip Preview Lightbox Modal */}
      {previewSlipModalOpen && slipPreview && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-sm sm:max-w-md w-full bg-slate-900 rounded-3xl p-5 space-y-4 text-white border border-slate-800 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Camera className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-black">รูปภาพสลิปโอนเงิน</span>
              </div>
              <button
                onClick={() => setPreviewSlipModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto rounded-2xl bg-black flex justify-center p-2 border border-slate-800">
              <img
                src={slipPreview}
                alt="Full Slip Preview"
                className="rounded-xl max-w-full h-auto object-contain shadow-md"
              />
            </div>

            {slipResult?.parsed && (
              <div className="p-3 bg-slate-800 rounded-xl text-xs space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span>ธนาคาร:</span>
                  <span className="font-bold text-white">{slipResult.parsed.bankName || '-'}</span>
                </div>
                {slipResult.parsed.amount !== undefined && (
                  <div className="flex justify-between">
                    <span>ยอดเงินในสลิป:</span>
                    <span className="font-bold text-emerald-400">
                      ฿{slipResult.parsed.amount.toLocaleString()}
                    </span>
                  </div>
                )}
                {slipResult.parsed.slipRef && (
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>เลขอ้างอิงสลิป:</span>
                    <span className="font-mono">{slipResult.parsed.slipRef}</span>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setPreviewSlipModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-all"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </>
  );
}
