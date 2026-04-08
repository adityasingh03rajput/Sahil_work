import { useState, useEffect } from 'react';
import { Calendar, ChevronDown, ListFilter, X } from 'lucide-react';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Input } from './input';
import { getCurrentFiscalYearRange } from '../../utils/fiscal';

export interface DateRange {
  from: string;
  to: string;
}

interface DateRangePickerProps {
  range: DateRange;
  onRangeChange: (range: DateRange) => void;
  className?: string;
  align?: 'start' | 'center' | 'end';
  persistenceKey?: string;
}

export function DateRangePicker({ range, onRangeChange, className, align = 'end', persistenceKey }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localRange, setLocalRange] = useState<DateRange>(() => {
    if (persistenceKey) {
      try {
        const saved = localStorage.getItem(`bv_filter_${persistenceKey}`);
        if (saved) return JSON.parse(saved);
      } catch { /* ignore */ }
    }
    return range;
  });

  useEffect(() => {
    // If external range changes and we have no saved state, or if we want to force sync
    if (!persistenceKey) {
      setLocalRange(range);
    }
  }, [range, persistenceKey]);

  // Read-back on mount if persistenceKey exists
  useEffect(() => {
    if (persistenceKey) {
      try {
        const saved = localStorage.getItem(`bv_filter_${persistenceKey}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.from !== range.from || parsed.to !== range.to) {
            onRangeChange(parsed);
          }
        }
      } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistenceKey]);

  const presets = [
    { label: 'Today', getValue: () => { const d = new Date().toISOString().slice(0, 10); return { from: d, to: d }; } },
    { label: 'Yesterday', getValue: () => { 
        const d = new Date(); d.setDate(d.getDate() - 1); 
        const s = d.toISOString().slice(0, 10); 
        return { from: s, to: s }; 
    } },
    { label: 'This Week', getValue: () => {
        const now = new Date();
        const start = new Date(now.setDate(now.getDate() - now.getDay()));
        const end = new Date(now.setDate(now.getDate() - now.getDay() + 6));
        return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
    } },
    { label: 'This Month', getValue: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
    } },
    { label: 'Last 30 Days', getValue: () => {
        const end = new Date();
        const start = new Date(); start.setDate(start.getDate() - 29);
        return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
    } },
    { label: 'This Fiscal Year', getValue: () => {
        const { startDate, endDate } = getCurrentFiscalYearRange();
        return { from: startDate, to: endDate };
    } },
    { label: 'Last Fiscal Year', getValue: () => {
        const now = new Date();
        now.setFullYear(now.getFullYear() - 1);
        const { startDate, endDate } = getCurrentFiscalYearRange(now);
        return { from: startDate, to: endDate };
    } },
    { label: 'All Time', getValue: () => ({ from: '', to: '' }) },
  ];

  const applyRange = (newRange: DateRange) => {
    if (persistenceKey) {
      localStorage.setItem(`bv_filter_${persistenceKey}`, JSON.stringify(newRange));
    }
    onRangeChange(newRange);
    setIsOpen(false);
  };

  const getLabel = () => {
    if (!range.from && !range.to) return 'All Time';
    if (range.from === range.to) return range.from;
    return `${range.from || '...'} to ${range.to || '...'}`;
  };

  return (
    <div className={className}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-start text-left font-normal w-full sm:w-auto min-w-[200px] h-9 px-3 gap-2 border-dashed hover:border-primary/50 transition-colors">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{getLabel()}</span>
            <ChevronDown className="h-3 w-3 ml-auto opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align={align}>
          <div className="flex flex-col h-full">
            <div className="p-3 border-b bg-muted/20">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Range</h4>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}><X className="h-3 w-3" /></Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground ml-1">FROM</label>
                  <Input 
                    type="date" 
                    value={localRange.from} 
                    onChange={(e) => setLocalRange(prev => ({ ...prev, from: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground ml-1">TO</label>
                  <Input 
                    type="date" 
                    value={localRange.to} 
                    onChange={(e) => setLocalRange(prev => ({ ...prev, to: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
            
            <div className="p-1 grid grid-cols-2 gap-1 overflow-y-auto max-h-[220px]">
              {presets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => applyRange(p.getValue())}
                  className="flex items-center px-2.5 py-1.5 text-xs font-medium rounded-md hover:bg-primary/10 hover:text-primary transition-colors text-left"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="p-3 border-t bg-muted/20 flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 h-8 text-xs" 
                onClick={() => applyRange({ from: '', to: '' })}
              >
                Clear
              </Button>
              <Button 
                size="sm" 
                className="flex-1 h-8 text-xs"
                onClick={() => applyRange(localRange)}
              >
                Apply Range
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
