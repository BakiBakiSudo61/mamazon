import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Upload, X, Eye, Edit3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { sellerApi } from '../../api/seller';
import { useUIStore } from '../../stores/uiStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import type { Product } from '../../types';
import { isValidPrice } from '../../utils/price';
import styles from './ProductForm.module.css';

const CATEGORIES = ['電子機器', '衣類', '本', 'スポーツ', 'おもちゃ', 'インテリア', '食品', 'その他'];
const CONDITIONS = ['new', 'like_new', 'good', 'fair', 'vintage', 'junk'];
const CONDITION_LABELS: Record<string, string> = { new: '新品', like_new: '新品同様', good: '良い', fair: '普通', vintage: 'ビンテージ', junk: '古い（ジャンク）' };

interface ProductFormProps {
  mode: 'new' | 'edit';
}

export const ProductForm: React.FC<ProductFormProps> = ({ mode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [descTab, setDescTab] = useState<'write' | 'preview'>('write');
  const [inputKey, setInputKey] = useState(0);
  const [form, setForm] = useState<Partial<Product>>({
    name: '', description: '', price: '',  stock: 1, made_to_order: 0,
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
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    // 残り枠数を確認
    const remaining = 5 - images.length;
    const targets = files.slice(0, remaining);
    if (targets.length === 0) return;

    setUploadingCount(targets.length);
    // input をリセット（同じファイルを再選択できるように）
    setInputKey((k) => k + 1);

    const results = await Promise.allSettled(
      targets.map((file) => sellerApi.uploadImage(file))
    );

    const urls: string[] = [];
    let errorCount = 0;
    for (const r of results) {
      if (r.status === 'fulfilled') urls.push(r.value.url);
      else errorCount++;
    }
    if (urls.length) setImages((imgs) => [...imgs, ...urls]);
    if (errorCount > 0) addToast({ type: 'error', message: `${errorCount}枚のアップロードに失敗しました` });
    setUploadingCount(0);
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
            <div className={styles.imageSectionHeader}>
              <h3>商品画像</h3>
              <span className={styles.imageCount}>{images.length} / 5枚</span>
            </div>
            <div className={styles.imageGrid}>
              {images.map((url, i) => (
                <div key={url} className={styles.imageItem}>
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
              {Array.from({ length: uploadingCount }).map((_, i) => (
                <div key={`uploading-${i}`} className={[styles.imageItem, styles.imageItemUploading].join(' ')}>
                  <span className={styles.spinner} />
                </div>
              ))}
              {images.length + uploadingCount < 5 && (
                <label className={styles.uploadBtn}>
                  <Upload size={20} />
                  <span>追加</span>
                  <input
                    key={inputKey}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleImageUpload}
                    disabled={uploadingCount > 0}
                  />
                </label>
              )}
            </div>
            <p className={styles.imageHint}>最大5枚・JPEG / PNG / WebP・各5MB以下（複数同時選択可）</p>
          </div>

          {/* Basic Info */}
          <div className={styles.section}>
            <h3>基本情報</h3>
            <Input label="商品名" value={form.name ?? ''} onChange={update('name')} required />
            <div className={styles.field}>
              <div className={styles.mdHeader}>
                <label className={styles.label}>説明</label>
                <div className={styles.mdTabs}>
                  <button
                    type="button"
                    className={[styles.mdTab, descTab === 'write' ? styles.mdTabActive : ''].join(' ')}
                    onClick={() => setDescTab('write')}
                  >
                    <Edit3 size={13} /> 編集
                  </button>
                  <button
                    type="button"
                    className={[styles.mdTab, descTab === 'preview' ? styles.mdTabActive : ''].join(' ')}
                    onClick={() => setDescTab('preview')}
                  >
                    <Eye size={13} /> プレビュー
                  </button>
                </div>
              </div>
              {descTab === 'write' ? (
                <textarea
                  className={styles.textarea}
                  value={form.description ?? ''}
                  onChange={update('description')}
                  rows={6}
                  placeholder="Markdownで商品説明を入力できます。&#10;例: **太字** *斜体* - リスト"
                />
              ) : (
                <div className={styles.mdPreview}>
                  {form.description ? (
                    <ReactMarkdown>{form.description}</ReactMarkdown>
                  ) : (
                    <p className={styles.mdEmpty}>説明がありません</p>
                  )}
                </div>
              )}
              <p className={styles.mdHint}>Markdown記法が使えます（**太字** *斜体* # 見出し - リスト）</p>
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
                value={form.price ?? ''}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, '');
                  if (v === '' || isValidPrice(v)) setForm((f) => ({ ...f, price: v }));
                }}
                error={
                  form.price !== '' && form.price != null && !isValidPrice(form.price)
                    ? '1無量大数未満の値を入力してください'
                    : undefined
                }
                required
              />
              <Input
                label="在庫数"
                type="number"
                min={0}
                value={form.stock ?? 0}
                onChange={update('stock')}
                required
                disabled={form.made_to_order === 1}
              />
            </div>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={form.made_to_order === 1}
                onChange={(e) =>
                  setForm((f) => ({ ...f, made_to_order: e.target.checked ? 1 : 0 }))
                }
              />
              受注生産（在庫数にかかわらず購入可能）
            </label>
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
