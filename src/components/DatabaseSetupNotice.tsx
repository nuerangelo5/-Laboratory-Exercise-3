import React, { useState } from 'react';
import { Check, Copy, Database, ExternalLink, RefreshCw } from 'lucide-react';
import { SUPABASE_SCHEMA_SQL } from '../data/schemaSql';

interface DatabaseSetupNoticeProps {
  onRetry: () => void;
  retrying: boolean;
}

export const DatabaseSetupNotice: React.FC<DatabaseSetupNoticeProps> = ({
  onRetry,
  retrying,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard error ignored
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-700 text-xs font-semibold">
            <Database className="w-4 h-4 shrink-0" />
            <span>Supabase Schema Initialization Required</span>
          </div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Create the equipment &amp; borrow_transactions tables in Supabase
          </h2>
          <p className="text-sm text-slate-600 max-w-2xl">
            Your Supabase project is connected, and your custodian session is
            active. Paste the SQL script below into your Supabase SQL Editor and
            click Run to create both tables, RLS policies, and realistic college
            ICT seed data.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                SQL Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy SQL Script
              </>
            )}
          </button>

          <a
            href="https://supabase.com/dashboard/project/ekiwatjcqtbpjufnyowo/sql/new"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open SQL Editor
          </a>

          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`}
            />
            {retrying ? 'Checking...' : 'Verify Tables'}
          </button>
        </div>
      </div>

      <div className="p-5 bg-slate-950 text-slate-100 max-h-[420px] overflow-auto">
        <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap">
          {SUPABASE_SCHEMA_SQL}
        </pre>
      </div>
    </div>
  );
};
