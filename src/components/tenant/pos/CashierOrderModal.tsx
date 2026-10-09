'use client';

import React, { useState, useMemo } from 'react';
import { Search, Trash2, X } from 'lucide-react';
import { formatImageUrl } from '@/lib/utils';
import { playOrderChime, playDeliveryChime } from '@/lib/sound';
import { useToast } from '@/context/ToastContext';

export interface CashierOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTable: any;
  categories: any[];
  store: any;
  slug: string;
  orderChannel: 'DINE_IN' | 'TAKEAWAY' | 'LINEMAN' | 'GRAB' | 'SHOPEE_FOOD' | 'ROBINHOOD';
  setOrderChannel: (channel: 'DINE_IN' | 'TAKEAWAY' | 'LINEMAN' | 'GRAB' | 'SHOPEE_FOOD' | 'ROBINHOOD') => void;
  deliveryOrderId: string;
  setDeliveryOrderId: (id: string) => void;
  riderName: string;
  setRiderName: (name: string) => void;
  riderPhone: string;
  setRiderPhone: (phone: string) => void;
  onOrderSuccess: () => void;
}

export default function CashierOrderModal({
  isOpen,
  onClose,
  selectedTable,
  categories,
  store,
  slug,
  orderChannel,
  setOrderChannel,
  deliveryOrderId,
  setDeliveryOrderId,
  riderName,
  setRiderName,
  riderPhone,
  setRiderPhone,
  onOrderSuccess,
}: CashierOrderModalProps) {
  const { showSuccess, showError } = useToast();

  const [cashierCart, setCashierCart] = useState<any[]>([]);
  const [selectedMenuItem, setSelectedMenuItem] = useState<any>(null);
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: any[] }>({});
  const [specialNote, setSpecialNote] = useState('');
  const [dishQuantity, setDishQuantity] = useState(1);
  const [searchMenu, setSearchMenu] = useState('');
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allMenuItems = useMemo(() => {
    const list: any[] = [];
    if (categories && Array.isArray(categories)) {
      categories.forEach((cat: any) => {
        if (cat.items && Array.isArray(cat.items)) {
          cat.items.forEach((item: any) => {
            list.push({ ...item, categoryName: cat.name });
          });
        }
      });
    }
    return list;
  }, [categories]);

  const filteredMenuItems = useMemo(() => {
    if (!searchMenu) return allMenuItems;
    return allMenuItems.filter(
      (i) =>
        i.name.toLowerCase().includes(searchMenu.toLowerCase()) ||
        (i.categoryName && i.categoryName.toLowerCase().includes(searchMenu.toLowerCase()))
    );
  }, [allMenuItems, searchMenu]);

  if (!isOpen) return null;

  const handleOpenItemCustomizer = (item: any) => {
    setSelectedMenuItem(item);
    setSpecialNote('');
    setDishQuantity(1);
    const defaults: { [key: string]: any[] } = {};
    if (item.options) {
      item.options.forEach((group: any) => {
        if (group.isRequired && group.choices?.length > 0) {
          defaults[group.title] = [group.choices[0]];
        } else {
          defaults[group.title] = [];
        }
      });
    }
    setSelectedOptions(defaults);
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
    const extraPricePerUnit = Object.values(selectedOptions).reduce(
      (sum, choices) => sum + choices.reduce((cSum, c) => cSum + (c.extraPrice || 0), 0),
      0
    );
    const unitPrice = selectedMenuItem.basePrice + extraPricePerUnit;

    const flattenedOptions = Object.entries(selectedOptions).flatMap(([group, choices]) =>
      choices.map((c) => ({
        group,
        choice: c.name,
        extra: c.extraPrice || 0,
        extraPrice: c.extraPrice || 0,
      }))
    );

    const cartItem = {
      menuItemId: selectedMenuItem.id,
      name: selectedMenuItem.name,
      price: unitPrice,
      quantity: dishQuantity,
      selectedOptions: flattenedOptions,
      specialNote: specialNote.trim() || undefined,
    };

    setCashierCart([...cashierCart, cartItem]);
    setSelectedMenuItem(null);
  };

  const handleRemoveFromCart = (index: number) => {
    setCashierCart(cashierCart.filter((_, idx) => idx !== index));
  };

  const handleSubmitCashierOrder = async () => {
    if (isSubmitting || cashierCart.length === 0) return;
    const isDelivery = ['LINEMAN', 'GRAB', 'SHOPEE_FOOD', 'ROBINHOOD'].includes(orderChannel);
    if (!isDelivery && !selectedTable) return;
    setIsSubmitting(true);

    // Snapshot payload
    const cartSnapshot = [...cashierCart];
    const tableSnapshot = selectedTable;
    const channelSnapshot = orderChannel;
    const orderIdSnapshot = deliveryOrderId;
    const rNameSnapshot = riderName;
    const rPhoneSnapshot = riderPhone;
    const cashierIdemKey = `cashier_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // 1. Immediate tactile sound & toast (0ms)
    if (isDelivery) {
      const chLabel =
        orderChannel === 'LINEMAN'
          ? 'LINE MAN'
          : orderChannel === 'GRAB'
          ? 'GrabFood'
          : orderChannel === 'SHOPEE_FOOD'
          ? 'ShopeeFood'
          : 'Robinhood';
      showSuccess('รับออเดอร์เดลิเวอรีเข้าครัวแล้ว 🛵', `${chLabel} #${deliveryOrderId || 'ใหม่'} • ${cartSnapshot.length} รายการ`);
      playDeliveryChime();
    } else {
      showSuccess('ส่งรายการอาหารเข้าครัวแล้ว 🍳', `${selectedTable?.name || 'สั่งกลับบ้าน'} • ${cartSnapshot.length} รายการ`);
      playOrderChime();
    }

    // 2. Clear cart & close modal immediately (0ms)
    setCashierCart([]);
    onOrderSuccess();

    // 3. Background network dispatch with Idempotency-Key
    try {
      const res = await fetch(`/api/r/${slug}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': cashierIdemKey,
        },
        body: JSON.stringify({
          clientRequestId: cashierIdemKey,
          tableId: isDelivery ? 0 : (tableSnapshot?.id || tableSnapshot?.tableNo),
          items: cartSnapshot,
          orderType: isDelivery ? 'TAKEAWAY' : (channelSnapshot === 'TAKEAWAY' ? 'TAKEAWAY' : 'DINE_IN'),
          orderChannel: channelSnapshot,
          deliveryOrderId: isDelivery ? orderIdSnapshot : null,
          riderName: isDelivery ? rNameSnapshot : null,
          riderPhone: isDelivery ? rPhoneSnapshot : null,
        }),
      });
      if (!res.ok) {
        showError('ไม่สามารถส่งออเดอร์ได้', 'กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err) {
      console.error(err);
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถส่งออเดอร์ได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
        <div className="bg-white rounded-t-3xl md:rounded-3xl max-w-5xl w-full h-[95vh] md:h-[88vh] shadow-2xl border border-slate-200 overflow-hidden flex flex-col relative">
          <div className="p-4 sm:p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black">
                  {orderChannel === 'LINEMAN'
                    ? '🛵 สั่งอาหาร LINE MAN Delivery'
                    : orderChannel === 'GRAB'
                    ? '🛵 สั่งอาหาร GrabFood Delivery'
                    : orderChannel === 'SHOPEE_FOOD'
                    ? '🛵 สั่งอาหาร ShopeeFood Delivery'
                    : orderChannel === 'TAKEAWAY'
                    ? '🛍️ สั่งอาหารกลับบ้าน (Takeaway)'
                    : `สั่งอาหารหน้าร้าน — ${selectedTable?.name || 'โต๊ะอาหาร'}`}
                </h3>
              </div>
              <p className="text-xs text-slate-400">เลือกเมนูและกดส่งเข้าห้องครัว ตัดสต็อกวัตถุดิบอัตโนมัติ</p>
            </div>

            {/* Channel Switcher Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none bg-slate-800/90 p-1 rounded-xl border border-slate-700">
              {[
                { id: 'DINE_IN', label: '🍽️ ทานที่ร้าน' },
                { id: 'TAKEAWAY', label: '🛍️ กลับบ้าน' },
                { id: 'LINEMAN', label: '🟢 LINE MAN' },
                { id: 'GRAB', label: '🟢 Grab' },
                { id: 'SHOPEE_FOOD', label: '🟠 Shopee' },
              ].map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  data-sound="tap"
                  onClick={() => {
                    setOrderChannel(ch.id as any);
                    if (['LINEMAN', 'GRAB', 'SHOPEE_FOOD'].includes(ch.id) && !deliveryOrderId) {
                      const prefix = ch.id === 'LINEMAN' ? 'LM' : ch.id === 'GRAB' ? 'GF' : 'SF';
                      setDeliveryOrderId(`${prefix}-${Math.floor(1000 + Math.random() * 9000)}`);
                    }
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-all duration-75 active:scale-95 select-none cursor-pointer ${
                    orderChannel === ch.id
                      ? ch.id === 'LINEMAN'
                        ? 'bg-[#06C755] text-white shadow-sm'
                        : ch.id === 'GRAB'
                        ? 'bg-[#00B14F] text-white shadow-sm'
                        : ch.id === 'SHOPEE_FOOD'
                        ? 'bg-[#EE4D2D] text-white shadow-sm'
                        : 'bg-orange-500 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {ch.label}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              data-sound="pop"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-400 hover:text-white self-end sm:self-auto transition-all duration-75 active:scale-90 cursor-pointer select-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Delivery Details Bar if Delivery Channel is active */}
          {['LINEMAN', 'GRAB', 'SHOPEE_FOOD', 'ROBINHOOD'].includes(orderChannel) && (
            <div className="bg-slate-800/95 border-b border-slate-700 px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-3 text-xs text-white">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-300">รหัสบิล/ออเดอร์:</span>
                <input
                  type="text"
                  placeholder="เช่น LM-4892"
                  value={deliveryOrderId}
                  onChange={(e) => setDeliveryOrderId(e.target.value)}
                  className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-bold w-28 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-300">ชื่อไรเดอร์:</span>
                <input
                  type="text"
                  placeholder="ชื่อคนขับ / ทะเบียน"
                  value={riderName}
                  onChange={(e) => setRiderName(e.target.value)}
                  className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white w-32 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-300">เบอร์โทร:</span>
                <input
                  type="text"
                  placeholder="081xxxxxxx"
                  value={riderPhone}
                  onChange={(e) => setRiderPhone(e.target.value)}
                  className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white w-28 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Menu Selection Area */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหาเมนูอาหาร..."
                  value={searchMenu}
                  onChange={(e) => setSearchMenu(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5 pb-24 md:pb-4">
                {filteredMenuItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleOpenItemCustomizer(item)}
                    data-sound="tap"
                    className="p-3 rounded-2xl border border-slate-200 hover:border-orange-500 hover:shadow-md active:scale-95 cursor-pointer transition-all duration-75 flex flex-col justify-between bg-white select-none"
                  >
                    {item.imageUrl && (
                      <div className="w-full h-24 rounded-xl overflow-hidden mb-2 bg-slate-100 flex-shrink-0">
                        <img
                          src={formatImageUrl(item.imageUrl)}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div>
                      <span className="font-extrabold text-sm text-slate-900 block truncate">{item.name}</span>
                      <span className="text-xs text-slate-400">{item.categoryName}</span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-sm font-black text-orange-600">฿{item.basePrice}</span>
                      <span className="w-7 h-7 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-black text-sm">
                        +
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop & Tablet Permanent Split View Cart Panel (Rule 49, 51) */}
            <div className="hidden md:flex w-80 lg:w-96 bg-slate-50 border-l border-slate-200 p-4 sm:p-6 flex-col justify-between flex-shrink-0">
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">
                  รายการที่เลือก ({cashierCart.length})
                </h4>

                <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                  {cashierCart.length === 0 ? (
                    <p className="text-xs text-slate-400 py-8 text-center">ยังไม่มีรายการในตะกร้า</p>
                  ) : (
                    cashierCart.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-900 block">{item.name} x {item.quantity}</span>
                          <span className="text-[11px] text-slate-400">฿{item.price * item.quantity}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveFromCart(idx)}
                          data-sound="pop"
                          className="text-rose-500 hover:text-rose-700 active:text-rose-900 p-1.5 rounded-lg hover:bg-rose-50 transition-all duration-75 active:scale-90 cursor-pointer select-none"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 space-y-3">
                {(() => {
                  const rawTotal = cashierCart.reduce((sum, i) => sum + i.price * i.quantity, 0);
                  const isDeliv = ['LINEMAN', 'GRAB', 'SHOPEE_FOOD', 'ROBINHOOD'].includes(orderChannel);
                  const gpRate = isDeliv
                    ? orderChannel === 'LINEMAN'
                      ? store?.linemanGp ?? 30
                      : orderChannel === 'GRAB'
                      ? store?.grabGp ?? 30
                      : orderChannel === 'SHOPEE_FOOD'
                      ? store?.shopeeGp ?? 30
                      : 20
                    : 0;
                  const gpVal = (rawTotal * gpRate) / 100;
                  const netVal = rawTotal - gpVal;

                  return (
                    <>
                      <div className="space-y-1">
                        <div className="flex justify-between font-black text-sm text-slate-900">
                          <span>ยอดรวมทั้งหมด:</span>
                          <span className="text-orange-600">฿{rawTotal.toLocaleString()}</span>
                        </div>
                        {isDeliv && rawTotal > 0 && (
                          <div className="text-[11px] bg-emerald-50 border border-emerald-200 p-2 rounded-xl text-emerald-800 space-y-0.5">
                            <div className="flex justify-between">
                              <span>หัก GP {gpRate}%:</span>
                              <span className="text-rose-600 font-bold">-฿{gpVal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between font-black text-emerald-900 pt-1 border-t border-emerald-200">
                              <span>รายได้สุทธิร้าน:</span>
                              <span>฿{netVal.toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        disabled={cashierCart.length === 0 || isSubmitting}
                        onClick={handleSubmitCashierOrder}
                        data-sound="success"
                        className={`w-full min-h-[48px] py-3 rounded-2xl text-white font-black text-sm shadow-lg transition-all duration-75 active:scale-90 active:translate-y-0.5 select-none disabled:opacity-50 cursor-pointer ${
                          isDeliv
                            ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-600/25 ring-0 active:ring-2 active:ring-emerald-300'
                            : 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700 shadow-orange-500/25 ring-0 active:ring-2 active:ring-orange-300'
                        }`}
                      >
                        {isSubmitting
                          ? 'กำลังส่งออเดอร์...'
                          : isDeliv
                          ? '🛵 ส่งออเดอร์เดลิเวอรีเข้าครัว'
                          : 'ส่งออเดอร์เข้าครัว 🍳'}
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Mobile Sticky Bottom Bar (Rule 19, 50) */}
          {cashierCart.length > 0 && (
            <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 px-4 py-3 shadow-2xl flex items-center justify-between safe-area-bottom">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-black text-xs flex items-center justify-center">
                    {cashierCart.reduce((sum, i) => sum + i.quantity, 0)}
                  </span>
                  <span className="text-xs font-bold text-slate-500">ในตะกร้า</span>
                </div>
                <span className="text-base font-black text-orange-600 block">
                  ฿{cashierCart.reduce((sum, i) => sum + i.price * i.quantity, 0).toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                data-sound="pop"
                onClick={() => setIsMobileCartOpen(true)}
                className="btn-pos-primary min-h-[48px] px-5 py-2 text-sm shadow-md"
              >
                <span>ดูตะกร้า / ยืนยัน</span>
                <span>→</span>
              </button>
            </div>
          )}

          {/* Mobile Bottom Sheet Cart Modal (Rule 19, 24, 50) */}
          {isMobileCartOpen && (
            <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end">
              <div className="bg-white rounded-t-3xl max-h-[85vh] flex flex-col p-4 pb-8 space-y-4 shadow-2xl border-t border-slate-200 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>🛒 รายการในตะกร้า</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-extrabold">
                      {cashierCart.reduce((sum, i) => sum + i.quantity, 0)} จาน
                    </span>
                  </h4>
                  <button
                    onClick={() => setIsMobileCartOpen(false)}
                    className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[45vh] pr-1">
                  {cashierCart.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <span className="font-extrabold text-sm text-slate-900 block truncate">{item.name}</span>
                        <span className="text-xs font-black text-orange-600">฿{item.price} x {item.quantity} = ฿{item.price * item.quantity}</span>
                        {item.selectedOptions && (
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {item.selectedOptions.map((o: any) => o.choice).join(', ')}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveFromCart(idx)}
                        data-sound="pop"
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="flex justify-between items-baseline font-black text-slate-900">
                    <span className="text-sm">ยอดรวมชำระ:</span>
                    <span className="text-xl text-orange-600">
                      ฿{cashierCart.reduce((sum, i) => sum + i.price * i.quantity, 0).toLocaleString()}
                    </span>
                  </div>
                  <button
                    disabled={cashierCart.length === 0 || isSubmitting}
                    onClick={() => {
                      setIsMobileCartOpen(false);
                      handleSubmitCashierOrder();
                    }}
                    data-sound="success"
                    className="w-full btn-pos-primary min-h-[56px] text-base disabled:opacity-50"
                  >
                    {isSubmitting
                      ? 'กำลังส่งออเดอร์...'
                      : ['LINEMAN', 'GRAB', 'SHOPEE_FOOD', 'ROBINHOOD'].includes(orderChannel)
                      ? '🛵 ส่งออเดอร์เดลิเวอรีเข้าครัวทันที'
                      : '🍳 ส่งออเดอร์เข้าครัวทันที'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Item Customizer Pop-up (when clicking item) */}
      {selectedMenuItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-base text-slate-900">{selectedMenuItem.name}</h4>
              <button
                onClick={() => setSelectedMenuItem(null)}
                data-sound="pop"
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-all duration-75 active:scale-90 cursor-pointer select-none"
              >
                ✕
              </button>
            </div>

            {selectedMenuItem.options?.map((group: any) => (
              <div key={group.id} className="space-y-1.5">
                <span className="text-xs font-extrabold text-slate-700">{group.title}</span>
                <div className="flex flex-wrap gap-1.5">
                  {group.choices?.map((choice: any) => {
                    const isSelected = selectedOptions[group.title]?.some((c) => c.name === choice.name);
                    return (
                      <button
                        key={choice.id}
                        type="button"
                        data-sound="tap"
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
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-75 active:scale-90 select-none cursor-pointer ${
                          isSelected
                            ? 'bg-orange-500 border-orange-500 text-white shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {choice.name} {choice.extraPrice > 0 && `(+฿${choice.extraPrice})`}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">หมายเหตุพิเศษ</label>
              <input
                type="text"
                placeholder="เช่น ไม่ใส่ผัก, เผ็ดน้อย"
                value={specialNote}
                onChange={(e) => setSpecialNote(e.target.value)}
                className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  data-sound="pop"
                  onClick={() => setDishQuantity(Math.max(1, dishQuantity - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-100 font-bold transition-all duration-75 active:scale-90 cursor-pointer select-none"
                >
                  -
                </button>
                <span className="font-extrabold text-sm">{dishQuantity}</span>
                <button
                  type="button"
                  data-sound="pop"
                  onClick={() => setDishQuantity(dishQuantity + 1)}
                  className="w-8 h-8 rounded-lg bg-slate-100 font-bold transition-all duration-75 active:scale-90 cursor-pointer select-none"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                data-sound="success"
                onClick={handleAddToCart}
                className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-extrabold text-xs shadow-md shadow-orange-500/20 transition-all duration-75 active:scale-90 active:translate-y-0.5 cursor-pointer select-none ring-0 active:ring-2 active:ring-orange-300"
              >
                เพิ่มลงตะกร้า (฿{calculateCustomizedPrice()})
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
