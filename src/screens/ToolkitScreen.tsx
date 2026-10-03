import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { ToolkitCategory, ToolkitItem, ToolkitFile } from '@/lib/types';
import { DEFAULT_TOOLKIT_CATEGORIES, DEFAULT_TOOLKIT_ITEMS } from '@/lib/constants';
import {
  Plus, ChevronRight, X, Trash2, Edit2, Check, Link as LinkIcon, Paperclip,
} from 'lucide-react';

interface ToolkitScreenProps {
  initialCategory?: string | null;
}

export function ToolkitScreen({ initialCategory }: ToolkitScreenProps) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<ToolkitCategory[]>([]);
  const [items, setItems] = useState<ToolkitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ToolkitCategory | null>(null);
  const [selectedItem, setSelectedItem] = useState<ToolkitItem | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [catRes, itemRes] = await Promise.all([
      supabase.from('toolkit_categories').select('*').eq('user_id', user.id).order('sort_order'),
      supabase.from('toolkit_items').select('*').eq('user_id', user.id).order('sort_order'),
    ]);
    setCategories((catRes.data as ToolkitCategory[] ?? []));
    setItems((itemRes.data as ToolkitItem[] ?? []));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Seed default toolkit on first load
  useEffect(() => {
    if (!user || loading || categories.length > 0) return;
    (async () => {
      const createdCats: Record<string, string> = {};
      for (let i = 0; i < DEFAULT_TOOLKIT_CATEGORIES.length; i++) {
        const cat = DEFAULT_TOOLKIT_CATEGORIES[i];
        const { data } = await supabase
          .from('toolkit_categories')
          .insert({ user_id: user.id, name: cat.name, icon: cat.icon, sort_order: i })
          .select('*')
          .maybeSingle();
        if (data) createdCats[cat.name] = (data as ToolkitCategory).id;
      }
      for (const item of DEFAULT_TOOLKIT_ITEMS) {
        const catId = createdCats[item.category];
        if (!catId) continue;
        await supabase.from('toolkit_items').insert({
          user_id: user.id,
          category_id: catId,
          title: item.title,
          description: item.description,
          steps: item.steps,
          checklist: item.checklist,
          links: [],
          sort_order: 0,
        });
      }
      load();
    })();
  }, [user, loading, categories.length, load]);

  // Handle initialCategory from contextual toolkit
  useEffect(() => {
    if (initialCategory && categories.length > 0) {
      const cat = categories.find((c) => c.name === initialCategory);
      if (cat) setSelectedCategory(cat);
    }
  }, [initialCategory, categories]);

  async function addCategory() {
    if (!user || !newCategoryName.trim()) return;
    await supabase.from('toolkit_categories').insert({
      user_id: user.id,
      name: newCategoryName.trim(),
      icon: newCategoryIcon.trim() || null,
      sort_order: categories.length,
    });
    setNewCategoryName('');
    setNewCategoryIcon('');
    setShowAddCategory(false);
    load();
  }

  async function deleteCategory(id: string) {
    await supabase.from('toolkit_categories').delete().eq('id', id);
    setSelectedCategory(null);
    load();
  }

  async function deleteItem(id: string) {
    await supabase.from('toolkit_items').delete().eq('id', id);
    setSelectedItem(null);
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Category list view
  if (!selectedCategory) {
    return (
      <div className="px-5 py-6 space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Toolkit</h1>
          <button onClick={() => setShowAddCategory(true)} className="p-2 tap-target">
            <Plus size={22} color="var(--color-primary)" />
          </button>
        </div>

        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Personal strategies for difficult moments.
        </p>

        <div className="space-y-2.5">
          {categories.map((cat) => {
            const catItems = items.filter((i) => i.category_id === cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat)}
                className="card p-4 flex items-center gap-3 w-full tap-target"
              >
                <span className="text-2xl">{cat.icon ?? '📁'}</span>
                <div className="flex-1 text-left">
                  <p className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>{cat.name}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {catItems.length} {catItems.length === 1 ? 'tool' : 'tools'}
                  </p>
                </div>
                <ChevronRight size={18} color="var(--color-text-muted)" />
              </button>
            );
          })}
        </div>

        {showAddCategory && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-fade-in" onClick={() => setShowAddCategory(false)}>
            <div className="bg-white w-full max-w-[480px] rounded-t-3xl p-6 space-y-4 animate-slide-up" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>New category</h3>
                <button onClick={() => setShowAddCategory(false)}>
                  <X size={22} color="var(--color-text-muted)" />
                </button>
              </div>
              <input
                value={newCategoryIcon}
                onChange={(e) => setNewCategoryIcon(e.target.value)}
                placeholder="Icon (emoji)"
                className="input-field"
                maxLength={2}
              />
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name"
                className="input-field"
                onKeyDown={(e) => e.key === 'Enter' && addCategory()}
              />
              <button onClick={addCategory} className="btn-primary w-full">Add category</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Items in a category
  if (selectedCategory && !selectedItem) {
    const catItems = items.filter((i) => i.category_id === selectedCategory.id);
    return (
      <div className="px-5 py-6 space-y-5 animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedCategory(null)} className="tap-target">
            <ChevronRight size={22} color="var(--color-text)" className="rotate-180" />
          </button>
          <span className="text-2xl">{selectedCategory.icon ?? '📁'}</span>
          <h1 className="text-2xl font-bold flex-1" style={{ color: 'var(--color-text)' }}>{selectedCategory.name}</h1>
          <button onClick={() => deleteCategory(selectedCategory.id)} className="p-2 tap-target">
            <Trash2 size={18} color="var(--color-error)" />
          </button>
        </div>

        <div className="space-y-2.5">
          {catItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="card p-4 flex items-center gap-3 w-full tap-target text-left"
            >
              <div className="flex-1">
                <p className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>{item.title}</p>
                {item.description && (
                  <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>{item.description}</p>
                )}
              </div>
              <ChevronRight size={18} color="var(--color-text-muted)" />
            </button>
          ))}
          {catItems.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
              No tools yet. Add one below.
            </p>
          )}
        </div>

        <AddItemButton categoryId={selectedCategory.id} onAdded={load} />
      </div>
    );
  }

  // Item detail
  if (selectedItem) {
    return (
      <ItemDetail
        item={selectedItem}
        onBack={() => setSelectedItem(null)}
        onDeleted={() => deleteItem(selectedItem.id)}
        onUpdated={(updated) => {
          setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
          setSelectedItem(updated);
        }}
      />
    );
  }

  return null;
}

function AddItemButton({ categoryId, onAdded }: { categoryId: string; onAdded: () => void }) {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');

  async function addItem() {
    if (!user || !title.trim()) return;
    const stepArr = steps.split('\n').map((s) => s.trim()).filter(Boolean);
    await supabase.from('toolkit_items').insert({
      user_id: user.id,
      category_id: categoryId,
      title: title.trim(),
      description: description.trim() || null,
      steps: stepArr,
      checklist: [],
      links: [],
      sort_order: 0,
    });
    setTitle('');
    setDescription('');
    setSteps('');
    setShow(false);
    onAdded();
  }

  return (
    <>
      <button onClick={() => setShow(true)} className="btn-secondary w-full flex items-center justify-center gap-2">
        <Plus size={18} /> Add tool
      </button>
      {show && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-fade-in" onClick={() => setShow(false)}>
          <div className="bg-white w-full max-w-[480px] rounded-t-3xl p-6 space-y-4 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>New tool</h3>
              <button onClick={() => setShow(false)}>
                <X size={22} color="var(--color-text-muted)" />
              </button>
            </div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="input-field" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="input-field min-h-[60px] resize-none" />
            <textarea value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="Steps (one per line)" className="input-field min-h-[100px] resize-none" />
            <button onClick={addItem} className="btn-primary w-full">Add tool</button>
          </div>
        </div>
      )}
    </>
  );
}

function ItemDetail({
  item,
  onBack,
  onDeleted,
  onUpdated,
}: {
  item: ToolkitItem;
  onBack: () => void;
  onDeleted: () => void;
  onUpdated: (item: ToolkitItem) => void;
}) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description ?? '');
  const [steps, setSteps] = useState((item.steps ?? []).join('\n'));
  const [checklist, setChecklist] = useState<string[]>(item.checklist ?? []);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [links, setLinks] = useState(item.links ?? []);
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [files, setFiles] = useState<ToolkitFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const loadFiles = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('toolkit_files')
      .select('*')
      .eq('item_id', item.id);
    setFiles((data as ToolkitFile[] ?? []));
  }, [user, item.id]);

  async function save() {
    const stepArr = steps.split('\n').map((s) => s.trim()).filter(Boolean);
    const { data } = await supabase
      .from('toolkit_items')
      .update({
        title: title.trim(),
        description: description.trim() || null,
        steps: stepArr,
        checklist,
        links,
      })
      .eq('id', item.id)
      .select('*')
      .maybeSingle();
    if (data) {
      onUpdated(data as ToolkitItem);
      setEditing(false);
    }
  }

  async function uploadFile(file: File) {
    if (!user) return;
    setUploading(true);
    const filePath = `${user.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('toolkit_files')
      .upload(filePath, file);
    if (!uploadError) {
      await supabase.from('toolkit_files').insert({
        user_id: user.id,
        item_id: item.id,
        file_name: file.name,
        storage_path: filePath,
        file_size: file.size,
        mime_type: file.type,
      });
      loadFiles();
    }
    setUploading(false);
  }

  async function deleteFile(file: ToolkitFile) {
    await supabase.storage.from('toolkit_files').remove([file.storage_path]);
    await supabase.from('toolkit_files').delete().eq('id', file.id);
    loadFiles();
  }

  async function downloadFile(file: ToolkitFile) {
    const { data } = await supabase.storage.from('toolkit_files').createSignedUrl(file.storage_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  function addChecklistItem() {
    if (!newChecklistItem.trim()) return;
    setChecklist([...checklist, newChecklistItem.trim()]);
    setNewChecklistItem('');
  }

  function addLink() {
    if (!newLinkUrl.trim()) return;
    setLinks([...links, { label: newLinkLabel.trim() || newLinkUrl.trim(), url: newLinkUrl.trim() }]);
    setNewLinkLabel('');
    setNewLinkUrl('');
  }

  return (
    <div className="px-5 py-6 space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="tap-target">
          <ChevronRight size={22} color="var(--color-text)" className="rotate-180" />
        </button>
        <h1 className="text-xl font-bold flex-1" style={{ color: 'var(--color-text)' }}>{item.title}</h1>
        <button onClick={() => setEditing(!editing)} className="p-2 tap-target">
            <Edit2 size={18} color="var(--color-primary)" />
        </button>
        <button onClick={onDeleted} className="p-2 tap-target">
          <Trash2 size={18} color="var(--color-error)" />
        </button>
      </div>

      {editing ? (
        <div className="space-y-4 animate-slide-up">
          <div>
            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Title</p>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Description</p>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field min-h-[60px] resize-none" />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Steps (one per line)</p>
            <textarea value={steps} onChange={(e) => setSteps(e.target.value)} className="input-field min-h-[120px] resize-none" />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Checklist</p>
            <div className="space-y-2">
              {checklist.map((c, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="flex-1 text-sm" style={{ color: 'var(--color-text)' }}>{c}</span>
                  <button onClick={() => setChecklist(checklist.filter((_, i) => i !== idx))}>
                    <X size={16} color="var(--color-error)" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  placeholder="Add checklist item"
                  className="input-field flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
                />
                <button onClick={addChecklistItem} className="btn-secondary">
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Links</p>
            <div className="space-y-2">
              {links.map((l, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <LinkIcon size={14} color="var(--color-primary)" />
                  <span className="flex-1 text-sm truncate" style={{ color: 'var(--color-text)' }}>{l.label}</span>
                  <button onClick={() => setLinks(links.filter((_, i) => i !== idx))}>
                    <X size={16} color="var(--color-error)" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input value={newLinkLabel} onChange={(e) => setNewLinkLabel(e.target.value)} placeholder="Label" className="input-field flex-1" />
                <input value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} placeholder="URL" className="input-field flex-1" />
                <button onClick={addLink} className="btn-secondary">
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>
          <button onClick={save} className="btn-primary w-full flex items-center justify-center gap-2">
            <Check size={18} /> Save
          </button>
        </div>
      ) : (
        <>
          {item.description && (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{item.description}</p>
          )}

          {(item.steps ?? []).length > 0 && (
            <div className="space-y-2">
              <p className="section-title">Steps</p>
              <div className="space-y-2">
                {(item.steps ?? []).map((step, idx) => (
                  <div key={idx} className="card p-3.5 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                      {idx + 1}
                    </div>
                    <p className="text-sm flex-1" style={{ color: 'var(--color-text)' }}>{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(item.checklist ?? []).length > 0 && (
            <div className="space-y-2">
              <p className="section-title">Checklist</p>
              <div className="card p-3.5 space-y-2">
                {(item.checklist ?? []).map((c, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center" style={{ borderColor: 'var(--color-border)' }}>
                      <Check size={12} color="var(--color-success)" />
                    </div>
                    <span className="text-sm" style={{ color: 'var(--color-text)' }}>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(item.links ?? []).length > 0 && (
            <div className="space-y-2">
              <p className="section-title">Links</p>
              {item.links.map((l, idx) => (
                <a key={idx} href={l.url} target="_blank" rel="noopener noreferrer" className="card p-3 flex items-center gap-2.5 tap-target">
                  <LinkIcon size={16} color="var(--color-primary)" />
                  <span className="text-sm font-medium flex-1" style={{ color: 'var(--color-primary)' }}>{l.label}</span>
                  <ChevronRight size={16} color="var(--color-text-muted)" />
                </a>
              ))}
            </div>
          )}

          {/* Files */}
          <div className="space-y-2">
            <p className="section-title">Files</p>
            <div className="space-y-2">
              {files.map((f) => (
                <div key={f.id} className="card p-3 flex items-center gap-2.5">
                  <Paperclip size={16} color="var(--color-text-muted)" />
                  <button onClick={() => downloadFile(f)} className="flex-1 text-left">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{f.file_name}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {f.file_size ? `${(f.file_size / 1024).toFixed(0)} KB` : ''}
                    </p>
                  </button>
                  <button onClick={() => deleteFile(f)}>
                    <Trash2 size={16} color="var(--color-error)" />
                  </button>
                </div>
              ))}
              <label className="btn-secondary w-full flex items-center justify-center gap-2 cursor-pointer tap-target">
                <Paperclip size={18} />
                {uploading ? 'Uploading...' : 'Upload file'}
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadFile(file);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
