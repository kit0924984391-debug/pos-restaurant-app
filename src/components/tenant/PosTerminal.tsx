'use client';

import React from 'react';
import ReceiptPrintModal from '@/components/ReceiptPrintModal';
import CashierOrderModal from './pos/CashierOrderModal';
import TableActionModals from './pos/TableActionModals';
import ServiceCallModal from './pos/ServiceCallModal';
import BankAlertModal from './pos/BankAlertModal';
import CheckoutModal from './pos/CheckoutModal';

import { usePosTerminalController } from './pos/usePosTerminalController';
import PosMobileView from './pos/views/PosMobileView';
import PosTabletView from './pos/views/PosTabletView';
import PosDesktopView from './pos/views/PosDesktopView';

export default function PosTerminal({
  slug = 'lung-pa',
  isSplitView = false,
}: {
  slug?: string;
  isSplitView?: boolean;
}) {
  const controller = usePosTerminalController({ slug, isSplitView });

  const {
    isCashierOrderOpen,
    setIsCashierOrderOpen,
    selectedTable,
    setSelectedTable,
    categories,
    store,
    orderChannel,
    setOrderChannel,
    deliveryOrderId,
    setDeliveryOrderId,
    riderName,
    setRiderName,
    riderPhone,
    setRiderPhone,
    fetchData,
    isMoveModalOpen,
    setIsMoveModalOpen,
    isAddTableModalOpen,
    setIsAddTableModalOpen,
    tables,
    isServiceCallModalOpen,
    setIsServiceCallModalOpen,
    serviceCallQueue,
    activeServiceCallIndex,
    setActiveServiceCallIndex,
    dismissServiceCall,
    dismissAllServiceCalls,
    handleOpenCheckoutForTable,
    serviceCallAlertMode,
    updateServiceCallAlertMode,
    isAlertModalOpen,
    setIsAlertModalOpen,
    bankAlertQueue,
    activeAlertId,
    setActiveAlertId,
    dismissCurrentAlert,
    resolveAlertAndNext,
    voiceEnabled,
    setReceiptOrder,
    isReceiptModalOpen,
    setIsReceiptModalOpen,
    isPayModalOpen,
    setIsPayModalOpen,
    receiptOrder,
  } = controller;

  return (
    <div className="w-full flex-1 flex flex-col">
      {/* 
        ========================================================================
        DEVICE VIEW ISOLATION LAYER:
        - Mobile View (< 768px): 100% isolated in PosMobileView.tsx
        - Tablet View (768px - 1023px): 100% isolated in PosTabletView.tsx
        - PC / Desktop View (>= 1024px): 100% isolated in PosDesktopView.tsx
        Any styling or markup changes in one device view will NEVER affect others!
        ========================================================================
      */}

      {/* 1. Mobile View (< 768px) */}
      <div className="block md:hidden w-full">
        <PosMobileView controller={controller} />
      </div>

      {/* 2. Tablet View (768px - 1023px) */}
      <div className="hidden md:block lg:hidden w-full">
        <PosTabletView controller={controller} />
      </div>

      {/* 3. PC / Desktop View (>= 1024px) */}
      <div className="hidden lg:block w-full">
        <PosDesktopView controller={controller} />
      </div>

      {/* 
        ========================================================================
        SHARED MODAL MODULES (Orchestrated at Root Terminal Level)
        ========================================================================
      */}
      <CashierOrderModal
        isOpen={isCashierOrderOpen}
        onClose={() => setIsCashierOrderOpen(false)}
        selectedTable={selectedTable}
        categories={categories}
        store={store}
        slug={slug}
        orderChannel={orderChannel}
        setOrderChannel={setOrderChannel}
        deliveryOrderId={deliveryOrderId}
        setDeliveryOrderId={setDeliveryOrderId}
        riderName={riderName}
        setRiderName={setRiderName}
        riderPhone={riderPhone}
        setRiderPhone={setRiderPhone}
        onOrderSuccess={() => {
          setIsCashierOrderOpen(false);
          setDeliveryOrderId('');
          setRiderName('');
          setRiderPhone('');
          setOrderChannel('DINE_IN');
          fetchData();
        }}
      />

      <TableActionModals
        isMoveModalOpen={isMoveModalOpen}
        onCloseMove={() => setIsMoveModalOpen(false)}
        isAddTableModalOpen={isAddTableModalOpen}
        onCloseAdd={() => setIsAddTableModalOpen(false)}
        selectedTable={selectedTable}
        tables={tables}
        slug={slug}
        onSuccess={() => fetchData()}
      />

      <ServiceCallModal
        isOpen={isServiceCallModalOpen}
        onClose={() => setIsServiceCallModalOpen(false)}
        onOpen={() => setIsServiceCallModalOpen(true)}
        serviceCallQueue={serviceCallQueue}
        activeServiceCallIndex={activeServiceCallIndex}
        setActiveServiceCallIndex={setActiveServiceCallIndex}
        dismissServiceCall={dismissServiceCall}
        dismissAllServiceCalls={dismissAllServiceCalls}
        tables={tables}
        onOpenCheckoutForTable={handleOpenCheckoutForTable}
        serviceCallAlertMode={serviceCallAlertMode}
        updateServiceCallAlertMode={updateServiceCallAlertMode}
      />

      <BankAlertModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        onOpen={() => setIsAlertModalOpen(true)}
        bankAlertQueue={bankAlertQueue}
        activeAlertId={activeAlertId}
        setActiveAlertId={setActiveAlertId}
        dismissCurrentAlert={dismissCurrentAlert}
        resolveAlertAndNext={resolveAlertAndNext}
        tables={tables}
        store={store}
        slug={slug}
        voiceEnabled={voiceEnabled}
        setReceiptOrder={setReceiptOrder}
        setIsReceiptModalOpen={setIsReceiptModalOpen}
        fetchData={fetchData}
      />

      <CheckoutModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        selectedTable={selectedTable}
        store={store}
        slug={slug}
        voiceEnabled={voiceEnabled}
        onPaidSuccess={() => {
          setSelectedTable(null);
          fetchData();
        }}
        onPrintReceipt={(receiptData) => {
          setReceiptOrder(receiptData);
          setIsReceiptModalOpen(true);
        }}
        onPreCheckPrint={(receiptData) => {
          setReceiptOrder(receiptData);
          setIsReceiptModalOpen(true);
        }}
      />

      {/* Receipt Print Modal */}
      {isReceiptModalOpen && receiptOrder && (
        <ReceiptPrintModal
          isOpen={isReceiptModalOpen}
          onClose={() => {
            setIsReceiptModalOpen(false);
            setReceiptOrder(null);
          }}
          order={receiptOrder}
          store={store}
        />
      )}
    </div>
  );
}
