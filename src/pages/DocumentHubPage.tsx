import { FolderOpen, Search, Loader2, ExternalLink, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useTableQuery, useDeleteMutation } from '@/hooks/use-supabase-query';

export default function DocumentHubPage() {
  const [search, setSearch] = useState('');
  const { data: docs = [], isLoading } = useTableQuery('documents', { orderBy: 'uploaded_at' });
  const deleteMut = useDeleteMutation('documents');

  const filtered = docs.filter((d: any) =>
    !search || [d.document_name, d.entity_type, d.entity_id].join(' ').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-primary" />
            Document Hub
          </h1>
          <p className="erp-page-subtitle">Centralized document repository</p>
        </div>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="erp-metric-card text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <div className="erp-metric-card text-center py-12 text-muted-foreground">
          No documents found. Documents will appear here as they're generated or uploaded across the system.
        </div>
      ) : (
        <div className="erp-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Document</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Entity ID</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Uploaded</th>
                  <th className="text-center px-5 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d: any) => (
                  <tr key={d.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-medium">{d.document_name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{d.entity_type || '—'}</td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{d.entity_id?.slice(0, 8) || '—'}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString() : '—'}</td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {d.document_url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={d.document_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3.5 h-3.5" /></a>
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteMut.mutate(d.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
