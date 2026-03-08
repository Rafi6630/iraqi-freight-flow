import { FolderOpen, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export default function DocumentHubPage() {
  const [search, setSearch] = useState('');

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
      <div className="erp-metric-card text-center py-12 text-muted-foreground">
        No documents uploaded yet. Documents will appear here as they're generated or uploaded across the system.
      </div>
    </div>
  );
}
