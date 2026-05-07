import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Upload, X } from 'lucide-react';
import { sellerApi } from '../../api/seller';
import { useUIStore } from '../../stores/uiStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import type { Product } from '../../types';
import { isValidPrice } from '../../utils/price';
import styles from './ProductForm.module.css';

const CATEGORIES = ['電子機器', '衣類', '本', 'スポーツ', 'おもちゃ', 'インテリア', '食品', 'その他'];
const CONDITIONS = ['new', 'like_new', 'good', 'fair'];
const CONDITION_LABELS: Record<string, string> = { new: '新品', like_new: '新品同様', good: '良い', fair: '普通' };

interface ProductFormProps {
  mode: 'new' | 'edit';
}

export const ProductForm: React.FC<ProductFormProps> = ({ mode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [form, setForm] = useState<Partial<Product>>({
    name: '', description: '', price: '1', stock: 1,
    category: '電子機器', condition: 'new', is_featured: 0,
  });

  useEffect(() => {
    if (mode === 'edit' && id) {
      sellerApi.getDashboard().then((d) => {
        const p = d.products.find((x) => x.id === id);
        if (p) {
          setForm(p);
          setImages(p.images_json ? JSON.parse(p.images_json) : []);
        }
      }).catch(() => {});
    }
  }, [mode, id]);

  const update = (field: keyof Product) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await sellerApi.uploadImage(file);
      setImages((imgs) => [...imgs, res.url]);
    } catch {
      addToast({ type: 'error', message: '画像のアップロードに失敗しました' });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = { ...form, images_json: JSON.stringify(images) };
      if (mode === 'new') {
        await sellerApi.createProduct(data);
        addToast({ type: 'success', message: '商品を出品しました' });
      } else if (id) {
        await sellerApi.updateProduct(id, data);
        addToast({ type: 'success', message: '商品を更新しました' });
      }
      navigate('/seller/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'エラーが発生しました';
      addToast({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>{mode === 'new' ? '商品を出品する' : '商品を編集する'}</h1>
        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Images */}
          <div className={styles.section}>
            <h3>商品画像</h3>
            <div className={styles.imageGrid}>
              {images.map((url, i) => (
                <div key={i} className={styles.imageItem}>
                  <img src={url} alt="" />
                  <button
                    type="button"
                    className={styles.removeImage}
                    onClick={() => setImages((imgs) => imgs.filter((_, j) => j !== i))}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <label className={styles.uploadBtn}>
                  {uploading ? (
                    <span className={styles.spinner} />
                  ) : (
                    <>
                      <Upload size={20} />
                      <span>追加</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Basic Info */}
          <div className={styles.section}>
            <h3>基本情報</h3>
            <Input label="商品名" value={form.name ?? ''} onChange={update('name')} required />
            <div className={styles.field}>
              <label className={styles.label}>説明</label>
              <textarea
                className={styles.textarea}
                value={form.description ?? ''}
                onChange={update('description')}
                rows={4}
                placeholder="商品の説明を入力..."
              />
            </div>
          </div>

          {/* Category & Condition */}
          <div className={styles.section}>
            <h3>カテゴリ・状態</h3>
            <div className={styles.twoCol}>
              <div className={styles.field}>
                <label className={styles.label}>カテゴリ</label>
                <select className={styles.select} value={form.category} onChange={update('category')}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>商品の状態</label>
                <select className={styles.select} value={form.condition} onChange={update('condition')}>
                  {CONDITIONS.map((c) => <option key={c} value={c}>{CONDITION_LABELS[c]}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Price & Stock */}
          <div className={styles.section}>
            <h3>価格・在庫</h3>
            <div className={styles.twoCol}>
              <Input
                label="価格（円）"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.price ?? '1'}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, '');
                  if (v === '' || isValidPrice(v)) setForm((f) => ({ ...f, price: v || '1' }));
                }}
                error={form.price && !isValidPrice(form.price) ? '1無量大数未満の値を入力してください' : undefined}
                required
              />
              <Input
                label="在庫数"
                type="number"
                min={0}
                value={form.stock ?? 0}
                onChange={update('stock')}
                required
              />
            </div>
          </div>

          {/* Featured */}
          <div className={styles.section}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={form.is_featured === 1}
                onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked ? 1 : 0 }))}
              />
              注目商品として表示する
            </label>
          </div>

          <div className={styles.actions}>
            <Button type="button" variant="ghost" onClick={() => navigate('/seller/dashboard')}>
              キャンセル
            </Button>
            <Button type="submit" size="lg" loading={submitting}>
              {mode === 'new' ? '出品する' : '更新する'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
