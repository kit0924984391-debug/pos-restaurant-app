'use client';

import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  FolderPlus,
  RefreshCw,
  X,
  Search,
  Settings2,
  Copy,
  ArrowUp,
  ArrowDown,
  Check,
  Sparkles,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { formatPrice, formatImageUrl } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';

const QUICK_PRESETS = [
  {
    name: '🌶️ ระดับความเผ็ด',
    description: 'ไม่ใส่พริก, เผ็ดน้อย, เผ็ดกลาง, เผ็ดมาก, เผ็ดจัด',
    group: {
      title: 'ระดับความเผ็ด',
      isRequired: true,
      isMulti: false,
      choices: [
        { name: 'ไม่ใส่พริก (เด็กทานได้)', extraPrice: 0 },
        { name: 'เผ็ดน้อย (พริก 1-2 เม็ด)', extraPrice: 0 },
        { name: 'เผ็ดกลาง (มาตรฐาน)', extraPrice: 0 },
        { name: 'เผ็ดมาก (พริกคั่วจัดเต็ม)', extraPrice: 0 },
        { name: 'เผ็ดพ่นไฟ / เผ็ดจัด', extraPrice: 0 },
      ],
    },
  },
  {
    name: '🥩 เลือกเนื้อสัตว์',
    description: 'หมูสับ/ชิ้น, ไก่, หมูกรอบ (+15), เนื้อวัว (+20), ทะเล (+25)',
    group: {
      title: 'เลือกเนื้อสัตว์',
      isRequired: true,
      isMulti: false,
      choices: [
        { name: 'หมูสับ/หมูชิ้น', extraPrice: 0 },
        { name: 'ไก่ชิ้น', extraPrice: 0 },
        { name: 'หมูกรอบ (ยอดฮิต)', extraPrice: 15 },
        { name: 'เนื้อวัว', extraPrice: 20 },
        { name: 'ทะเลรวม (กุ้ง+หมึก)', extraPrice: 25 },
        { name: 'รวมมิตรทุกอย่าง', extraPrice: 30 },
      ],
    },
  },
  {
    name: '🍳 เพิ่มไข่ / ท็อปปิ้ง',
    description: 'ไข่ดาว (+10), ไข่เจียว (+15), ไข่เยี่ยวม้า (+20)',
    group: {
      title: 'เพิ่มไข่ / ท็อปปิ้ง',
      isRequired: false,
      isMulti: true,
      choices: [
        { name: 'ไข่ดาวไม่สุก', extraPrice: 10 },
        { name: 'ไข่ดาวสุกกรอบ', extraPrice: 10 },
        { name: 'ไข่เจียวหมูสับ', extraPrice: 20 },
        { name: 'ไข่เยี่ยวม้า', extraPrice: 20 },
        { name: 'ไข่เค็ม', extraPrice: 15 },
      ],
    },
  },
  {
    name: '🍚 ขนาดจาน / พิเศษ',
    description: 'ธรรมดา, พิเศษ (+10), เพิ่มข้าวสวย (+10)',
    group: {
      title: 'ขนาดจาน',
      isRequired: false,
      isMulti: false,
      choices: [
        { name: 'ธรรมดา', extraPrice: 0 },
        { name: 'พิเศษ', extraPrice: 10 },
        { name: 'เพิ่มข้าวสวย', extraPrice: 10 },
        { name: 'กับข้าวล้วน (ไม่เอาข้าว)', extraPrice: 15 },
      ],
    },
  },
];

export default function AdminMenuView({ slug = 'lung-pa' }: { slug?: string }) {
  const { showSuccess, showError, showWarning } = useToast();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Options Management State
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [selectedItemForOptions, setSelectedItemForOptions] = useState<any>(null);
  const [optionGroups, setOptionGroups] = useState<any[]>([]);
  const [isSavingOptions, setIsSavingOptions] = useState(false);
  const [copySourceItemId, setCopySourceItemId] = useState('');
  const [deleteGroupConfirmIdx, setDeleteGroupConfirmIdx] = useState<number | null>(null);

  // Add Item Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);

  // Form State for new item
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemImage, setItemImage] = useState('');
  const [categoryName, setCategoryName] = useState('');

  // Edit Item State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editImage, setEditImage] = useState('');

  // Delete Item State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMenu = async () => {
    try {
      const res = await fetch(`/api/r/${slug}/menu`);
      const data = await res.json().catch(() => []);
      const safeData = Array.isArray(data) ? data : [];
      setCategories(safeData);
      if (safeData.length > 0 && !itemCategory) {
        setItemCategory(safeData[0].id);
      }
    } catch (err) {
      console.error('Error fetching menu:', err);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, [slug]);

  const allMenuItems = React.useMemo(() => {
    return categories.flatMap((c) => c.items || []);
  }, [categories]);

  // Options Manager Handlers
  const openOptionsModal = (item: any) => {
    setSelectedItemForOptions(item);
    setCopySourceItemId('');
    setDeleteGroupConfirmIdx(null);
    const mapped = (item.options || []).map((g: any) => ({
      id: g.id || `g-${Date.now()}-${Math.random()}`,
      title: g.title || '',
      isRequired: Boolean(g.isRequired),
      isMulti: Boolean(g.isMulti),
      choices: (g.choices || []).map((c: any) => ({
        id: c.id || `c-${Date.now()}-${Math.random()}`,
        name: c.name || '',
        extraPrice: c.extraPrice !== undefined ? c.extraPrice : 0,
      })),
    }));
    setOptionGroups(mapped);
    setIsOptionsModalOpen(true);
  };

  const handleAddEmptyGroup = () => {
    setOptionGroups((prev) => [
      ...prev,
      {
        id: `g-${Date.now()}-${Math.random()}`,
        title: '',
        isRequired: false,
        isMulti: false,
        choices: [{ id: `c-${Date.now()}-1`, name: '', extraPrice: 0 }],
      },
    ]);
  };

  const handleAddPresetGroup = (presetGroup: any) => {
    const cloned = {
      id: `g-${Date.now()}-${Math.random()}`,
      title: presetGroup.title,
      isRequired: presetGroup.isRequired,
      isMulti: presetGroup.isMulti,
      choices: presetGroup.choices.map((c: any) => ({
        id: `c-${Date.now()}-${Math.random()}`,
        name: c.name,
        extraPrice: c.extraPrice,
      })),
    };
    setOptionGroups((prev) => [...prev, cloned]);
    showSuccess('เพิ่มเทมเพลตสำเร็จ ⚡', `เพิ่มกลุ่ม "${presetGroup.title}" เรียบร้อย`);
  };

  const handleCopyFromAnotherItem = () => {
    if (!copySourceItemId) return;
    const sourceItem = allMenuItems.find((m) => m.id === copySourceItemId);
    if (!sourceItem || !sourceItem.options || sourceItem.options.length === 0) {
      showWarning('ไม่พบตัวเลือก', 'เมนูต้นทางที่เลือกไม่มีกลุ่มตัวเลือก');
      return;
    }

    const copied = sourceItem.options.map((g: any) => ({
      id: `g-${Date.now()}-${Math.random()}`,
      title: g.title,
      isRequired: Boolean(g.isRequired),
      isMulti: Boolean(g.isMulti),
      choices: (g.choices || []).map((c: any) => ({
        id: `c-${Date.now()}-${Math.random()}`,
        name: c.name,
        extraPrice: c.extraPrice || 0,
      })),
    }));

    setOptionGroups((prev) => [...prev, ...copied]);
    showSuccess('คัดลอกตัวเลือกสำเร็จ 📋', `ดึงตัวเลือก ${copied.length} กลุ่ม จาก "${sourceItem.name}" เรียบร้อย`);
    setCopySourceItemId('');
  };

  const handleUpdateGroupField = (gIdx: number, field: string, value: any) => {
    setOptionGroups((prev) => {
      const updated = [...prev];
      updated[gIdx] = { ...updated[gIdx], [field]: value };
      return updated;
    });
  };

  const handleUpdateChoiceField = (gIdx: number, cIdx: number, field: string, value: any) => {
    setOptionGroups((prev) => {
      const updated = [...prev];
      const choices = [...updated[gIdx].choices];
      choices[cIdx] = { ...choices[cIdx], [field]: value };
      updated[gIdx] = { ...updated[gIdx], choices };
      return updated;
    });
  };

  const handleMoveGroup = (gIdx: number, dir: 'UP' | 'DOWN') => {
    setOptionGroups((prev) => {
      const updated = [...prev];
      const targetIdx = dir === 'UP' ? gIdx - 1 : gIdx + 1;
      if (targetIdx < 0 || targetIdx >= updated.length) return prev;
      const temp = updated[gIdx];
      updated[gIdx] = updated[targetIdx];
      updated[targetIdx] = temp;
      return updated;
    });
  };

  const handleMoveChoice = (gIdx: number, cIdx: number, dir: 'UP' | 'DOWN') => {
    setOptionGroups((prev) => {
      const updated = [...prev];
      const choices = [...updated[gIdx].choices];
      const targetIdx = dir === 'UP' ? cIdx - 1 : cIdx + 1;
      if (targetIdx < 0 || targetIdx >= choices.length) return prev;
      const temp = choices[cIdx];
      choices[cIdx] = choices[targetIdx];
      choices[targetIdx] = temp;
      updated[gIdx] = { ...updated[gIdx], choices };
      return updated;
    });
  };

  const handleDeleteGroup = (gIdx: number) => {
    setOptionGroups((prev) => prev.filter((_, idx) => idx !== gIdx));
    setDeleteGroupConfirmIdx(null);
  };

  const handleAddChoice = (gIdx: number) => {
    setOptionGroups((prev) => {
      const updated = [...prev];
      const choices = [
        ...updated[gIdx].choices,
        { id: `c-${Date.now()}-${Math.random()}`, name: '', extraPrice: 0 },
      ];
      updated[gIdx] = { ...updated[gIdx], choices };
      return updated;
    });
  };

  const handleDeleteChoice = (gIdx: number, cIdx: number) => {
    setOptionGroups((prev) => {
      const updated = [...prev];
      const choices = updated[gIdx].choices.filter((_: any, idx: number) => idx !== cIdx);
      updated[gIdx] = { ...updated[gIdx], choices };
      return updated;
    });
  };

  const handleSaveOptions = async () => {
    if (!selectedItemForOptions) return;
    setIsSavingOptions(true);
    try {
      const cleanOptions = optionGroups
        .filter((g) => g.title && g.title.trim())
        .map((g) => ({
          title: g.title.trim(),
          isRequired: Boolean(g.isRequired),
          isMulti: Boolean(g.isMulti),
          choices: (g.choices || [])
            .filter((c: any) => c.name && c.name.trim())
            .map((c: any) => ({
              name: c.name.trim(),
              extraPrice: parseFloat(String(c.extraPrice)) || 0,
            })),
        }));

      const res = await fetch(`/api/r/${slug}/menu/${selectedItemForOptions.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          options: cleanOptions,
        }),
      });

      if (res.ok) {
        showSuccess('บันทึกตัวเลือกเรียบร้อย ✨', `อัปเดตตัวเลือกของ "${selectedItemForOptions.name}" แล้ว`);
        setIsOptionsModalOpen(false);
        setSelectedItemForOptions(null);
        fetchMenu();
      } else {
        showError('ไม่สามารถบันทึกได้', 'กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err: any) {
      console.error(err);
      showError('เกิดข้อผิดพลาด', err.message);
    } finally {
      setIsSavingOptions(false);
    }
  };

  // Quick 1-Click Toggle "ของหมด" with instant Optimistic UI update (0ms delay)
  const handleToggleStock = async (itemId: string, currentAvailable: boolean) => {
    const nextAvailable = !currentAvailable;
    // 1. Optimistic local state update in 0ms
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        items: cat.items?.map((it: any) =>
          it.id === itemId ? { ...it, isAvailable: nextAvailable } : it
        ),
      }))
    );

    if (currentAvailable) {
      showWarning('เปลี่ยนสถานะเป็น "ของหมด"', 'เมนูนี้จะไม่สามารถสั่งได้ชั่วคราว');
    } else {
      showSuccess('เปิดขายเมนูแล้ว', 'พร้อมรับออเดอร์ตามปกติ');
    }

    try {
      const res = await fetch(`/api/r/${slug}/menu/toggle-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, isAvailable: nextAvailable }),
      });
      if (!res.ok) {
        fetchMenu();
        showError('ไม่สามารถเปลี่ยนสถานะได้', 'กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err) {
      console.error(err);
      fetchMenu();
      showError('ไม่สามารถเปลี่ยนสถานะได้', 'กรุณาลองใหม่อีกครั้ง');
    }
  };

  // Add Menu Item
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingItem) return;
    setIsSubmittingItem(true);
    try {
      const normalizedImage = formatImageUrl(itemImage);
      const res = await fetch(`/api/r/${slug}/menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: itemCategory,
          name: itemName,
          description: itemDesc,
          basePrice: parseFloat(itemPrice) || 50,
          imageUrl: normalizedImage,
        }),
      });
      if (res.ok) {
        showSuccess('เพิ่มเมนูใหม่สำเร็จ 🎉', `เพิ่ม "${itemName}" ในระบบเรียบร้อย`);
        setIsAddModalOpen(false);
        setItemName('');
        setItemDesc('');
        setItemPrice('');
        setItemImage('');
        fetchMenu();
      } else {
        showError('ไม่สามารถเพิ่มเมนูได้', 'กรุณาตรวจสอบข้อมูล');
      }
    } catch (err) {
      console.error(err);
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถเพิ่มเมนูได้');
    } finally {
      setIsSubmittingItem(false);
    }
  };

  // Add Category (Bug #13)
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingCategory || !categoryName.trim()) return;
    setIsSubmittingCategory(true);
    try {
      const res = await fetch(`/api/r/${slug}/menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_CATEGORY',
          name: categoryName.trim(),
        }),
      });
      if (res.ok) {
        showSuccess('เพิ่มหมวดหมู่ใหม่สำเร็จ 🎉', `หมวดหมู่ "${categoryName}" พร้อมใช้งานแล้ว`);
        setCategoryName('');
        setIsAddCategoryOpen(false);
        fetchMenu();
      } else {
        showError('ไม่สามารถเพิ่มหมวดหมู่ได้', 'กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err: any) {
      showError('เกิดข้อผิดพลาด', err.message);
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (item: any) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditCategory(item.categoryId);
    setEditPrice(String(item.basePrice));
    setEditDesc(item.description || '');
    setEditImage(item.imageUrl || '');
    setIsEditModalOpen(true);
  };

  // Save Edited Item
  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const normalizedImage = formatImageUrl(editImage);
      const res = await fetch(`/api/r/${slug}/menu/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: editCategory,
          name: editName,
          description: editDesc,
          basePrice: parseFloat(editPrice) || 50,
          imageUrl: normalizedImage,
        }),
      });

      if (res.ok) {
        showSuccess('บันทึกการแก้ไขสำเร็จ ✨', `อัปเดตข้อมูล "${editName}" เรียบร้อย`);
        setIsEditModalOpen(false);
        setEditingItem(null);
        fetchMenu();
      } else {
        showError('บันทึกไม่สำเร็จ', 'กรุณาตรวจสอบข้อมูล');
      }
    } catch (err) {
      console.error(err);
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกการแก้ไขได้');
    }
  };

  // Open Delete Modal
  const openDeleteModal = (item: any) => {
    setDeletingItem(item);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/r/${slug}/menu/${deletingItem.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showSuccess('ลบเมนูเรียบร้อย 🗑️', `ลบ "${deletingItem.name}" ออกจากระบบแล้ว`);
        setIsDeleteModalOpen(false);
        setDeletingItem(null);
        fetchMenu();
      } else {
        showError('ไม่สามารถลบเมนูได้', 'กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err) {
      console.error(err);
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถลบเมนูได้');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 pb-28 md:pb-8 space-y-3.5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4 bg-white p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm w-full">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              จัดการเมนูอาหาร &amp; ของหมด
            </h1>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
            แก้ไขรายละเอียด, ลบเมนู และกดสวิตช์ 1-Click ปิดของหมดได้ทันทีแบบเรียลไทม์
          </p>
        </div>

        <div className="flex items-center space-x-2.5 w-full md:w-auto">
          <button
            type="button"
            data-sound="pop"
            onClick={() => setIsAddCategoryOpen(true)}
            className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none duration-75 text-white font-extrabold text-xs shadow-md flex items-center justify-center space-x-1.5 transition-all cursor-pointer ring-0 active:ring-2 active:ring-slate-400"
          >
            <FolderPlus className="w-4 h-4" />
            <span>+ เพิ่มหมวดหมู่</span>
          </button>
          <button
            type="button"
            data-sound="pop"
            onClick={() => setIsAddModalOpen(true)}
            className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none duration-75 text-white font-extrabold text-xs shadow-md shadow-orange-500/25 flex items-center justify-center space-x-1.5 transition-all cursor-pointer ring-2 ring-orange-400/40"
          >
            <Plus className="w-4 h-4" />
            <span>+ เพิ่มเมนูใหม่</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative bg-white p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-sm w-full">
        <Search className="w-4 h-4 text-slate-400 absolute left-5 sm:left-6 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="ค้นหาเมนูอาหาร..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 sm:pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-base sm:text-xs font-semibold focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Categories & Items Grid */}
      <div className="space-y-4 sm:space-y-6 w-full">
        {categories.map((cat) => {
          const items = (cat.items || []).filter((item: any) =>
            item.name.toLowerCase().includes(search.toLowerCase())
          );

          if (items.length === 0 && search) return null;

          return (
            <div key={cat.id} className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 shadow-sm space-y-3 sm:space-y-4 w-full">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="font-black text-sm sm:text-base text-slate-900 flex items-center space-x-2">
                  <span>{cat.name}</span>
                  <span className="text-xs text-slate-400 font-bold">({items.length} รายการ)</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3.5 lg:gap-4 w-full">
                {items.map((item: any) => (
                  <div
                    key={item.id}
                    className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all w-full shadow-xs hover:shadow-md ${
                      item.isAvailable
                        ? 'bg-white border-slate-200/90 hover:border-orange-300'
                        : 'bg-rose-50/60 border-rose-200'
                    }`}
                  >
                    {/* Top Section: Food Image + Info (Name, Desc, Price) */}
                    <div className="flex items-center space-x-3 w-full min-w-0">
                      {item.imageUrl ? (
                        <img
                          src={formatImageUrl(item.imageUrl)}
                          alt={item.name}
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-slate-200/80 flex-shrink-0 bg-slate-100 shadow-xs"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-orange-50 border border-orange-200/60 flex items-center justify-center flex-shrink-0 text-orange-500 font-black text-xl shadow-xs">
                          🍳
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-sm sm:text-base text-slate-900 truncate tracking-tight">
                          {item.name}
                        </h4>
                        {item.description && (
                          <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-base font-black text-orange-600">
                            ฿{item.basePrice}
                          </span>
                          {!item.isAvailable && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200/80">
                              ของหมดชั่วคราว
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Bar: [⚙️ ตัวเลือก (X)] + [✓ มีของ / ✕ ของหมด] + [✏️] + [🗑️] */}
                    <div className="pt-2.5 border-t border-slate-100 flex items-center gap-1.5 w-full">
                      {/* Options Button (Primary 1) */}
                      <button
                        type="button"
                        data-sound="tap"
                        onClick={() => openOptionsModal(item)}
                        title="จัดการตัวเลือก & ท็อปปิ้ง"
                        className={`flex-1 py-2 px-2.5 rounded-xl border text-xs font-black flex items-center justify-center space-x-1.5 transition-all duration-75 shadow-xs cursor-pointer active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none ring-0 active:ring-2 ${
                          item.options?.length > 0
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300/80 active:ring-amber-300'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200 active:ring-slate-300'
                        }`}
                      >
                        <Settings2 className={`w-3.5 h-3.5 flex-shrink-0 ${item.options?.length > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
                        <span className="truncate">
                          ตัวเลือก {item.options?.length > 0 ? `(${item.options.length})` : '(0)'}
                        </span>
                      </button>

                      {/* 1-Click Out-of-Stock Toggle (Primary 2) */}
                      <button
                        type="button"
                        data-sound={item.isAvailable ? 'delete' : 'success'}
                        onClick={() => handleToggleStock(item.id, item.isAvailable)}
                        title={item.isAvailable ? 'กดเพื่อปิด (ของหมด)' : 'กดเพื่อเปิด (มีของ)'}
                        className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-extrabold border transition-all duration-75 flex items-center justify-center space-x-1 shadow-xs cursor-pointer active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none ring-2 ${
                          item.isAvailable
                            ? 'bg-emerald-50 hover:bg-rose-50 text-emerald-700 hover:text-rose-700 border-emerald-200 hover:border-rose-200 ring-emerald-400/20 active:ring-rose-400/50'
                            : 'bg-rose-600 hover:bg-emerald-600 text-white border-rose-600 shadow-sm ring-rose-400/30 active:ring-emerald-400/50'
                        }`}
                      >
                        <span className="truncate">{item.isAvailable ? '✓ มีของ' : '✕ ของหมด'}</span>
                      </button>

                      {/* Edit Button (Icon) */}
                      <button
                        type="button"
                        data-sound="tap"
                        onClick={() => openEditModal(item)}
                        title="แก้ไขข้อมูลเมนู"
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-all duration-75 active:scale-90 active:translate-y-0.5 select-none flex items-center justify-center cursor-pointer flex-shrink-0 ring-0 active:ring-2 active:ring-slate-300"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button (Icon) */}
                      <button
                        type="button"
                        data-sound="delete"
                        onClick={() => openDeleteModal(item)}
                        title="ลบเมนูนี้"
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 transition-all duration-75 active:scale-90 active:translate-y-0.5 select-none flex items-center justify-center cursor-pointer flex-shrink-0 ring-0 active:ring-2 active:ring-rose-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-slate-900">+ เพิ่มเมนูอาหารใหม่</h3>
              <button
                type="button"
                data-sound="tap"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg active:scale-90 select-none duration-75 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">หมวดหมู่ *</label>
                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ชื่อเมนู *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ผัดกะเพราหมูกรอบ"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold text-base sm:text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ราคาเริ่มต้น (บาท) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  placeholder="50"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold text-base sm:text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">รายละเอียด / คำอธิบาย</label>
                <input
                  type="text"
                  placeholder="เช่น หมูกรอบแท้ ผัดพริกแห้งเข้มข้น"
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-base sm:text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  URL รูปภาพ (รองรับ Google Drive / เว็บรูปภาพ)
                </label>
                <input
                  type="url"
                  placeholder="เช่น ลิงก์แชร์ Google Drive หรือ https://..."
                  value={itemImage}
                  onChange={(e) => setItemImage(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-base sm:text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  💡 วางลิงก์แชร์ Google Drive (ตั้งค่าเป็น 'ทุกคนที่มีลิงก์') ระบบจะแปลงรูปให้อัตโนมัติ
                </p>
                {itemImage && (
                  <div className="mt-2 p-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center space-x-3">
                    <img
                      src={formatImageUrl(itemImage)}
                      alt="Preview"
                      className="w-12 h-12 rounded-lg object-cover bg-white border"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <span className="text-[11px] text-slate-500 font-medium truncate">ตัวอย่างรูปภาพ</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  data-sound="tap"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none duration-75 text-slate-600 font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  data-sound="success"
                  disabled={isSubmittingItem}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none duration-75 text-white font-extrabold shadow-md shadow-orange-500/20 transition-all cursor-pointer ring-2 ring-orange-400/40 disabled:opacity-50"
                >
                  {isSubmittingItem ? 'กำลังบันทึก...' : 'บันทึกเมนู'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-1.5">
                <Edit2 className="w-4 h-4 text-orange-500" />
                <span>แก้ไขเมนูอาหาร</span>
              </h3>
              <button
                type="button"
                data-sound="tap"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg active:scale-90 select-none duration-75 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateItem} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">หมวดหมู่ *</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ชื่อเมนู *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ผัดกะเพราหมูกรอบ"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold text-base sm:text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ราคาเริ่มต้น (บาท) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  placeholder="50"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold text-base sm:text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">รายละเอียด / คำอธิบาย</label>
                <input
                  type="text"
                  placeholder="เช่น หมูกรอบแท้ ผัดพริกแห้งเข้มข้น"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-base sm:text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  URL รูปภาพ (รองรับ Google Drive / เว็บรูปภาพ)
                </label>
                <input
                  type="url"
                  placeholder="เช่น ลิงก์แชร์ Google Drive หรือ https://..."
                  value={editImage}
                  onChange={(e) => setEditImage(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-base sm:text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  💡 วางลิงก์แชร์ Google Drive (ตั้งค่าเป็น 'ทุกคนที่มีลิงก์') ระบบจะแปลงรูปให้อัตโนมัติ
                </p>
                {editImage && (
                  <div className="mt-2 p-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center space-x-3">
                    <img
                      src={formatImageUrl(editImage)}
                      alt="Preview"
                      className="w-12 h-12 rounded-lg object-cover bg-white border"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <span className="text-[11px] text-slate-500 font-medium truncate">ตัวอย่างรูปภาพ</span>
                  </div>
                )}
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  data-sound="tap"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    openOptionsModal(editingItem);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none duration-75 border border-amber-300 text-amber-900 font-extrabold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm ring-0 active:ring-2 active:ring-amber-300"
                >
                  <Settings2 className="w-4 h-4 text-amber-600" />
                  <span>⚙️ จัดการตัวเลือก &amp; ท็อปปิ้ง ({editingItem?.options?.length || 0} กลุ่ม)</span>
                </button>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  data-sound="tap"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none duration-75 text-slate-600 font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  data-sound="success"
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none duration-75 text-white font-extrabold shadow-md shadow-orange-500/20 transition-all cursor-pointer ring-2 ring-orange-400/40"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-black text-base text-slate-900">ยืนยันการลบเมนูอาหาร?</h3>
              <p className="text-xs text-slate-600 font-bold mt-1">
                "{deletingItem.name}" (฿{deletingItem.basePrice})
              </p>
              <p className="text-[11px] text-slate-400 mt-2">
                เมนูและสูตรตัดสต็อกจะถูกลบออกจากระบบ (ประวัติยอดขายและบิลในอดีตยังคงถูกบันทึกไว้อย่างถูกต้อง)
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                data-sound="tap"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none duration-75 text-slate-600 font-bold text-xs transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                data-sound="delete"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none duration-75 text-white font-extrabold text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer ring-2 ring-rose-400/40"
              >
                {isDeleting ? 'กำลังลบ...' : 'ลบเมนูนี้'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal (Bug #13) */}
      {isAddCategoryOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center space-x-2">
                <FolderPlus className="w-5 h-5 text-orange-500" />
                <span>เพิ่มหมวดหมู่อาหารใหม่</span>
              </h3>
              <button
                type="button"
                data-sound="tap"
                onClick={() => setIsAddCategoryOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg active:scale-90 select-none duration-75 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อหมวดหมู่ *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น กับข้าว, เครื่องดื่ม, ของทานเล่น"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  data-sound="tap"
                  onClick={() => setIsAddCategoryOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none duration-75 text-slate-600 font-bold text-xs transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  data-sound="success"
                  disabled={isSubmittingCategory}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none duration-75 text-white font-extrabold text-xs shadow-md shadow-orange-500/20 transition-all cursor-pointer ring-2 ring-orange-400/40 disabled:opacity-50"
                >
                  {isSubmittingCategory ? 'กำลังบันทึก...' : 'บันทึกหมวดหมู่'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Menu Options & Add-ons Manager Modal */}
      {isOptionsModalOpen && selectedItemForOptions && (
        <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 text-left overflow-hidden">
            {/* Mobile Handle */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-between flex-shrink-0 shadow-sm">
              <div className="min-w-0 flex-1 mr-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">⚙️</span>
                  <h3 className="font-black text-base sm:text-lg truncate">
                    จัดการตัวเลือก &amp; ท็อปปิ้ง
                  </h3>
                </div>
                <p className="text-xs text-white/90 font-medium mt-0.5 truncate">
                  เมนู: <strong className="text-white underline">{selectedItemForOptions.name}</strong> (เริ่มต้น ฿{selectedItemForOptions.basePrice})
                </p>
              </div>
              <button
                type="button"
                data-sound="tap"
                onClick={() => setIsOptionsModalOpen(false)}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 active:scale-90 select-none duration-75 text-white transition-all cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-3.5 sm:p-6 overflow-y-auto overflow-x-hidden flex-1 space-y-4 sm:space-y-5">
              {/* Section A: Copy From Another Dish */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Copy className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span>คัดลอกตัวเลือกจากเมนูอื่น:</span>
                  </span>
                  <span className="text-[10px] text-slate-400 hidden sm:inline">ประหยัดเวลา ไม่ต้องพิมพ์ใหม่</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <select
                    value={copySourceItemId}
                    onChange={(e) => setCopySourceItemId(e.target.value)}
                    className="flex-1 w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-base sm:text-xs font-semibold focus:ring-2 focus:ring-orange-500 outline-none"
                  >
                    <option value="">-- เลือกเมนูต้นทางที่ต้องการคัดลอก --</option>
                    {allMenuItems
                      .filter((m) => m.id !== selectedItemForOptions.id && m.options?.length > 0)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.options.length} กลุ่มตัวเลือก)
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    data-sound="pop"
                    disabled={!copySourceItemId}
                    onClick={handleCopyFromAnotherItem}
                    className="w-full sm:w-auto px-4 py-2 min-h-[40px] rounded-xl bg-slate-800 hover:bg-slate-900 active:scale-95 select-none duration-75 disabled:opacity-40 text-white font-extrabold text-xs shadow-sm flex items-center justify-center space-x-1.5 transition-all cursor-pointer ring-0 active:ring-2 active:ring-slate-400"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>คัดลอกมาใช้</span>
                  </button>
                </div>
              </div>

              {/* Section B: Quick Preset Templates */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>เทมเพลตตัวเลือกด่วน (คลิกเพื่อเพิ่มทันที):</span>
                  </span>
                  <span className="text-[10px] text-slate-400 sm:hidden">👉 เลื่อนซ้าย-ขวา</span>
                </div>
                <div className="flex sm:grid sm:grid-cols-4 gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {QUICK_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      data-sound="pop"
                      onClick={() => handleAddPresetGroup(preset.group)}
                      className="min-w-[150px] sm:min-w-0 flex-shrink-0 p-2.5 rounded-xl bg-white hover:bg-orange-50/60 border border-slate-200 hover:border-orange-300 text-left transition-all duration-75 group shadow-sm flex flex-col justify-between cursor-pointer active:scale-95 select-none ring-0 active:ring-2 active:ring-orange-300"
                    >
                      <div>
                        <span className="text-xs font-black text-slate-800 group-hover:text-orange-600 block truncate">
                          {preset.name}
                        </span>
                        <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                          {preset.description}
                        </span>
                      </div>
                      <span className="text-[10px] font-extrabold text-orange-500 mt-1 block">
                        + เพิ่มกลุ่มนี้
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Section C: Option Groups List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-orange-500" />
                    <span>รายการกลุ่มตัวเลือกของเมนูนี้ ({optionGroups.length} กลุ่ม)</span>
                  </h4>
                  <button
                    type="button"
                    data-sound="pop"
                    onClick={handleAddEmptyGroup}
                    className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none duration-75 text-orange-700 font-extrabold text-xs border border-orange-200 flex items-center gap-1 transition-all cursor-pointer ring-0 active:ring-2 active:ring-orange-300"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ เพิ่มกลุ่มใหม่</span>
                  </button>
                </div>

                {optionGroups.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 space-y-2">
                    <span className="text-3xl block">📋</span>
                    <p className="text-xs font-bold text-slate-600">เมนูนี้ยังไม่มีกลุ่มตัวเลือกหรือท็อปปิ้ง</p>
                    <p className="text-[11px] text-slate-400">
                      คุณสามารถกดเลือกจาก <strong>"เทมเพลตตัวเลือกด่วน"</strong> ด้านบน หรือกด <strong>"+ เพิ่มกลุ่มใหม่"</strong> ได้เลยครับ
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {optionGroups.map((group, gIdx) => (
                      <div
                        key={group.id || gIdx}
                        className="p-3 sm:p-4 rounded-2xl bg-white border-2 border-slate-200 hover:border-slate-300 shadow-sm space-y-3 transition-all w-full min-w-0 overflow-hidden"
                      >
                        {/* Group Header: Title, Controls, Reorder, Delete */}
                        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 min-w-0">
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-700 font-black text-xs flex items-center justify-center flex-shrink-0">
                              {gIdx + 1}
                            </span>
                            <input
                              type="text"
                              placeholder="ชื่อกลุ่ม เช่น เลือกเนื้อสัตว์, ระดับความเผ็ด"
                              value={group.title}
                              onChange={(e) => handleUpdateGroupField(gIdx, 'title', e.target.value)}
                              className="flex-1 min-w-0 px-3 py-2 sm:py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs font-extrabold text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none"
                            />
                          </div>

                          <div className="flex items-center space-x-1 flex-shrink-0">
                            {/* Move Group Up */}
                            <button
                              type="button"
                              data-sound="tap"
                              disabled={gIdx === 0}
                              onClick={() => handleMoveGroup(gIdx, 'UP')}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-90 select-none duration-75 disabled:opacity-30 text-slate-600 cursor-pointer transition-all"
                              title="เลื่อนกลุ่มขึ้น"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            {/* Move Group Down */}
                            <button
                              type="button"
                              data-sound="tap"
                              disabled={gIdx === optionGroups.length - 1}
                              onClick={() => handleMoveGroup(gIdx, 'DOWN')}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-90 select-none duration-75 disabled:opacity-30 text-slate-600 cursor-pointer transition-all"
                              title="เลื่อนกลุ่มลง"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            {/* Delete Group */}
                            <button
                              type="button"
                              data-sound="delete"
                              onClick={() => setDeleteGroupConfirmIdx(gIdx)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 active:scale-90 select-none duration-75 text-rose-600 border border-rose-200 cursor-pointer transition-all"
                              title="ลบกลุ่มนี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Group Settings: Required & Multiple Options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                          {/* Required Setting */}
                          <label className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition-colors min-w-0">
                            <div className="min-w-0 flex-1 mr-2">
                              <span className="text-xs font-extrabold text-slate-800 block truncate">
                                {group.isRequired ? '🔴 บังคับเลือก (Required)' : '⚪ ไม่บังคับ (Optional)'}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {group.isRequired ? 'ลูกค้าต้องเลือกก่อนสั่งอาหาร' : 'ลูกค้าจะเลือกหรือไม่เลือกก็ได้'}
                              </span>
                            </div>
                            <input
                              type="checkbox"
                              checked={group.isRequired}
                              onChange={(e) => handleUpdateGroupField(gIdx, 'isRequired', e.target.checked)}
                              className="w-4 h-4 text-orange-500 rounded focus:ring-orange-400 shrink-0"
                            />
                          </label>

                          {/* Selection Type: Single vs Multiple */}
                          <label className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition-colors min-w-0">
                            <div className="min-w-0 flex-1 mr-2">
                              <span className="text-xs font-extrabold text-slate-800 block truncate">
                                {group.isMulti ? '☑️ เลือกได้หลายอย่าง (Multiple)' : '🔘 เลือกได้ 1 อย่าง (Single)'}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {group.isMulti ? 'ติ๊กถูกได้หลายรายการพร้อมกัน' : 'เลือกได้เพียงรายการเดียว'}
                              </span>
                            </div>
                            <input
                              type="checkbox"
                              checked={group.isMulti}
                              onChange={(e) => handleUpdateGroupField(gIdx, 'isMulti', e.target.checked)}
                              className="w-4 h-4 text-orange-500 rounded focus:ring-orange-400 shrink-0"
                            />
                          </label>
                        </div>

                        {/* Choices List in this Group */}
                        <div className="space-y-2 pt-1 w-full min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-extrabold text-slate-600 block">
                              รายการตัวเลือกย่อย ({group.choices?.length || 0} รายการ):
                            </span>
                            <span className="text-[10px] text-orange-600 font-bold sm:hidden bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                              ↔ เลื่อนซ้าย-ขวาได้
                            </span>
                          </div>

                          {/* Horizontal Scroll Wrapper for Choices */}
                          <div className="w-full overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
                            <div className="min-w-[420px] sm:min-w-0 space-y-1.5">
                              {group.choices.map((choice: any, cIdx: number) => (
                                <div
                                  key={choice.id || cIdx}
                                  className="flex items-center gap-1.5 sm:gap-2 p-1.5 bg-slate-50 rounded-xl border border-slate-200"
                                >
                                  {/* Choice Name */}
                                  <input
                                    type="text"
                                    placeholder="ชื่อตัวเลือก เช่น หมูกรอบ, ไข่ดาว"
                                    value={choice.name}
                                    onChange={(e) => handleUpdateChoiceField(gIdx, cIdx, 'name', e.target.value)}
                                    className="flex-1 min-w-[130px] px-3 py-2 sm:py-1.5 bg-white border border-slate-200 rounded-lg text-base sm:text-xs font-bold text-slate-800 focus:ring-2 focus:ring-orange-500 outline-none"
                                  />

                                  {/* Extra Price */}
                                  <div className="flex items-center space-x-1 flex-shrink-0">
                                    <span className="text-[11px] font-extrabold text-slate-400">+฿</span>
                                    <input
                                      type="number"
                                      min={0}
                                      step="any"
                                      placeholder="0"
                                      value={choice.extraPrice}
                                      onChange={(e) => handleUpdateChoiceField(gIdx, cIdx, 'extraPrice', e.target.value)}
                                      className="w-16 sm:w-20 px-2 py-2 sm:py-1.5 bg-white border border-slate-200 rounded-lg text-base sm:text-xs font-black text-emerald-600 text-right focus:ring-2 focus:ring-orange-500 outline-none"
                                    />
                                  </div>

                                  {/* Move Choice Up */}
                                  <button
                                    type="button"
                                    data-sound="tap"
                                    disabled={cIdx === 0}
                                    onClick={() => handleMoveChoice(gIdx, cIdx, 'UP')}
                                    className="p-2 sm:p-1.5 rounded-lg bg-white hover:bg-slate-200 active:scale-90 select-none duration-75 disabled:opacity-20 text-slate-500 border border-slate-200 cursor-pointer transition-all shrink-0"
                                    title="เลื่อนขึ้น"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Move Choice Down */}
                                  <button
                                    type="button"
                                    data-sound="tap"
                                    disabled={cIdx === group.choices.length - 1}
                                    onClick={() => handleMoveChoice(gIdx, cIdx, 'DOWN')}
                                    className="p-2 sm:p-1.5 rounded-lg bg-white hover:bg-slate-200 active:scale-90 select-none duration-75 disabled:opacity-20 text-slate-500 border border-slate-200 cursor-pointer transition-all shrink-0"
                                    title="เลื่อนลง"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Delete Choice */}
                                  <button
                                    type="button"
                                    data-sound="delete"
                                    onClick={() => handleDeleteChoice(gIdx, cIdx)}
                                    className="p-2 sm:p-1.5 rounded-lg bg-white hover:bg-rose-100 active:scale-90 select-none duration-75 text-rose-500 border border-slate-200 hover:border-rose-200 cursor-pointer transition-all shrink-0"
                                    title="ลบตัวเลือกนี้"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Add Choice Button */}
                          <button
                            type="button"
                            data-sound="pop"
                            onClick={() => handleAddChoice(gIdx)}
                            className="w-full py-2.5 px-3 min-h-[42px] rounded-xl border border-dashed border-orange-300 bg-orange-50/50 hover:bg-orange-100/60 active:scale-95 select-none duration-75 text-orange-700 font-extrabold text-xs flex items-center justify-center space-x-1 transition-all mt-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ เพิ่มตัวเลือกย่อยในกลุ่มนี้</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Another Group Button */}
                <button
                  type="button"
                  data-sound="pop"
                  onClick={handleAddEmptyGroup}
                  className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-300 hover:border-orange-400 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none duration-75 bg-slate-50 hover:bg-orange-50 text-slate-600 hover:text-orange-700 font-extrabold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer ring-0 active:ring-2 active:ring-orange-300"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ เพิ่มกลุ่มตัวเลือกใหม่</span>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 flex-shrink-0 safe-area-bottom">
              <button
                type="button"
                data-sound="tap"
                onClick={() => setIsOptionsModalOpen(false)}
                className="py-3 px-5 min-h-[44px] rounded-xl bg-slate-200 hover:bg-slate-300 active:scale-95 select-none duration-75 text-slate-700 font-extrabold text-xs transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                data-sound="success"
                disabled={isSavingOptions}
                onClick={handleSaveOptions}
                className="flex-1 sm:flex-initial py-3 px-6 min-h-[48px] rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 select-none duration-75 disabled:opacity-50 text-white font-black text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center space-x-2 transition-all cursor-pointer ring-2 ring-orange-400/40"
              >
                {isSavingOptions ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>💾 บันทึกตัวเลือกทั้งหมด</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Group Confirmation Dialog */}
      {deleteGroupConfirmIdx !== null && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-black text-base text-slate-900">ยืนยันการลบกลุ่มตัวเลือกนี้?</h3>
              <p className="text-xs text-slate-600 font-bold mt-1">
                "{optionGroups[deleteGroupConfirmIdx]?.title || `กลุ่มที่ ${deleteGroupConfirmIdx + 1}`}"
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                ตัวเลือกย่อยทั้งหมดในกลุ่มนี้จะถูกลบออกด้วย
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                data-sound="tap"
                onClick={() => setDeleteGroupConfirmIdx(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none duration-75 text-slate-600 font-bold text-xs transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                data-sound="delete"
                onClick={() => handleDeleteGroup(deleteGroupConfirmIdx)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none duration-75 text-white font-extrabold text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer ring-2 ring-rose-400/40"
              >
                ลบกลุ่มนี้
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
