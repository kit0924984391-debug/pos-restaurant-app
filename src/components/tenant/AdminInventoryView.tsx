'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';
import {
  Package,
  Plus,
  AlertTriangle,
  History,
  ChefHat,
  Search,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  DollarSign,
  Layers,
  CheckCircle2,
  Trash2,
  Save,
  Loader2,
  X,
  Edit2,
  Copy,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function AdminInventoryView({ slug }: { slug: string }) {
  const { showSuccess, showError, showWarning } = useToast();
  const [activeTab, setActiveTab] = useState<'stock' | 'recipes' | 'logs'>('stock');
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [isNewIngModalOpen, setIsNewIngModalOpen] = useState(false);
  const [selectedIng, setSelectedIng] = useState<any>(null);
  const [stockInQty, setStockInQty] = useState('');
  const [stockInNote, setStockInNote] = useState('');
  const [saving, setSaving] = useState(false);

  // New Ingredient form
  const [newIngName, setNewIngName] = useState('');
  const [newIngUnit, setNewIngUnit] = useState('กรัม (g)');
  const [newIngCost, setNewIngCost] = useState('');
  const [newIngStock, setNewIngStock] = useState('');
  const [newIngMinAlert, setNewIngMinAlert] = useState('10');

  // Edit Ingredient State
  const [isEditIngModalOpen, setIsEditIngModalOpen] = useState(false);
  const [editingIng, setEditingIng] = useState<any>(null);
  const [editIngName, setEditIngName] = useState('');
  const [editIngUnit, setEditIngUnit] = useState('กรัม (g)');
  const [editIngCost, setEditIngCost] = useState('');
  const [editIngStock, setEditIngStock] = useState('');
  const [editIngMinAlert, setEditIngMinAlert] = useState('10');

  // Delete Ingredient State
  const [isDeleteIngModalOpen, setIsDeleteIngModalOpen] = useState(false);
  const [deletingIng, setDeletingIng] = useState<any>(null);
  const [isDeletingIng, setIsDeletingIng] = useState(false);

  // Recipe Manager State
  const [selectedMenuItem, setSelectedMenuItem] = useState<any>(null);
  const [recipeIngredients, setRecipeIngredients] = useState<{ ingredientId: string; quantity: number }[]>([]);
  const [allRecipes, setAllRecipes] = useState<any[]>([]);
  const [recipeMenuSearch, setRecipeMenuSearch] = useState('');
  const [copySourceMenuId, setCopySourceMenuId] = useState('');
  const [isClearRecipeConfirmOpen, setIsClearRecipeConfirmOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ingRes, menuRes, recipeRes] = await Promise.all([
        fetch(`/api/r/${slug}/inventory`),
        fetch(`/api/r/${slug}/menu`),
        fetch(`/api/r/${slug}/recipes`),
      ]);
      const ingData = await ingRes.json();
      const menuData = await menuRes.json();
      const recipeData = await recipeRes.json().catch(() => ({ recipes: [] }));

      if (ingData.ingredients) setIngredients(ingData.ingredients);
      if (recipeData.recipes) setAllRecipes(recipeData.recipes);

      if (Array.isArray(menuData)) {
        // Bug #3: Flatten categories to extract individual menu items for BOM Recipe manager
        const flatItems = menuData.flatMap((c: any) => (Array.isArray(c.items) ? c.items : [c]));
        setMenuItems(flatItems);
        if (flatItems.length > 0 && !selectedMenuItem) {
          loadRecipeForItem(flatItems[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [slug]);

  // Pre-calculate recipes per menu item
  const recipesByMenuItemId = React.useMemo(() => {
    const map = new Map<string, any[]>();
    for (const r of allRecipes) {
      if (!map.has(r.menuItemId)) {
        map.set(r.menuItemId, []);
      }
      map.get(r.menuItemId)!.push(r);
    }
    return map;
  }, [allRecipes]);

  const loadRecipeForItem = async (item: any) => {
    setSelectedMenuItem(item);
    setCopySourceMenuId('');
    try {
      const res = await fetch(`/api/r/${slug}/recipes?menuItemId=${item.id}`);
      const data = await res.json();
      if (data.recipes) {
        setRecipeIngredients(
          data.recipes.map((r: any) => ({
            ingredientId: r.ingredientId,
            quantity: r.quantity,
          }))
        );
      } else {
        setRecipeIngredients([]);
      }
    } catch (e) {
      setRecipeIngredients([]);
    }
  };

  // Open Edit Ingredient Modal
  const openEditIngModal = (ing: any) => {
    setEditingIng(ing);
    setEditIngName(ing.name || '');
    setEditIngUnit(ing.unit || 'กรัม (g)');
    setEditIngCost(String(ing.costPerUnit ?? '0'));
    setEditIngStock(String(ing.currentStock ?? '0'));
    setEditIngMinAlert(String(ing.minStockAlert ?? '10'));
    setIsEditIngModalOpen(true);
  };

  // Save Edited Ingredient
  const handleUpdateIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIng || !editIngName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/r/${slug}/inventory`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingIng.id,
          name: editIngName.trim(),
          unit: editIngUnit.trim(),
          costPerUnit: parseFloat(editIngCost) || 0,
          currentStock: parseFloat(editIngStock) || 0,
          minStockAlert: parseFloat(editIngMinAlert) || 10,
        }),
      });
      if (res.ok) {
        showSuccess('แก้ไขวัตถุดิบสำเร็จ ✨', `อัปเดตข้อมูล "${editIngName}" เรียบร้อย`);
        setIsEditIngModalOpen(false);
        setEditingIng(null);
        fetchData();
      } else {
        const data = await res.json().catch(() => ({}));
        showError('ไม่สามารถบันทึกได้', data.error || 'กรุณาตรวจสอบข้อมูล');
      }
    } catch (err: any) {
      console.error(err);
      showError('เกิดข้อผิดพลาด', err.message);
    } finally {
      setSaving(false);
    }
  };

  // Open Delete Ingredient Modal
  const openDeleteIngModal = (ing: any) => {
    setDeletingIng(ing);
    setIsDeleteIngModalOpen(true);
  };

  // Confirm Delete Ingredient
  const handleConfirmDeleteIngredient = async () => {
    if (!deletingIng) return;
    setIsDeletingIng(true);
    try {
      const res = await fetch(`/api/r/${slug}/inventory?id=${deletingIng.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showSuccess('ลบวัตถุดิบเรียบร้อย 🗑️', `ลบ "${deletingIng.name}" ออกจากคลังแล้ว`);
        setIsDeleteIngModalOpen(false);
        setDeletingIng(null);
        fetchData();
      } else {
        const data = await res.json().catch(() => ({}));
        showError('ไม่สามารถลบวัตถุดิบได้', data.error || 'กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err: any) {
      console.error(err);
      showError('เกิดข้อผิดพลาด', err.message);
    } finally {
      setIsDeletingIng(false);
    }
  };

  // Clear all recipe ingredients for current menu item
  const handleClearRecipe = async () => {
    if (!selectedMenuItem) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/r/${slug}/recipes?menuItemId=${selectedMenuItem.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showSuccess('ล้างสูตรอาหารเรียบร้อย 🗑️', `ล้างสูตรของ "${selectedMenuItem.name}" แล้ว`);
        setRecipeIngredients([]);
        setIsClearRecipeConfirmOpen(false);
        fetchData();
      } else {
        showError('ไม่สามารถล้างสูตรได้', 'กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err: any) {
      console.error(err);
      showError('เกิดข้อผิดพลาด', err.message);
    } finally {
      setSaving(false);
    }
  };

  // Copy recipe from another dish
  const handleCopyRecipeFromOther = () => {
    if (!copySourceMenuId) return;
    const sourceRecipes = recipesByMenuItemId.get(copySourceMenuId);
    const sourceItem = menuItems.find((m) => m.id === copySourceMenuId);
    if (!sourceRecipes || sourceRecipes.length === 0) {
      showWarning('ไม่พบสูตร', 'เมนูต้นทางที่เลือกยังไม่มีการผูกสูตร');
      return;
    }

    setRecipeIngredients(
      sourceRecipes.map((r: any) => ({
        ingredientId: r.ingredientId,
        quantity: r.quantity,
      }))
    );
    showSuccess(
      'คัดลอกสูตรสำเร็จ 📋',
      `คัดลอก ${sourceRecipes.length} วัตถุดิบ จาก "${sourceItem?.name}" เรียบร้อย (กดบันทึกสูตรเพื่อยืนยัน)`
    );
    setCopySourceMenuId('');
  };

  const handleStockInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIng || !stockInQty) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/r/${slug}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'STOCK_ADJUST',
          ingredientId: selectedIng.id,
          changeQty: parseFloat(stockInQty),
          reason: 'STOCK_IN',
          note: stockInNote || 'รับเข้าวัตถุดิบ',
        }),
      });
      if (res.ok) {
        showSuccess('รับเข้าวัตถุดิบสำเร็จ 📦', `เพิ่ม "${selectedIng.name}" จำนวน +${stockInQty} ${selectedIng.unit}`);
        setIsStockInModalOpen(false);
        setStockInQty('');
        setStockInNote('');
        fetchData();
      } else {
        showError('ไม่สามารถบันทึกรับเข้าได้', 'กรุณาลองใหม่อีกครั้ง');
      }
    } catch (e) {
      console.error(e);
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกรับเข้าได้');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIngName || !newIngUnit) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/r/${slug}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newIngName,
          unit: newIngUnit,
          costPerUnit: parseFloat(newIngCost) || 0,
          currentStock: parseFloat(newIngStock) || 0,
          minStockAlert: parseFloat(newIngMinAlert) || 10,
        }),
      });
      if (res.ok) {
        showSuccess('เพิ่มวัตถุดิบใหม่สำเร็จ ✨', `เพิ่ม "${newIngName}" เข้าสู่คลังเรียบร้อย`);
        setIsNewIngModalOpen(false);
        setNewIngName('');
        setNewIngCost('');
        setNewIngStock('');
        fetchData();
      } else {
        showError('ไม่สามารถเพิ่มวัตถุดิบได้', 'กรุณาลองใหม่อีกครั้ง');
      }
    } catch (e) {
      console.error(e);
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถเพิ่มวัตถุดิบได้');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!selectedMenuItem) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/r/${slug}/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menuItemId: selectedMenuItem.id,
          ingredients: recipeIngredients,
        }),
      });
      if (res.ok) {
        showSuccess('บันทึกสูตรอาหารสำเร็จ 🥗', `สูตรสำหรับ "${selectedMenuItem.name}" (${recipeIngredients.length} วัตถุดิบ)`);
        fetchData();
      } else {
        showError('บันทึกสูตรไม่สำเร็จ', 'กรุณาลองใหม่อีกครั้ง');
      }
    } catch (e) {
      console.error(e);
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกสูตรอาหารได้');
    } finally {
      setSaving(false);
    }
  };

  // Calculations
  const lowStockCount = ingredients.filter((i) => i.currentStock <= i.minStockAlert).length;
  const totalStockValue = ingredients.reduce((sum, i) => sum + i.currentStock * i.costPerUnit, 0);

  const filteredIngredients = useMemo(
    () => ingredients.filter((i) => i.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [ingredients, searchTerm]
  );

  const [tableSorting, setTableSorting] = useState<SortingState>([]);
  const [tablePagination, setTablePagination] = useState({ pageIndex: 0, pageSize: 20 });

  const tableColumns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'วัตถุดิบ',
        cell: ({ row }) => (
          <span className="font-extrabold text-slate-900">{row.original.name}</span>
        ),
      },
      {
        accessorKey: 'currentStock',
        header: 'คงเหลือ',
        cell: ({ row }) => {
          const ing = row.original;
          const isLow = ing.currentStock <= ing.minStockAlert;
          const isOut = ing.currentStock <= 0;
          return (
            <div className="font-black text-sm sm:text-base">
              <span className={isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-slate-900'}>
                {ing.currentStock.toLocaleString()}
              </span>{' '}
              <span className="text-[11px] sm:text-xs text-slate-400 font-normal">{ing.unit}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'minStockAlert',
        header: 'เกณฑ์เตือน',
        cell: ({ row }) => (
          <span className="text-slate-500">
            {row.original.minStockAlert.toLocaleString()} {row.original.unit}
          </span>
        ),
      },
      {
        accessorKey: 'costPerUnit',
        header: 'ต้นทุน/หน่วย',
        cell: ({ row }) => (
          <span className="text-slate-700">
            ฿{row.original.costPerUnit.toFixed(2)} / {row.original.unit}
          </span>
        ),
      },
      {
        id: 'totalValue',
        header: 'มูลค่าคงเหลือ',
        accessorFn: (row) => row.currentStock * row.costPerUnit,
        cell: ({ row }) => (
          <span className="font-bold text-emerald-600">
            ฿{(row.original.currentStock * row.original.costPerUnit).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'สถานะ',
        accessorFn: (row) => (row.currentStock <= 0 ? 0 : row.currentStock <= row.minStockAlert ? 1 : 2),
        cell: ({ row }) => {
          const ing = row.original;
          const isLow = ing.currentStock <= ing.minStockAlert;
          const isOut = ing.currentStock <= 0;
          return isOut ? (
            <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-red-100 text-red-700">
              หมดสต็อก
            </span>
          ) : isLow ? (
            <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-amber-100 text-amber-700">
              ใกล้หมด
            </span>
          ) : (
            <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-emerald-100 text-emerald-700">
              ปกติ
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: () => <div className="text-right">การจัดการ</div>,
        enableSorting: false,
        cell: ({ row }) => {
          const ing = row.original;
          return (
            <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
              <button
                onClick={() => {
                  setSelectedIng(ing);
                  setIsStockInModalOpen(true);
                }}
                title="รับเข้าสต็อกวัตถุดิบ"
                className="px-2.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-black border border-orange-200/80 transition-all inline-flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>รับเข้า</span>
              </button>
              <button
                onClick={() => openEditIngModal(ing)}
                title="แก้ไขข้อมูลวัตถุดิบ"
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all flex items-center justify-center active:scale-95 cursor-pointer shadow-xs"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => openDeleteIngModal(ing)}
                title="ลบวัตถุดิบนี้"
                className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 transition-all flex items-center justify-center active:scale-95 cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        },
      },
    ],
    []
  );

  const inventoryTable = useReactTable({
    data: filteredIngredients,
    columns: tableColumns,
    state: {
      sorting: tableSorting,
      pagination: tablePagination,
    },
    onSortingChange: setTableSorting,
    onPaginationChange: setTablePagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Calculate cost of selected menu item
  const selectedItemCost = recipeIngredients.reduce((sum, r) => {
    const ing = ingredients.find((i) => i.id === r.ingredientId);
    return sum + (r.quantity || 0) * (ing?.costPerUnit || 0);
  }, 0);

  const selectedItemProfit = selectedMenuItem ? selectedMenuItem.basePrice - selectedItemCost : 0;
  const selectedItemMargin = selectedMenuItem && selectedMenuItem.basePrice > 0
    ? Math.round((selectedItemProfit / selectedMenuItem.basePrice) * 100)
    : 0;

  const copyableMenuItems = React.useMemo(() => {
    return menuItems.filter(
      (m) => m.id !== selectedMenuItem?.id && (recipesByMenuItemId.get(m.id)?.length || 0) > 0
    );
  }, [menuItems, selectedMenuItem, recipesByMenuItemId]);

  return (
    <div className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-3.5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 bg-white p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm w-full">
        <div>
          <h1 className="text-lg sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Package className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 flex-shrink-0" />
            คลังวัตถุดิบ &amp; สูตรตัดสต็อก (Recipe BOM)
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
            ระบบจัดการวัตถุดิบ ผูกสูตรอาหารตัดสต็อก Real-time และคำนวณต้นทุน/กำไรสุทธิระดับ Enterprise
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setIsNewIngModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-orange-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            + เพิ่มวัตถุดิบใหม่
          </button>
        </div>
      </div>

      {/* KPI Cards (Equal Height Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 auto-rows-fr w-full">
        <div className="p-3.5 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400">วัตถุดิบทั้งหมดในระบบ</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{ingredients.length} รายการ</div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-black">
            <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="p-3.5 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-500">แจ้งเตือนของใกล้หมด</span>
            <div className="text-xl sm:text-2xl font-black text-amber-600 mt-1">{lowStockCount} รายการ</div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="p-3.5 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400">มูลค่าสต็อกคงเหลือรวม</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
              ฿{totalStockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Tabs (Smooth Isolated Scroll on Mobile) */}
      <div className="flex border-b border-slate-200 gap-1.5 overflow-x-auto scrollbar-none pb-1 w-full max-w-full">
        <button
          onClick={() => setActiveTab('stock')}
          className={`px-4 sm:px-5 py-2.5 sm:py-3 font-extrabold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
            activeTab === 'stock'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4" />
          รายการสต็อก &amp; รับเข้า
        </button>
        <button
          onClick={() => setActiveTab('recipes')}
          className={`px-4 sm:px-5 py-2.5 sm:py-3 font-extrabold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
            activeTab === 'recipes'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ChefHat className="w-4 h-4" />
          ผูกสูตรอาหาร (Recipe BOM)
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 sm:px-5 py-2.5 sm:py-3 font-extrabold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
            activeTab === 'logs'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          ประวัติตัดสต็อก &amp; รับเข้า (Audit Logs)
        </button>
      </div>

      {/* TAB 1: Stock Inventory */}
      {activeTab === 'stock' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden w-full">
          <div className="p-3.5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อวัตถุดิบ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Isolated Horizontal Scroll Container for Table (TanStack Table v8) */}
          <div className="overflow-x-auto w-full max-w-full">
            <table className="w-full text-left text-xs sm:text-sm min-w-[650px]">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                {inventoryTable.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="whitespace-nowrap">
                    {headerGroup.headers.map((header) => {
                      const canSort = header.column.getCanSort();
                      const isSorted = header.column.getIsSorted();

                      return (
                        <th key={header.id} className="py-3 sm:py-4 px-4 sm:px-6 select-none">
                          {header.isPlaceholder ? null : canSort ? (
                            <button
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                              className="flex items-center space-x-1.5 font-bold hover:text-slate-900 group cursor-pointer"
                            >
                              <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                              <span className="text-slate-400 group-hover:text-slate-600">
                                {isSorted === 'asc' ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-orange-600" />
                                ) : isSorted === 'desc' ? (
                                  <ArrowDown className="w-3.5 h-3.5 text-orange-600" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                                )}
                              </span>
                            </button>
                          ) : (
                            <div>{flexRender(header.column.columnDef.header, header.getContext())}</div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {inventoryTable.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={tableColumns.length} className="py-12 text-center text-slate-400 text-xs font-semibold">
                      ไม่พบวัตถุดิบที่ตรงกับการค้นหา
                    </td>
                  </tr>
                ) : (
                  inventoryTable.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors whitespace-nowrap">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className={`py-3 sm:py-4 px-4 sm:px-6 ${cell.column.id === 'actions' ? 'text-right' : ''}`}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* TanStack Table Pagination */}
          {inventoryTable.getPageCount() > 1 && (
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-semibold">
                หน้า {inventoryTable.getState().pagination.pageIndex + 1} จาก {inventoryTable.getPageCount()} (ทั้งหมด {filteredIngredients.length} วัตถุดิบ)
              </span>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  disabled={!inventoryTable.getCanPreviousPage()}
                  onClick={() => inventoryTable.previousPage()}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-bold transition-colors"
                >
                  ก่อนหน้า
                </button>
                <button
                  type="button"
                  disabled={!inventoryTable.getCanNextPage()}
                  onClick={() => inventoryTable.nextPage()}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-bold transition-colors"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Recipe BOM Manager */}
      {activeTab === 'recipes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Menu Items List */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-orange-500" />
              เลือกเมนูเพื่อกำหนดสูตรอาหาร
            </h3>

            {/* Menu Search Box */}
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาเมนู..."
                value={recipeMenuSearch}
                onChange={(e) => setRecipeMenuSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
              {menuItems
                .filter((item) => item.name.toLowerCase().includes(recipeMenuSearch.toLowerCase()))
                .map((item) => {
                  const isSelected = selectedMenuItem?.id === item.id;
                  const recipeCount = recipesByMenuItemId.get(item.id)?.length || 0;
                  return (
                    <button
                      key={item.id}
                      onClick={() => loadRecipeForItem(item)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50/50 shadow-sm'
                          : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">{item.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">ราคาขาย ฿{item.basePrice}</div>
                      </div>
                      {recipeCount > 0 ? (
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/90 border border-emerald-200/80 px-2 py-0.5 rounded-lg flex-shrink-0">
                          ✓ ผูกแล้ว ({recipeCount})
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-lg flex-shrink-0">
                          ยังไม่มีสูตร
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Recipe Editor */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-6">
            {selectedMenuItem ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      สูตรอาหาร: {selectedMenuItem.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      เมื่อมีออเดอร์สั่งเมนูนี้ ระบบจะตัดสต็อกวัตถุดิบด้านล่างตามปริมาณที่กำหนดแบบ Real-time
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Copy Recipe From Other Dish */}
                    {copyableMenuItems.length > 0 && (
                      <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 shadow-xs">
                        <select
                          value={copySourceMenuId}
                          onChange={(e) => setCopySourceMenuId(e.target.value)}
                          className="px-2 py-1.5 bg-transparent text-xs font-bold text-slate-700 focus:outline-none max-w-[130px] sm:max-w-[170px] truncate"
                        >
                          <option value="">-- คัดลอกสูตร --</option>
                          {copyableMenuItems.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({recipesByMenuItemId.get(m.id)?.length})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!copySourceMenuId}
                          onClick={handleCopyRecipeFromOther}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 disabled:opacity-40 text-amber-900 font-extrabold text-xs flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>คัดลอก</span>
                        </button>
                      </div>
                    )}

                    {/* Clear Recipe Button */}
                    {recipeIngredients.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsClearRecipeConfirmOpen(true)}
                        title="ล้างสูตรทั้งหมดของเมนูนี้"
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-extrabold border border-rose-200/80 flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">ล้างสูตร</span>
                      </button>
                    )}

                    {/* Save Recipe Button */}
                    <button
                      onClick={handleSaveRecipe}
                      disabled={saving}
                      className="px-4 sm:px-5 py-2 sm:py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      บันทึกสูตร
                    </button>
                  </div>
                </div>

                {/* Profit Margin Breakdown Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white grid grid-cols-3 gap-3 text-center">
                  <div className="p-2">
                    <span className="text-[11px] text-slate-400 block font-bold">ราคาขาย</span>
                    <span className="text-lg sm:text-xl font-black text-white">฿{selectedMenuItem.basePrice}</span>
                  </div>
                  <div className="p-2 border-x border-slate-700">
                    <span className="text-[11px] text-amber-400 block font-bold">ต้นทุนวัตถุดิบรวม</span>
                    <span className="text-lg sm:text-xl font-black text-amber-400">
                      ฿{selectedItemCost.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-2">
                    <span className="text-[11px] text-emerald-400 block font-bold">กำไรขั้นต้น (Margin)</span>
                    <span className="text-lg sm:text-xl font-black text-emerald-400">
                      ฿{selectedItemProfit.toFixed(2)} ({selectedItemMargin}%)
                    </span>
                  </div>
                </div>

                {/* Recipe Ingredient Rows */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">วัตถุดิบที่ใช้ประกอบอาหาร</span>
                    <button
                      onClick={() => {
                        if (ingredients.length > 0) {
                          setRecipeIngredients([
                            ...recipeIngredients,
                            { ingredientId: ingredients[0].id, quantity: 100 },
                          ]);
                        }
                      }}
                      className="text-xs font-extrabold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      เพิ่มวัตถุดิบในสูตร
                    </button>
                  </div>

                  {recipeIngredients.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                      ยังไม่มีการผูกสูตรวัตถุดิบสำหรับเมนูนี้ กดปุ่ม &quot;เพิ่มวัตถุดิบในสูตร&quot; เพื่อเริ่มต้น
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recipeIngredients.map((item, idx) => {
                        const ing = ingredients.find((i) => i.id === item.ingredientId);
                        const rowCost = (item.quantity || 0) * (ing?.costPerUnit || 0);

                        return (
                          <div
                            key={idx}
                            className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-3"
                          >
                            <div className="flex-1">
                              <select
                                value={item.ingredientId}
                                onChange={(e) => {
                                  const updated = [...recipeIngredients];
                                  updated[idx].ingredientId = e.target.value;
                                  setRecipeIngredients(updated);
                                }}
                                className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold"
                              >
                                {ingredients.map((ingOption) => (
                                  <option key={ingOption.id} value={ingOption.id}>
                                    {ingOption.name} (หน่วย: {ingOption.unit})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.1"
                                placeholder="ปริมาณ"
                                value={item.quantity}
                                onChange={(e) => {
                                  const updated = [...recipeIngredients];
                                  updated[idx].quantity = parseFloat(e.target.value) || 0;
                                  setRecipeIngredients(updated);
                                }}
                                className="w-24 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-center"
                              />
                              <span className="text-xs text-slate-400 font-medium w-16">
                                {ing?.unit}
                              </span>
                            </div>

                            <div className="text-right w-24">
                              <span className="text-xs font-extrabold text-slate-800">
                                ฿{rowCost.toFixed(2)}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setRecipeIngredients(recipeIngredients.filter((_, i) => i !== idx));
                              }}
                              title="ลบวัตถุดิบนี้ออกจากสูตร"
                              className="p-2 rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200/80 hover:border-rose-200 transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-2xs"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="py-20 text-center text-slate-400">เลือกเมนูอาหารด้านซ้ายเพื่อดูสูตร</div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Audit Logs */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4 w-full">
          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
            <History className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 flex-shrink-0" />
            <span>ประวัติการเคลื่อนไหวสต็อกล่าสุด (Stock Audit Logs)</span>
          </h3>
          <div className="divide-y divide-slate-100 w-full overflow-hidden">
            {ingredients.flatMap((i) => (i.stockLogs || []).map((l: any) => ({ ...l, ingredientName: i.name, unit: i.unit })))
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 30)
              .map((log) => {
                const isPositive = log.changeQty > 0;
                return (
                  <div key={log.id} className="py-3 sm:py-3.5 flex items-center justify-between gap-2.5 text-xs sm:text-sm">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                        {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 truncate">
                        <div className="font-extrabold text-slate-900 truncate">{log.ingredientName}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                          <span>{log.note || log.reason || 'ปรับสต็อก'}</span>
                          <span>•</span>
                          <span>{new Date(log.createdAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`font-black text-xs sm:text-sm ${isPositive ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {isPositive ? '+' : ''}{log.changeQty.toLocaleString()} {log.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* MODAL: Stock In */}
      {isStockInModalOpen && selectedIng && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-lg">รับเข้าสต็อก: {selectedIng.name}</h3>
              <button onClick={() => setIsStockInModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStockInSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  จำนวนที่รับเข้า ({selectedIng.unit})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder={`เช่น 5000 หรือ 50`}
                  value={stockInQty}
                  onChange={(e) => setStockInQty(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 font-extrabold text-base focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">หมายเหตุ</label>
                <input
                  type="text"
                  placeholder="เช่น ซื้อจากตลาดเช้า / สั่งร้านค้าส่ง"
                  value={stockInNote}
                  onChange={(e) => setStockInNote(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-orange-50 rounded-xl text-xs text-orange-800 font-medium">
                ยอดคงเหลือปัจจุบัน: <strong>{selectedIng.currentStock} {selectedIng.unit}</strong> ➜ หลังรับเข้า:{' '}
                <strong>{(selectedIng.currentStock + (parseFloat(stockInQty) || 0)).toLocaleString()} {selectedIng.unit}</strong>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStockInModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 font-bold text-xs text-slate-600 hover:bg-slate-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-md shadow-orange-500/20"
                >
                  {saving ? 'กำลังบันทึก...' : 'ยืนยันรับเข้า'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: New Ingredient */}
      {isNewIngModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-lg">เพิ่มรายการวัตถุดิบใหม่</h3>
              <button onClick={() => setIsNewIngModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateIngredient} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อวัตถุดิบ</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น กุ้งขาวสด, น้ำปลาแท้, น้ำตาลทราย"
                  value={newIngName}
                  onChange={(e) => setNewIngName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">หน่วยนับ</label>
                  <select
                    value={newIngUnit}
                    onChange={(e) => setNewIngUnit(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="กรัม (g)">กรัม (g)</option>
                    <option value="กิโลกรัม (kg)">กิโลกรัม (kg)</option>
                    <option value="ฟอง">ฟอง</option>
                    <option value="มล. (ml)">มล. (ml)</option>
                    <option value="ลิตร (L)">ลิตร (L)</option>
                    <option value="ชิ้น">ชิ้น</option>
                    <option value="กล่อง">กล่อง</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ต้นทุนต่อหน่วย (บาท)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="เช่น 0.16 หรือ 4.2"
                    value={newIngCost}
                    onChange={(e) => setNewIngCost(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">จำนวนคงเหลือเริ่มต้น</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="เช่น 1000"
                    value={newIngStock}
                    onChange={(e) => setNewIngStock(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">เตือนเมื่อเหลือน้อยกว่า</label>
                  <input
                    type="number"
                    step="1"
                    value={newIngMinAlert}
                    onChange={(e) => setNewIngMinAlert(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewIngModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 font-bold text-xs text-slate-600 hover:bg-slate-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-md shadow-orange-500/20"
                >
                  {saving ? 'กำลังบันทึก...' : 'เพิ่มวัตถุดิบ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Ingredient */}
      {isEditIngModalOpen && editingIng && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-lg">แก้ไขข้อมูลวัตถุดิบ</h3>
              <button
                type="button"
                onClick={() => {
                  setIsEditIngModalOpen(false);
                  setEditingIng(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateIngredient} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อวัตถุดิบ</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น กุ้งขาวสด, น้ำปลาแท้, น้ำตาลทราย"
                  value={editIngName}
                  onChange={(e) => setEditIngName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">หน่วยนับ</label>
                  <select
                    value={editIngUnit}
                    onChange={(e) => setEditIngUnit(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="กรัม (g)">กรัม (g)</option>
                    <option value="กิโลกรัม (kg)">กิโลกรัม (kg)</option>
                    <option value="ฟอง">ฟอง</option>
                    <option value="มล. (ml)">มล. (ml)</option>
                    <option value="ลิตร (L)">ลิตร (L)</option>
                    <option value="ชิ้น">ชิ้น</option>
                    <option value="กล่อง">กล่อง</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ต้นทุนต่อหน่วย (บาท)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="เช่น 0.16 หรือ 4.2"
                    value={editIngCost}
                    onChange={(e) => setEditIngCost(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">จำนวนคงเหลือในสต็อก</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editIngStock}
                    onChange={(e) => setEditIngStock(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">เตือนเมื่อเหลือน้อยกว่า</label>
                  <input
                    type="number"
                    step="1"
                    value={editIngMinAlert}
                    onChange={(e) => setEditIngMinAlert(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                💡 หากแก้ไขยอดคงเหลือ ระบบจะบันทึกการปรับยอดลงใน Audit Logs ให้อัตโนมัติ
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditIngModalOpen(false);
                    setEditingIng(null);
                  }}
                  className="flex-1 py-3 rounded-xl bg-slate-100 font-bold text-xs text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-md shadow-orange-500/20 cursor-pointer"
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Delete Ingredient Confirmation */}
      {isDeleteIngModalOpen && deletingIng && (() => {
        const linkedRecipes = allRecipes.filter((r) => r.ingredientId === deletingIng.id);
        const linkedMenuNames = Array.from(
          new Set(
            linkedRecipes
              .map((r) => r.menuItem?.name || menuItems.find((m) => m.id === r.menuItemId)?.name)
              .filter(Boolean)
          )
        );

        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-2">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="text-center">
                <h3 className="font-black text-slate-900 text-lg">ยืนยันการลบวัตถุดิบ?</h3>
                <p className="text-sm font-extrabold text-slate-800 mt-1">
                  &quot;{deletingIng.name}&quot; ({deletingIng.currentStock} {deletingIng.unit})
                </p>
              </div>

              {linkedMenuNames.length > 0 ? (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-1.5 text-amber-900">
                  <div className="font-extrabold flex items-center gap-1 text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>แจ้งเตือน: วัตถุดิบนี้ถูกผูกอยู่ในสูตร {linkedMenuNames.length} เมนู:</span>
                  </div>
                  <p className="font-semibold text-amber-800/90 pl-5">
                    {linkedMenuNames.join(', ')}
                  </p>
                  <p className="text-[11px] text-amber-700/80 pl-5">
                    หากลบออก วัตถุดิบนี้จะถูกปลดออกจากสูตรของเมนูดังกล่าว และจะไม่มีการตัดสต็อกวัตถุดิบนี้เมื่อสั่งซื้อ
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center">
                  วัตถุดิบนี้จะถูกลบออกจากคลังและประวัติสต็อกอย่างถาวร
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteIngModalOpen(false);
                    setDeletingIng(null);
                  }}
                  className="flex-1 py-3 rounded-xl bg-slate-100 font-bold text-xs text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isDeletingIng}
                  onClick={handleConfirmDeleteIngredient}
                  className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/20 cursor-pointer"
                >
                  {isDeletingIng ? 'กำลังลบ...' : 'ยืนยันลบวัตถุดิบ'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: Clear Recipe Confirmation */}
      {isClearRecipeConfirmOpen && selectedMenuItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-2">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-black text-slate-900 text-base">ยืนยันการล้างสูตรอาหาร?</h3>
              <p className="text-xs text-slate-600 font-bold mt-1">
                &quot;{selectedMenuItem.name}&quot;
              </p>
              <p className="text-[11px] text-slate-400 mt-2">
                วัตถุดิบทั้งหมด ({recipeIngredients.length} รายการ) จะถูกนำออกจากสูตรของเมนูนี้ และจะไม่ตัดสต็อกจนกว่าจะมีการผูกสูตรใหม่
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsClearRecipeConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 font-bold text-xs text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleClearRecipe}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/20 cursor-pointer"
              >
                {saving ? 'กำลังล้าง...' : 'ล้างสูตรทั้งหมด'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
