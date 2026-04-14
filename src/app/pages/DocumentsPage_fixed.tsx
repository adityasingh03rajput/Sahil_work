import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { DateRangePicker, type DateRange } from '../components/ui/date-range-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';
import { Badge } from '../components/ui/badge';
import {
  Plus,
  Search,
  MoreVertical,
  FileEdit,
  Download,
  Repeat,
  CheckCircle2,
  FileX,
  Trash2,
  ChevronRight,
  X
} from 'lucide-react';
import { cn } from '../components/ui/utils';
import QRCode from 'qrcode';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useIsNative } from '../hooks/useIsNative';
import { API_URL } from '../config/api';
import { toast } from 'sonner';
import { TraceLoader } from '../components/TraceLoader';
import { useCurrentProfile } from '../hooks/useCurrentProfile';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { fetchDocumentById, PDF_TEMPLATES, PdfRenderer, exportElementToPdf, exportElementToPdfBlobUrl, type PdfTemplateId, type DocumentDto } from '../pdf';
import { printElement } from '../pdf/nativePrint';
import { useRef } from 'react';
import { usePageRefresh } from '../hooks/usePageRefresh';