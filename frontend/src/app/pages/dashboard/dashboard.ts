import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Component, OnDestroy, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service';
import { DeleteConfirmModal } from './delete-confirm-modal';
import { EarningsTab } from './earnings-tab';
import { ProductFormModal } from './product-form-modal';
import { StockModal } from './stock-modal';

const API_BASE = environment.apiUrl;

type ActionMessage = { type: string; text: string };

@Component({
  selector: 'app-page-dashboard',
  imports: [MatButtonModule, MatIconModule, EarningsTab, ProductFormModal, StockModal, DeleteConfirmModal],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardPage implements OnDestroy {
  private http = inject(HttpClient);
  private router = inject(Router);
  auth = inject(AuthService);

  readonly tabs = [
    { key: 'products', label: 'Products', icon: 'grid_view' },
    { key: 'earnings', label: 'Earnings', icon: 'trending_up' },
  ];

  products = signal<any[]>([]);
  isLoading = signal(true);
  error = signal('');
  actionMessage = signal<ActionMessage>({ type: '', text: '' });
  activeTab = signal<'products' | 'earnings'>('products');
  private msgTimer: any;

  // --- Inventory modal ---
  selectedProduct = signal<any>(null);
  currentStock = signal<any>(null);
  isCheckingStock = signal(false);
  isSubmittingInventory = signal(false);

  private stockModal = viewChild(StockModal);

  // --- Add/Edit product modal ---
  isProductModalOpen = signal(false);
  modalMode = signal<'add' | 'edit'>('add');
  editingProductId: any = null;
  categories = signal<any[]>([]);
  isSubmittingProduct = signal(false);
  productForm: { name: string; description: string; price: any; skuCode: string; categoryId: any } = this.blankProductForm();
  existingImageUrls = signal<string[]>([]); // strings, edit mode
  newImageFiles = signal<File[]>([]);
  newImagePreviews = signal<string[]>([]); // object URLs

  // --- Delete confirm ---
  deleteTarget = signal<any>(null);
  isDeleting = signal(false);

  /** Product ids whose image failed to load (falls back to the placeholder icon). */
  failedImages = signal<Set<any>>(new Set());

  // --- Earnings ---
  earnings = signal<{
    isLoading: boolean;
    error: string;
    skuSummaries: any[];
    totalRevenue: number;
    totalUnits: number;
    categoryBreakdown: { label: string; value: number }[];
    topProducts: any[];
  }>({
    isLoading: true,
    error: '',
    skuSummaries: [],
    totalRevenue: 0,
    totalUnits: 0,
    categoryBreakdown: [],
    topProducts: [],
  });

  readonly formatPriceFn = (price: number) => this.formatPrice(price);

  constructor() {
    // Role guard + initial load (re-runs when the user changes, like the React effect).
    effect(() => {
      const user = this.auth.user();
      const isAuthenticated = this.auth.isAuthenticated();
      untracked(() => {
        const role = user?.role?.toUpperCase();
        if (!isAuthenticated || (role !== 'SELLER' && role !== 'ADMIN')) {
          this.router.navigate(['/']);
          return;
        }
        if (user?.id) this.fetchSellerProducts();
      });
    });

    // Earnings load only while the Earnings tab is open.
    effect(() => {
      const tab = this.activeTab();
      const products = this.products();
      untracked(() => {
        if (tab !== 'earnings' || products.length === 0) return;
        this.fetchEarnings(products);
      });
    });
  }

  ngOnDestroy() {
    clearTimeout(this.msgTimer);
    this.newImagePreviews().forEach((u) => URL.revokeObjectURL(u));
  }

  // ── helpers ──
  private blankProductForm() {
    return { name: '', description: '', price: '', skuCode: '', categoryId: '' as any };
  }

  formatPrice(price: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price || 0);
  }

  categoryName(product: any, fallback = 'N/A') {
    return typeof product.category === 'string' ? product.category : product.category?.name || fallback;
  }

  showNotification(message: string, type = 'error') {
    this.actionMessage.set({ type, text: message });
    clearTimeout(this.msgTimer);
    this.msgTimer = setTimeout(() => this.actionMessage.set({ type: '', text: '' }), 3500);
  }

  private clearMessage() {
    this.actionMessage.set({ type: '', text: '' });
  }

  markImageFailed(id: any) {
    this.failedImages.update((s) => new Set(s).add(id));
  }

  // ── Fetch seller's products ──
  async fetchSellerProducts() {
    const id = this.auth.user()?.id;
    if (!id) return;
    try {
      this.isLoading.set(true);
      const data: any = await firstValueFrom(this.http.get(`${API_BASE}/products/seller/${id}`));
      this.products.set(data?.content || data || []);
    } catch {
      this.error.set('Failed to fetch your inventory.');
    } finally {
      this.isLoading.set(false);
    }
  }

  // ── Earnings ──
  private async fetchEarnings(products: any[]) {
    this.earnings.update((prev) => ({ ...prev, isLoading: true, error: '' }));
    try {
      let params = new HttpParams();
      products.forEach((p) => (params = params.append('skuCodes', p.skuCode)));
      const summaries = await firstValueFrom(this.http.get<any[]>(`${API_BASE}/orders/seller-summary`, { params }));

      const summaryBySku = Object.fromEntries(summaries.map((s) => [s.skuCode, s]));
      let totalRevenue = 0;
      let totalUnits = 0;
      const categoryMap: Record<string, number> = {};

      const productsWithRevenue = products.map((p) => {
        const s = summaryBySku[p.skuCode];
        const revenue = s?.revenue || 0;
        const quantitySold = s?.quantitySold || 0;
        totalRevenue += revenue;
        totalUnits += quantitySold;

        const catName = this.categoryName(p, 'Uncategorized');
        if (revenue > 0) categoryMap[catName] = (categoryMap[catName] || 0) + revenue;
        return { ...p, revenue, quantitySold };
      });

      const categoryBreakdown = Object.entries(categoryMap)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);

      const topProducts = [...productsWithRevenue]
        .sort((a, b) => b.revenue - a.revenue)
        .filter((p) => p.revenue > 0)
        .slice(0, 5);

      this.earnings.set({ isLoading: false, error: '', skuSummaries: summaries, totalRevenue, totalUnits, categoryBreakdown, topProducts });
    } catch {
      this.earnings.update((prev) => ({ ...prev, isLoading: false, error: 'Failed to load earnings data.' }));
    }
  }

  // ── Add/Edit product modal ──
  private resetProductForm() {
    this.productForm = this.blankProductForm();
    this.existingImageUrls.set([]);
    this.newImagePreviews().forEach((u) => URL.revokeObjectURL(u));
    this.newImageFiles.set([]);
    this.newImagePreviews.set([]);
  }

  async openAddProductModal() {
    this.resetProductForm();
    this.modalMode.set('add');
    this.editingProductId = null;
    this.isProductModalOpen.set(true);
    try {
      this.categories.set(await firstValueFrom(this.http.get<any[]>(`${API_BASE}/products/categories`)));
    } catch (err) {
      console.error('Failed to fetch categories', err);
    }
  }

  async openEditProductModal(product: any) {
    this.modalMode.set('edit');
    this.editingProductId = product.id;
    const catName = typeof product.category === 'string' ? product.category : product.category?.name || '';

    this.productForm = {
      name: product.name || '',
      description: product.description || '',
      price: product.price?.toString() || '',
      skuCode: product.skuCode || '',
      categoryId: '', // resolved below once categories load
    };

    const gallery = product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls : product.imageUrl ? [product.imageUrl] : [];
    this.existingImageUrls.set(gallery);
    this.newImageFiles.set([]);
    this.newImagePreviews.set([]);
    this.isProductModalOpen.set(true);

    try {
      const cats = await firstValueFrom(this.http.get<any[]>(`${API_BASE}/products/categories`));
      this.categories.set(cats);
      // ProductResponse only returns category NAME, not id — match by name so the dropdown preselects it.
      const match = cats.find((c) => c.name.toLowerCase() === catName.toLowerCase());
      if (match) this.productForm = { ...this.productForm, categoryId: match.id };
    } catch (err) {
      console.error('Failed to fetch categories', err);
    }
  }

  closeProductModal() {
    this.isProductModalOpen.set(false);
    this.resetProductForm();
  }

  handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (files.length === 0) return;
    const previews = files.map((f) => URL.createObjectURL(f));
    this.newImageFiles.update((prev) => [...prev, ...files]);
    this.newImagePreviews.update((prev) => [...prev, ...previews]);
    input.value = ''; // allow re-selecting the same file
  }

  removeExistingImage(index: number) {
    this.existingImageUrls.update((prev) => prev.filter((_, i) => i !== index));
  }

  removeNewImage(index: number) {
    URL.revokeObjectURL(this.newImagePreviews()[index]);
    this.newImageFiles.update((prev) => prev.filter((_, i) => i !== index));
    this.newImagePreviews.update((prev) => prev.filter((_, i) => i !== index));
  }

  async handleSubmitProduct() {
    this.isSubmittingProduct.set(true);
    this.clearMessage();
    try {
      // 1. Upload any newly-selected files first (no Content-Type: the browser sets the multipart boundary)
      let uploadedUrls: string[] = [];
      if (this.newImageFiles().length > 0) {
        const formData = new FormData();
        this.newImageFiles().forEach((file) => formData.append('files', file));
        try {
          const uploadData: any = await firstValueFrom(this.http.post(`${API_BASE}/products/images`, formData));
          uploadedUrls = uploadData.imageUrls || [];
        } catch {
          throw new Error('Failed to upload images.');
        }
      }

      const finalImageUrls = [...this.existingImageUrls(), ...uploadedUrls];
      const f = this.productForm;
      const body = {
        name: f.name,
        description: f.description,
        price: Number.parseFloat(f.price),
        skuCode: f.skuCode,
        imageUrl: finalImageUrls[0] || '',
        imageUrls: finalImageUrls,
      };

      if (this.modalMode() === 'add') {
        try {
          await firstValueFrom(this.http.post(`${API_BASE}/products/category/${f.categoryId}`, body));
        } catch {
          throw new Error('Failed to create product. Check your permissions or SKU uniqueness.');
        }
        this.showNotification('Product created successfully!', 'success');
      } else {
        try {
          await firstValueFrom(this.http.put(`${API_BASE}/products/${this.editingProductId}`, body));
        } catch {
          throw new Error('Failed to update product.');
        }
        this.showNotification('Product updated successfully!', 'success');
      }

      this.closeProductModal();
      this.fetchSellerProducts();
    } catch (err: any) {
      this.actionMessage.set({ type: 'error', text: err.message });
    } finally {
      this.isSubmittingProduct.set(false);
    }
  }

  // ── Delete ──
  async confirmDeleteProduct() {
    const target = this.deleteTarget();
    if (!target) return;
    this.isDeleting.set(true);
    try {
      await firstValueFrom(this.http.delete(`${API_BASE}/products/${target.id}`, { responseType: 'text' }));
      this.showNotification('Product deleted.', 'success');
      this.deleteTarget.set(null);
      this.fetchSellerProducts();
    } catch {
      this.showNotification('Failed to delete product.', 'error');
    } finally {
      this.isDeleting.set(false);
    }
  }

  // ── Inventory ──
  async openStockModal(product: any) {
    this.selectedProduct.set(product);
    this.currentStock.set(null);
    this.clearMessage();
    this.isCheckingStock.set(true);

    try {
      const textData = await firstValueFrom(this.http.get(`${API_BASE}/inventory/${product.skuCode}`, { responseType: 'text' }));
      try {
        const jsonData = JSON.parse(textData);
        this.currentStock.set(jsonData.availableQuantity ?? jsonData.quantity ?? 0);
      } catch {
        this.currentStock.set(textData || 0);
      }
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 404) this.currentStock.set(0);
      else this.currentStock.set('Error');
    } finally {
      this.isCheckingStock.set(false);
    }
  }

  async handleAddStock(qty: number) {
    this.isSubmittingInventory.set(true);
    this.clearMessage();
    try {
      await firstValueFrom(
        this.http.post(
          `${API_BASE}/inventory/add`,
          { skuCode: this.selectedProduct().skuCode, quantity: qty },
          { responseType: 'text' },
        ),
      );
      this.actionMessage.set({ type: 'success', text: 'Stock added successfully!' });
      this.stockModal()?.reset();
      this.currentStock.update((prev) => (Number.parseInt(prev, 10) || 0) + qty);
    } catch {
      this.actionMessage.set({ type: 'error', text: 'Failed to add stock.' });
    } finally {
      this.isSubmittingInventory.set(false);
    }
  }
}
