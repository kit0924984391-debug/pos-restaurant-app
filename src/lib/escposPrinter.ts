/**
 * Web Bluetooth & Web Serial ESC/POS Direct Thermal Printer Driver
 * Features:
 * - Direct printing from browser without OS print dialog
 * - Canvas 1-bit Monochrome Rasterizer: solves Thai vowel clipping & missing font ROM
 * - Supports 58mm (384px) & 80mm (576px) thermal paper
 * - Cash drawer kick & paper cutter commands
 * - Persistent connection manager with safe chunking (BLE MTU safe)
 */

import { formatDateTime, formatTime, formatPrice } from '@/lib/utils';
import { generatePromptPayPayload } from '@/lib/promptpay';

// Type definitions for Web Bluetooth & Web Serial APIs
declare global {
  interface Navigator {
    bluetooth?: {
      requestDevice(options: any): Promise<any>;
    };
    serial?: {
      requestPort(options?: any): Promise<any>;
      getPorts(): Promise<any[]>;
    };
  }
}

export type PrinterConnectionType = 'bluetooth' | 'serial' | 'none';
export type PrinterPaperWidth = '58mm' | '80mm';

export interface PrinterStatus {
  connected: boolean;
  type: PrinterConnectionType;
  name: string;
}

// Common Bluetooth Printer Service UUIDs
const BLE_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard Print Service
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ae00-0000-1000-8000-00805f9b34fb',
  '0000fee7-0000-1000-8000-00805f9b34fb',
];

class EscPosManager {
  private static instance: EscPosManager;
  private connectionType: PrinterConnectionType = 'none';
  private deviceName: string = '';

  // Bluetooth
  private bleDevice: any = null;
  private bleServer: any = null;
  private bleCharacteristic: any = null;

  // Serial
  private serialPort: any = null;
  private serialWriter: any = null;

  private constructor() {}

  public static getInstance(): EscPosManager {
    if (!EscPosManager.instance) {
      EscPosManager.instance = new EscPosManager();
    }
    return EscPosManager.instance;
  }

  public getStatus(): PrinterStatus {
    const isConnected =
      (this.connectionType === 'bluetooth' && this.bleDevice?.gatt?.connected) ||
      (this.connectionType === 'serial' && this.serialPort?.readable);

    return {
      connected: !!isConnected,
      type: isConnected ? this.connectionType : 'none',
      name: this.deviceName,
    };
  }

  public isBluetoothAvailable(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.bluetooth;
  }

  public isSerialAvailable(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.serial;
  }

  /**
   * Connect to a thermal printer via Web Bluetooth
   */
  public async connectBluetooth(): Promise<{ success: boolean; name?: string; error?: string }> {
    if (!this.isBluetoothAvailable()) {
      return { success: false, error: 'เบราว์เซอร์นี้ไม่รองรับ Web Bluetooth (แนะนำ Google Chrome หรือ Edge)' };
    }

    try {
      // Disconnect any existing connection
      await this.disconnect();

      const device = await navigator.bluetooth!.requestDevice({
        acceptAllDevices: true,
        optionalServices: BLE_PRINTER_SERVICES,
      });

      if (!device) {
        return { success: false, error: 'ไม่ได้เลือกอุปกรณ์' };
      }

      device.addEventListener('gattserverdisconnected', () => {
        console.warn('[BLE] Printer disconnected');
        this.connectionType = 'none';
        this.deviceName = '';
        this.bleCharacteristic = null;
      });

      const server = await device.gatt.connect();

      // Find writable characteristic across common services
      let characteristic: any = null;

      // Try known services first
      for (const serviceUuid of BLE_PRINTER_SERVICES) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          const chars = await service.getCharacteristics();
          for (const char of chars) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              characteristic = char;
              break;
            }
          }
          if (characteristic) break;
        } catch {
          // Continue to next service
        }
      }

      // If not found in known list, try all primary services
      if (!characteristic) {
        try {
          const services = await server.getPrimaryServices();
          for (const service of services) {
            const chars = await service.getCharacteristics();
            for (const char of chars) {
              if (char.properties.write || char.properties.writeWithoutResponse) {
                characteristic = char;
                break;
              }
            }
            if (characteristic) break;
          }
        } catch (e) {
          console.warn('[BLE] Error scanning all services:', e);
        }
      }

      if (!characteristic) {
        await device.gatt.disconnect();
        return { success: false, error: 'เชื่อมต่อสำเร็จแต่ไม่พบบริการสั่งพิมพ์ (Write Characteristic)' };
      }

      this.bleDevice = device;
      this.bleServer = server;
      this.bleCharacteristic = characteristic;
      this.connectionType = 'bluetooth';
      this.deviceName = device.name || 'Bluetooth Printer';

      return { success: true, name: this.deviceName };
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        return { success: false, error: 'ยกเลิกการเลือกอุปกรณ์' };
      }
      return { success: false, error: err.message || 'เชื่อมต่อ Bluetooth ไม่สำเร็จ' };
    }
  }

  /**
   * Connect to a thermal printer via Web Serial (USB)
   */
  public async connectSerial(baudRate = 9600): Promise<{ success: boolean; name?: string; error?: string }> {
    if (!this.isSerialAvailable()) {
      return { success: false, error: 'เบราว์เซอร์นี้ไม่รองรับ Web Serial (แนะนำ Google Chrome หรือ Edge บนคอมพิวเตอร์)' };
    }

    try {
      await this.disconnect();

      const port = await navigator.serial!.requestPort();
      if (!port) {
        return { success: false, error: 'ไม่ได้เลือกพอร์ต USB / Serial' };
      }

      await port.open({ baudRate });

      const info = port.getInfo ? port.getInfo() : {};
      const devName = `USB Serial (${info.usbVendorId ? `VID:${info.usbVendorId}` : 'POS'})`;

      this.serialPort = port;
      this.serialWriter = port.writable.getWriter();
      this.connectionType = 'serial';
      this.deviceName = devName;

      return { success: true, name: devName };
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        return { success: false, error: 'ยกเลิกการเลือกพอร์ต' };
      }
      return { success: false, error: err.message || 'เชื่อมต่อ Serial ไม่สำเร็จ' };
    }
  }

  /**
   * Disconnect any active printer
   */
  public async disconnect(): Promise<void> {
    if (this.bleDevice && this.bleDevice.gatt?.connected) {
      try {
        await this.bleDevice.gatt.disconnect();
      } catch {}
    }
    this.bleDevice = null;
    this.bleServer = null;
    this.bleCharacteristic = null;

    if (this.serialWriter) {
      try {
        this.serialWriter.releaseLock();
      } catch {}
      this.serialWriter = null;
    }
    if (this.serialPort) {
      try {
        await this.serialPort.close();
      } catch {}
      this.serialPort = null;
    }

    this.connectionType = 'none';
    this.deviceName = '';
  }

  /**
   * Send binary raw ESC/POS bytes safely with chunking
   */
  public async sendBytes(data: Uint8Array): Promise<void> {
    const status = this.getStatus();
    if (!status.connected) {
      throw new Error('ยังไม่ได้เชื่อมต่อเครื่องพิมพ์ Bluetooth หรือ USB');
    }

    if (this.connectionType === 'bluetooth' && this.bleCharacteristic) {
      // Bluetooth Low Energy MTU safe chunking (typically 100 bytes per packet)
      const CHUNK_SIZE = 100;
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const slice = data.slice(i, i + CHUNK_SIZE);
        if (this.bleCharacteristic.writeValueWithoutResponse) {
          await this.bleCharacteristic.writeValueWithoutResponse(slice);
        } else {
          await this.bleCharacteristic.writeValue(slice);
        }
        // Small delay to allow printer buffer processing
        if (data.length > 200) {
          await new Promise((r) => setTimeout(r, 15));
        }
      }
    } else if (this.connectionType === 'serial' && this.serialWriter) {
      await this.serialWriter.write(data);
    }
  }
}

// ----------------------------------------------------------------------
// ESC/POS Command Builders & Canvas Rasterizer
// ----------------------------------------------------------------------

export const ESC_POS_COMMANDS = {
  INIT: new Uint8Array([0x1b, 0x40]), // Initialize
  FEED_3: new Uint8Array([0x1b, 0x64, 0x03]), // Feed 3 lines
  FEED_5: new Uint8Array([0x1b, 0x64, 0x05]), // Feed 5 lines
  CUT_FULL: new Uint8Array([0x1d, 0x56, 0x41, 0x00]), // GS V 65 0 (Full Cut)
  CUT_PARTIAL: new Uint8Array([0x1d, 0x56, 0x01]), // GS V 1 (Partial Cut)
  DRAWER_KICK: new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]), // Kick drawer pin 2
};

/**
 * Converts an HTML Canvas into 1-bit Monochrome ESC/POS Raster Bit Image format (GS v 0 0)
 * Uses slicing so large receipts never overflow the printer's hardware buffer.
 */
export function canvasToEscPosRaster(canvas: HTMLCanvasElement): Uint8Array {
  const ctx = canvas.getContext('2d');
  if (!ctx) return new Uint8Array();

  const width = canvas.width;
  const height = canvas.height;
  const widthBytes = Math.ceil(width / 8);
  const imgData = ctx.getImageData(0, 0, width, height);
  const pixels = imgData.data;

  // Process in slices of 256 vertical dots
  const SLICE_HEIGHT = 256;
  const slices: Uint8Array[] = [];

  for (let yStart = 0; yStart < height; yStart += SLICE_HEIGHT) {
    const sliceH = Math.min(SLICE_HEIGHT, height - yStart);
    const sliceDataSize = widthBytes * sliceH;

    // ESC/POS: GS v 0 0 xL xH yL yH
    const header = new Uint8Array([
      0x1d,
      0x76,
      0x30,
      0x00,
      widthBytes & 0xff,
      (widthBytes >> 8) & 0xff,
      sliceH & 0xff,
      (sliceH >> 8) & 0xff,
    ]);

    const sliceBitmap = new Uint8Array(sliceDataSize);

    for (let y = 0; y < sliceH; y++) {
      const globalY = yStart + y;
      for (let x = 0; x < width; x++) {
        const pixelIdx = (globalY * width + x) * 4;
        const r = pixels[pixelIdx];
        const g = pixels[pixelIdx + 1];
        const b = pixels[pixelIdx + 2];
        const a = pixels[pixelIdx + 3];

        // Luminance thresholding
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        const isBlack = a > 64 && luminance < 190;

        if (isBlack) {
          const byteIndex = y * widthBytes + Math.floor(x / 8);
          const bitIndex = 7 - (x % 8);
          sliceBitmap[byteIndex] |= 1 << bitIndex;
        }
      }
    }

    const slicePacket = new Uint8Array(header.length + sliceBitmap.length);
    slicePacket.set(header, 0);
    slicePacket.set(sliceBitmap, header.length);
    slices.push(slicePacket);
  }

  // Combine slices
  const totalLen = slices.reduce((sum, s) => sum + s.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const s of slices) {
    result.set(s, offset);
    offset += s.length;
  }
  return result;
}

// ----------------------------------------------------------------------
// Canvas Builders for Thai Receipt & Kitchen Ticket
// ----------------------------------------------------------------------

interface DrawContextHelper {
  ctx: CanvasRenderingContext2D;
  width: number;
  y: number;
  fontFamily: string;
}

/**
 * Renders a crisp receipt directly onto an HTML Canvas
 */
export async function renderReceiptToCanvas(
  order: any,
  store?: any,
  options: { width?: PrinterPaperWidth; qrSvgElement?: SVGElement | null } = {}
): Promise<HTMLCanvasElement> {
  const paperWidth = options.width || '80mm';
  const canvasWidth = paperWidth === '58mm' ? 384 : 576;
  const is58mm = paperWidth === '58mm';

  const fontFamily = "'Sarabun', 'Prompt', 'Kanit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  // Temporary canvas to calculate height
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  // Estimate height generously, will crop if needed
  canvas.height = 2400;
  const ctx = canvas.getContext('2d')!;

  // Fill White Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvas.height);
  ctx.fillStyle = '#000000';

  const storeInfo = store || order;
  const storeName = storeInfo?.name || storeInfo?.storeName || 'ร้านอาหารตามสั่ง';
  const storeAddress = storeInfo?.address || '';
  const storePhone = storeInfo?.phone || '';

  const items = order.items || (order.orders ? order.orders.flatMap((o: any) => o.items || []) : []);
  const totalAmount = order.totalAmount || 0;
  const discountAmount = order.discountAmount || 0;
  const netAmount = order.netAmount || Math.max(0, totalAmount - discountAmount);

  const billNo =
    order.orderId ||
    order.id ||
    `BILL-${order.tableId || order.tableNo || 'POS'}-${new Date().getTime().toString().slice(-4)}`;

  const isPreCheck =
    order.isPreCheck ||
    order.paymentMethod === 'PENDING' ||
    !order.paidAt ||
    order.paymentStatus === 'UNPAID';

  let currentY = 24;

  const drawDashedLine = (y: number) => {
    ctx.beginPath();
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';
    ctx.moveTo(10, y);
    ctx.lineTo(canvasWidth - 10, y);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const drawSolidLine = (y: number, thick = 2) => {
    ctx.beginPath();
    ctx.lineWidth = thick;
    ctx.strokeStyle = '#000000';
    ctx.moveTo(10, y);
    ctx.lineTo(canvasWidth - 10, y);
    ctx.stroke();
  };

  // 1. Header Store Name
  ctx.textAlign = 'center';
  ctx.font = `bold ${is58mm ? 22 : 28}px ${fontFamily}`;
  ctx.fillText(storeName, canvasWidth / 2, currentY);
  currentY += is58mm ? 26 : 32;

  // Address & Phone
  if (storeAddress) {
    ctx.font = `normal ${is58mm ? 13 : 15}px ${fontFamily}`;
    ctx.fillText(storeAddress, canvasWidth / 2, currentY);
    currentY += 20;
  }
  if (storePhone) {
    ctx.font = `normal ${is58mm ? 13 : 15}px ${fontFamily}`;
    ctx.fillText(`โทร: ${storePhone}`, canvasWidth / 2, currentY);
    currentY += 22;
  }

  // Pre-check / Receipt Badge
  currentY += 6;
  ctx.font = `bold ${is58mm ? 15 : 18}px ${fontFamily}`;
  const slipTitle = isPreCheck ? 'ใบแจ้งยอดชำระเงิน (ยังไม่ได้ชำระ)' : 'ใบเสร็จรับเงิน / ใบกำกับภาษีอย่างย่อ';
  ctx.fillText(slipTitle, canvasWidth / 2, currentY);
  currentY += 16;

  drawDashedLine(currentY);
  currentY += 22;

  // 2. Order Meta
  ctx.textAlign = 'left';
  ctx.font = `normal ${is58mm ? 13 : 15}px ${fontFamily}`;
  ctx.fillText(`เลขที่บิล: #${String(billNo).slice(-8)}`, 14, currentY);
  ctx.textAlign = 'right';
  ctx.fillText(`วันที่: ${formatDateTime(new Date())}`, canvasWidth - 14, currentY);
  currentY += 22;

  ctx.textAlign = 'left';
  const tableTitle = order.table?.name || (order.tableNo ? `โต๊ะ ${order.tableNo}` : 'หน้าร้าน / กลับบ้าน');
  ctx.font = `bold ${is58mm ? 14 : 16}px ${fontFamily}`;
  ctx.fillText(`โต๊ะ / ออเดอร์: ${tableTitle}`, 14, currentY);
  ctx.textAlign = 'right';
  const paymentLabel = isPreCheck
    ? 'รอชำระ'
    : order.paymentMethod === 'TRANSFER'
    ? 'โอนเงิน (PromptPay)'
    : 'เงินสด';
  ctx.fillText(`วิธีชำระ: ${paymentLabel}`, canvasWidth - 14, currentY);
  currentY += 24;

  drawSolidLine(currentY, 2);
  currentY += 20;

  // 3. Items Table Header
  ctx.font = `bold ${is58mm ? 13 : 15}px ${fontFamily}`;
  ctx.textAlign = 'left';
  ctx.fillText('รายการ', 14, currentY);
  ctx.textAlign = 'center';
  ctx.fillText('จน.', canvasWidth - 110, currentY);
  ctx.textAlign = 'right';
  ctx.fillText('รวม', canvasWidth - 14, currentY);
  currentY += 14;

  drawDashedLine(currentY);
  currentY += 20;

  // 4. Item Rows
  items.forEach((item: any, idx: number) => {
    ctx.textAlign = 'left';
    ctx.font = `bold ${is58mm ? 13 : 15}px ${fontFamily}`;
    const itemName = `${idx + 1}. ${item.name}`;
    ctx.fillText(itemName, 14, currentY);

    ctx.textAlign = 'center';
    ctx.font = `bold ${is58mm ? 13 : 15}px ${fontFamily}`;
    ctx.fillText(String(item.quantity || 1), canvasWidth - 110, currentY);

    ctx.textAlign = 'right';
    const itemTotal = (item.price || 0) * (item.quantity || 1);
    ctx.fillText(`฿${itemTotal.toLocaleString()}`, canvasWidth - 14, currentY);
    currentY += 18;

    // Selected Options
    let parsedOptions: any[] = [];
    if (item.selectedOptions) {
      try {
        parsedOptions = typeof item.selectedOptions === 'string' ? JSON.parse(item.selectedOptions) : item.selectedOptions;
      } catch {}
    }

    if (parsedOptions.length > 0) {
      ctx.textAlign = 'left';
      ctx.font = `normal ${is58mm ? 11 : 13}px ${fontFamily}`;
      parsedOptions.forEach((opt: any) => {
        ctx.fillText(`  • ${opt.choice || opt.name}`, 24, currentY);
        currentY += 16;
      });
    }

    // Special Note
    if (item.specialNote) {
      ctx.textAlign = 'left';
      ctx.font = `italic ${is58mm ? 11 : 13}px ${fontFamily}`;
      ctx.fillText(`  * ${item.specialNote}`, 24, currentY);
      currentY += 16;
    }

    currentY += 6;
  });

  drawSolidLine(currentY, 2);
  currentY += 24;

  // 5. Summary (Subtotal, Discount, Net Amount)
  ctx.textAlign = 'left';
  ctx.font = `normal ${is58mm ? 13 : 15}px ${fontFamily}`;
  ctx.fillText('ยอดรวมรายการ:', 14, currentY);
  ctx.textAlign = 'right';
  ctx.fillText(`฿${totalAmount.toLocaleString()}`, canvasWidth - 14, currentY);
  currentY += 22;

  if (discountAmount > 0) {
    ctx.textAlign = 'left';
    ctx.fillText('ส่วนลด:', 14, currentY);
    ctx.textAlign = 'right';
    ctx.fillText(`-฿${discountAmount.toLocaleString()}`, canvasWidth - 14, currentY);
    currentY += 22;
  }

  drawDashedLine(currentY);
  currentY += 26;

  // Net Grand Total
  ctx.textAlign = 'left';
  ctx.font = `bold ${is58mm ? 18 : 22}px ${fontFamily}`;
  ctx.fillText('ยอดสุทธิ (Net Total):', 14, currentY);
  ctx.textAlign = 'right';
  ctx.fillText(`฿${netAmount.toLocaleString()}`, canvasWidth - 14, currentY);
  currentY += 30;

  drawSolidLine(currentY, 2);
  currentY += 24;

  // 6. PromptPay QR Code if Pre-Check and PromptPay ID configured
  const promptPayId = storeInfo?.promptPayId || order?.promptPayId;
  if (isPreCheck && promptPayId && netAmount > 0) {
    ctx.textAlign = 'center';
    ctx.font = `bold ${is58mm ? 13 : 15}px ${fontFamily}`;
    ctx.fillText('สแกนจ่ายผ่านพร้อมเพย์ (PromptPay)', canvasWidth / 2, currentY);
    currentY += 16;

    // Try finding rendered SVG in document or options
    const svgElem = options.qrSvgElement || document.querySelector('#printable-receipt svg');
    if (svgElem) {
      try {
        const svgXml = new XMLSerializer().serializeToString(svgElem);
        const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgXml);
        const qrImg = new Image();
        await new Promise((resolve) => {
          qrImg.onload = resolve;
          qrImg.onerror = resolve;
          qrImg.src = svgDataUrl;
        });
        const qrSize = is58mm ? 150 : 200;
        ctx.drawImage(qrImg, (canvasWidth - qrSize) / 2, currentY, qrSize, qrSize);
        currentY += qrSize + 14;
      } catch (err) {
        console.warn('QR draw failed:', err);
      }
    }

    ctx.font = `normal ${is58mm ? 11 : 13}px ${fontFamily}`;
    ctx.fillText(`หมายเลข: ${promptPayId}`, canvasWidth / 2, currentY);
    currentY += 18;
  }

  // 7. Footer
  currentY += 10;
  ctx.textAlign = 'center';
  ctx.font = `normal ${is58mm ? 12 : 14}px ${fontFamily}`;
  ctx.fillText(storeInfo?.receiptFooter || 'ขอบคุณที่มาอุดหนุนครับ 🙏', canvasWidth / 2, currentY);
  currentY += 20;
  ctx.font = `normal ${is58mm ? 10 : 12}px ${fontFamily}`;
  ctx.fillText('Powered by Order POS', canvasWidth / 2, currentY);
  currentY += 24;

  // Crop canvas to actual height
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = canvasWidth;
  finalCanvas.height = currentY;
  const finalCtx = finalCanvas.getContext('2d')!;
  finalCtx.drawImage(canvas, 0, 0);

  return finalCanvas;
}

/**
 * Renders a crisp Kitchen Ticket (KOT) directly onto an HTML Canvas
 */
export async function renderKitchenTicketToCanvas(
  order: any,
  store?: any,
  options: { width?: PrinterPaperWidth } = {}
): Promise<HTMLCanvasElement> {
  const paperWidth = options.width || '80mm';
  const canvasWidth = paperWidth === '58mm' ? 384 : 576;
  const is58mm = paperWidth === '58mm';

  const fontFamily = "'Sarabun', 'Prompt', 'Kanit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = 2400;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvas.height);
  ctx.fillStyle = '#000000';

  const isDelivery = ['LINEMAN', 'GRAB', 'SHOPEE_FOOD', 'ROBINHOOD', 'FOODPANDA', 'KLIKIT'].includes(order.orderChannel);
  const channelLabel =
    order.orderChannel === 'LINEMAN'
      ? '🛵 LINE MAN'
      : order.orderChannel === 'GRAB'
      ? '🛵 GrabFood'
      : order.orderChannel === 'SHOPEE_FOOD'
      ? '🛵 ShopeeFood'
      : order.orderChannel === 'ROBINHOOD'
      ? '🛵 Robinhood'
      : order.orderType === 'TAKEAWAY'
      ? '🛍️ สั่งกลับบ้าน'
      : '🍽️ ทานที่ร้าน';

  const orderTitle = isDelivery
    ? `เดลิเวอรี #${order.deliveryOrderId || order.id?.slice(-4) || 'DELIVERY'}`
    : order.table?.name || (order.tableNo ? `โต๊ะ ${order.tableNo}` : 'ออเดอร์');

  const storeName = store?.name || store?.storeName || 'ใบสั่งอาหารห้องครัว';
  const items = order.items || [];
  const totalQty = items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0);

  let currentY = 24;

  const drawDashedLine = (y: number) => {
    ctx.beginPath();
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';
    ctx.moveTo(10, y);
    ctx.lineTo(canvasWidth - 10, y);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const drawSolidLine = (y: number, thick = 2) => {
    ctx.beginPath();
    ctx.lineWidth = thick;
    ctx.strokeStyle = '#000000';
    ctx.moveTo(10, y);
    ctx.lineTo(canvasWidth - 10, y);
    ctx.stroke();
  };

  // 1. Kitchen Header
  ctx.textAlign = 'center';
  ctx.font = `bold ${is58mm ? 18 : 22}px ${fontFamily}`;
  ctx.fillText(`*** ${storeName} ***`, canvasWidth / 2, currentY);
  currentY += is58mm ? 22 : 26;

  ctx.font = `normal ${is58mm ? 12 : 14}px ${fontFamily}`;
  ctx.fillText(`พิมพ์: ${formatDateTime(new Date())}`, canvasWidth / 2, currentY);
  currentY += 16;

  drawDashedLine(currentY);
  currentY += 16;

  // 2. Large Order / Table Banner
  ctx.fillStyle = '#000000';
  ctx.font = `bold ${is58mm ? 14 : 16}px ${fontFamily}`;
  ctx.fillText(channelLabel, canvasWidth / 2, currentY);
  currentY += 24;

  ctx.font = `900 ${is58mm ? 26 : 34}px ${fontFamily}`;
  ctx.fillText(orderTitle, canvasWidth / 2, currentY);
  currentY += is58mm ? 26 : 32;

  if (order.customerName) {
    ctx.font = `bold ${is58mm ? 13 : 15}px ${fontFamily}`;
    ctx.fillText(`ลูกค้า: ${order.customerName}`, canvasWidth / 2, currentY);
    currentY += 20;
  }
  if (order.riderName) {
    ctx.font = `bold ${is58mm ? 13 : 15}px ${fontFamily}`;
    ctx.fillText(`ไรเดอร์: ${order.riderName}`, canvasWidth / 2, currentY);
    currentY += 20;
  }

  currentY += 6;
  drawSolidLine(currentY, 3);
  currentY += 22;

  // Order Note
  if (order.note) {
    ctx.font = `bold ${is58mm ? 14 : 16}px ${fontFamily}`;
    ctx.textAlign = 'left';
    ctx.fillText(`⚠️ หมายเหตุบิล: ${order.note}`, 14, currentY);
    currentY += 24;
    drawDashedLine(currentY);
    currentY += 20;
  }

  // 3. Items Header
  ctx.textAlign = 'left';
  ctx.font = `bold ${is58mm ? 13 : 15}px ${fontFamily}`;
  ctx.fillText(`รายการ (${totalQty} จาน)`, 14, currentY);
  ctx.textAlign = 'right';
  ctx.fillText('จำนวน', canvasWidth - 14, currentY);
  currentY += 14;

  drawSolidLine(currentY, 2);
  currentY += 24;

  // 4. Item Rows with Big Quantity Badge
  items.forEach((item: any, idx: number) => {
    ctx.textAlign = 'left';
    ctx.font = `bold ${is58mm ? 16 : 19}px ${fontFamily}`;
    const itemName = `${idx + 1}. ${item.name}`;
    ctx.fillText(itemName, 14, currentY);

    // Quantity (Huge bold)
    ctx.textAlign = 'right';
    ctx.font = `900 ${is58mm ? 22 : 26}px ${fontFamily}`;
    ctx.fillText(`x ${item.quantity || 1}`, canvasWidth - 14, currentY);
    currentY += 22;

    // Options
    let parsedOptions: any[] = [];
    if (item.selectedOptions) {
      try {
        parsedOptions = typeof item.selectedOptions === 'string' ? JSON.parse(item.selectedOptions) : item.selectedOptions;
      } catch {}
    }

    if (parsedOptions.length > 0) {
      ctx.textAlign = 'left';
      ctx.font = `normal ${is58mm ? 12 : 14}px ${fontFamily}`;
      parsedOptions.forEach((opt: any) => {
        ctx.fillText(`   • ${opt.choice || opt.name}`, 20, currentY);
        currentY += 18;
      });
    }

    // Special Note
    if (item.specialNote) {
      ctx.textAlign = 'left';
      ctx.font = `bold ${is58mm ? 13 : 15}px ${fontFamily}`;
      ctx.fillText(`   * ${item.specialNote}`, 20, currentY);
      currentY += 20;
    }

    currentY += 6;
    drawDashedLine(currentY);
    currentY += 20;
  });

  currentY += 6;
  ctx.textAlign = 'center';
  ctx.font = `bold ${is58mm ? 12 : 14}px ${fontFamily}`;
  ctx.fillText('*** จบรายการสั่งอาหารห้องครัว ***', canvasWidth / 2, currentY);
  currentY += 24;

  // Crop canvas
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = canvasWidth;
  finalCanvas.height = currentY;
  const finalCtx = finalCanvas.getContext('2d')!;
  finalCtx.drawImage(canvas, 0, 0);

  return finalCanvas;
}

// ----------------------------------------------------------------------
// High-Level Printing API
// ----------------------------------------------------------------------

export const escPosPrinter = {
  getManager(): EscPosManager {
    return EscPosManager.getInstance();
  },

  getStatus(): PrinterStatus {
    return EscPosManager.getInstance().getStatus();
  },

  isBluetoothAvailable(): boolean {
    return EscPosManager.getInstance().isBluetoothAvailable();
  },

  isSerialAvailable(): boolean {
    return EscPosManager.getInstance().isSerialAvailable();
  },

  async connectBluetooth(): Promise<{ success: boolean; name?: string; error?: string }> {
    return EscPosManager.getInstance().connectBluetooth();
  },

  async connectSerial(baudRate = 9600): Promise<{ success: boolean; name?: string; error?: string }> {
    return EscPosManager.getInstance().connectSerial(baudRate);
  },

  async disconnect(): Promise<void> {
    return EscPosManager.getInstance().disconnect();
  },

  /**
   * Kick Cash Drawer
   */
  async kickDrawer(): Promise<{ success: boolean; error?: string }> {
    const mgr = EscPosManager.getInstance();
    try {
      await mgr.sendBytes(ESC_POS_COMMANDS.DRAWER_KICK);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Directly prints a Customer Receipt via Bluetooth or Serial
   */
  async printDirectReceipt(
    order: any,
    store?: any,
    options: {
      copies?: number;
      width?: PrinterPaperWidth;
      openDrawer?: boolean;
      qrSvgElement?: SVGElement | null;
    } = {}
  ): Promise<{ success: boolean; error?: string }> {
    const mgr = EscPosManager.getInstance();
    const status = mgr.getStatus();

    if (!status.connected) {
      return {
        success: false,
        error: 'ยังไม่ได้เชื่อมต่อเครื่องพิมพ์บลูทูธหรือ USB (กรุณากดเชื่อมต่อก่อนพิมพ์)',
      };
    }

    try {
      const copies = options.copies || 1;
      const width = options.width || store?.printerPaperWidth || '80mm';

      // Render to offscreen canvas
      const canvas = await renderReceiptToCanvas(order, store, {
        width,
        qrSvgElement: options.qrSvgElement,
      });

      // Convert canvas to ESC/POS raster bitmap bytes
      const rasterBytes = canvasToEscPosRaster(canvas);

      // Assemble full payload: Init -> Bitmap -> Feed -> Cut
      for (let i = 0; i < copies; i++) {
        const packets: Uint8Array[] = [
          ESC_POS_COMMANDS.INIT,
          rasterBytes,
          ESC_POS_COMMANDS.FEED_5,
          ESC_POS_COMMANDS.CUT_PARTIAL,
        ];

        if (options.openDrawer && i === 0) {
          packets.push(ESC_POS_COMMANDS.DRAWER_KICK);
        }

        const totalLen = packets.reduce((s, p) => s + p.length, 0);
        const fullPayload = new Uint8Array(totalLen);
        let offset = 0;
        for (const p of packets) {
          fullPayload.set(p, offset);
          offset += p.length;
        }

        await mgr.sendBytes(fullPayload);
      }

      return { success: true };
    } catch (err: any) {
      console.error('[escPosPrinter] Print direct receipt error:', err);
      return { success: false, error: err.message || 'ส่งพิมพ์ไปยังเครื่องพิมพ์ไม่สำเร็จ' };
    }
  },

  /**
   * Directly prints a Kitchen Order Ticket (KOT) via Bluetooth or Serial
   */
  async printDirectKitchenTicket(
    order: any,
    store?: any,
    options: { width?: PrinterPaperWidth } = {}
  ): Promise<{ success: boolean; error?: string }> {
    const mgr = EscPosManager.getInstance();
    const status = mgr.getStatus();

    if (!status.connected) {
      return {
        success: false,
        error: 'ยังไม่ได้เชื่อมต่อเครื่องพิมพ์บลูทูธหรือ USB (กรุณากดเชื่อมต่อก่อนพิมพ์)',
      };
    }

    try {
      const width = options.width || store?.printerPaperWidth || '80mm';
      const canvas = await renderKitchenTicketToCanvas(order, store, { width });
      const rasterBytes = canvasToEscPosRaster(canvas);

      const packets = [
        ESC_POS_COMMANDS.INIT,
        rasterBytes,
        ESC_POS_COMMANDS.FEED_5,
        ESC_POS_COMMANDS.CUT_PARTIAL,
      ];

      const totalLen = packets.reduce((s, p) => s + p.length, 0);
      const fullPayload = new Uint8Array(totalLen);
      let offset = 0;
      for (const p of packets) {
        fullPayload.set(p, offset);
        offset += p.length;
      }

      await mgr.sendBytes(fullPayload);
      return { success: true };
    } catch (err: any) {
      console.error('[escPosPrinter] Print direct kitchen ticket error:', err);
      return { success: false, error: err.message || 'ส่งพิมพ์สลิปครัวไม่สำเร็จ' };
    }
  },
};
