import React, { useRef, useState, useEffect, useCallback } from 'react';
import { CanvasElement, InteractionRule } from '../../types/game';
import { Trash2, Copy, ZoomIn, ZoomOut, Maximize2, Grid, Settings, Image as ImageIcon, Sparkles } from 'lucide-react';
import { sounds } from '../../utils/sound';

interface CanvasAreaProps {
  elements: CanvasElement[];
  selectedId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (updated: CanvasElement) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onAddElement?: (elemPartial: Partial<CanvasElement>) => void;
  onOpenProperties?: () => void;
  rules: InteractionRule[];
  showGrid?: boolean;
}

export const CanvasArea: React.FC<CanvasAreaProps> = ({
  elements,
  selectedId,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onAddElement,
  onOpenProperties,
  rules,
  showGrid = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const CANVAS_WIDTH = 1280;
  const CANVAS_HEIGHT = 720;

  const [scale, setScale] = useState(0.8);
  const [autoFit, setAutoFit] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; elemX: number; elemY: number } | null>(null);
  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);

  // Corner and Edge Interactive Resizing State
  type ResizeDir = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w';
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDir, setResizeDir] = useState<ResizeDir | null>(null);
  const [resizeStart, setResizeStart] = useState<{
    clientX: number;
    clientY: number;
    elemX: number;
    elemY: number;
    elemW: number;
    elemH: number;
  } | null>(null);

  // Calculate fit-to-screen scale accurately using ResizeObserver
  const computeFitScale = useCallback(() => {
    if (!containerRef.current) return 0.8;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth === 0 || clientHeight === 0) return 0.8;

    // Leave a safe margin for borders and padding
    const paddingX = clientWidth < 640 ? 16 : 32;
    const paddingY = clientHeight < 500 ? 16 : 32;
    const availableW = Math.max(80, clientWidth - paddingX);
    const availableH = Math.max(80, clientHeight - paddingY);

    const scaleX = availableW / CANVAS_WIDTH;
    const scaleY = availableH / CANVAS_HEIGHT;
    // Allow scaling down smoothly without cut-off
    const bestScale = Math.min(scaleX, scaleY, 1.0);
    return Math.max(0.15, Math.min(1.2, bestScale));
  }, []);

  // Update scale when container resizes or autoFit is turned on
  useEffect(() => {
    if (!containerRef.current) return;

    const handleResize = () => {
      if (autoFit) {
        setScale(computeFitScale());
      }
    };

    handleResize();

    const ro = new ResizeObserver(() => {
      handleResize();
    });
    ro.observe(containerRef.current);

    return () => ro.disconnect();
  }, [autoFit, computeFitScale]);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    sounds.playClick();
    setAutoFit(false);
    setScale(prev => Math.min(1.5, Math.round((prev + 0.1) * 10) / 10));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    sounds.playClick();
    setAutoFit(false);
    setScale(prev => Math.max(0.2, Math.round((prev - 0.1) * 10) / 10));
  };

  const handleResetFit = (e: React.MouseEvent) => {
    e.stopPropagation();
    sounds.playClick();
    setAutoFit(true);
    setScale(computeFitScale());
  };

  const selectedElement = elements.find(e => e.id === selectedId);

  // Dragging element logic on canvas
  const handlePointerDown = (e: React.PointerEvent, elem: CanvasElement) => {
    e.stopPropagation();
    sounds.playClick();
    onSelectElement(elem.id);
    onOpenProperties?.();
    const isLocked = Boolean(elem.isLocked) || elem.cardRole === 'static' || elem.isDraggable === false;
    if (isLocked) {
      // Locked card: selectable to edit properties/unlock, but CANNOT be dragged or moved!
      setIsDragging(false);
      setDragStart(null);
      return;
    }
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      elemX: elem.x,
      elemY: elem.y,
    });
  };

  // Resize element logic on canvas
  const handleResizePointerDown = (
    e: React.PointerEvent,
    elem: CanvasElement,
    dir: ResizeDir
  ) => {
    e.stopPropagation();
    sounds.playClick();
    onSelectElement(elem.id);
    onOpenProperties?.();
    const isLocked = Boolean(elem.isLocked) || elem.cardRole === 'static' || elem.isDraggable === false;
    if (isLocked) {
      return;
    }
    setIsResizing(true);
    setResizeDir(dir);
    setResizeStart({
      clientX: e.clientX,
      clientY: e.clientY,
      elemX: elem.x,
      elemY: elem.y,
      elemW: elem.width,
      elemH: elem.height,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // 1. Resizing in progress
    if (isResizing && resizeStart && resizeDir && selectedElement) {
      const deltaX = (e.clientX - resizeStart.clientX) / scale;
      const deltaY = (e.clientY - resizeStart.clientY) / scale;

      let newX = resizeStart.elemX;
      let newY = resizeStart.elemY;
      let newW = resizeStart.elemW;
      let newH = resizeStart.elemH;

      const MIN_SIZE = 40;

      if (resizeDir.includes('e')) {
        newW = Math.max(MIN_SIZE, Math.round(resizeStart.elemW + deltaX));
      }
      if (resizeDir.includes('s')) {
        newH = Math.max(MIN_SIZE, Math.round(resizeStart.elemH + deltaY));
      }
      if (resizeDir.includes('w')) {
        const potentialW = Math.max(MIN_SIZE, Math.round(resizeStart.elemW - deltaX));
        newX = Math.round(resizeStart.elemX + (resizeStart.elemW - potentialW));
        newW = potentialW;
      }
      if (resizeDir.includes('n')) {
        const potentialH = Math.max(MIN_SIZE, Math.round(resizeStart.elemH - deltaY));
        newY = Math.round(resizeStart.elemY + (resizeStart.elemH - potentialH));
        newH = potentialH;
      }

      // Snap to 10px grid if enabled
      if (showGrid) {
        newX = Math.round(newX / 10) * 10;
        newY = Math.round(newY / 10) * 10;
        newW = Math.round(newW / 10) * 10;
        newH = Math.round(newH / 10) * 10;
      }

      // Constrain within 1280x720 canvas
      newX = Math.max(0, Math.min(CANVAS_WIDTH - MIN_SIZE, newX));
      newY = Math.max(0, Math.min(CANVAS_HEIGHT - MIN_SIZE, newY));
      newW = Math.max(MIN_SIZE, Math.min(CANVAS_WIDTH - newX, newW));
      newH = Math.max(MIN_SIZE, Math.min(CANVAS_HEIGHT - newY, newH));

      onUpdateElement({
        ...selectedElement,
        x: newX,
        y: newY,
        width: newW,
        height: newH,
      });
      return;
    }

    // 2. Dragging element in progress
    if (!isDragging || !dragStart || !selectedElement) return;
    if (selectedElement.isLocked || selectedElement.cardRole === 'static' || selectedElement.isDraggable === false) {
      setIsDragging(false);
      setDragStart(null);
      return;
    }
    const rawDeltaX = e.clientX - dragStart.x;
    const rawDeltaY = e.clientY - dragStart.y;
    // Don't update coordinates for tiny click tremors (< 3px)
    if (Math.hypot(rawDeltaX, rawDeltaY) < 3) return;

    const deltaX = rawDeltaX / scale;
    const deltaY = rawDeltaY / scale;

    let newX = Math.round(dragStart.elemX + deltaX);
    let newY = Math.round(dragStart.elemY + deltaY);

    // Snap to 10px grid if enabled
    if (showGrid) {
      newX = Math.round(newX / 10) * 10;
      newY = Math.round(newY / 10) * 10;
    }

    // Keep within bounds
    newX = Math.max(0, Math.min(CANVAS_WIDTH - selectedElement.width, newX));
    newY = Math.max(0, Math.min(CANVAS_HEIGHT - selectedElement.height, newY));

    onUpdateElement({
      ...selectedElement,
      x: newX,
      y: newY,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setDragStart(null);
    setIsResizing(false);
    setResizeDir(null);
    setResizeStart(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOverCanvas) setIsDragOverCanvas(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOverCanvas(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverCanvas(false);

    if (!wrapperRef.current || !onAddElement) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const rawX = (e.clientX - rect.left) / scale;
    const rawY = (e.clientY - rect.top) / scale;

    const dropX = Math.round(Math.max(20, Math.min(CANVAS_WIDTH - 200, rawX - 90)));
    const dropY = Math.round(Math.max(20, Math.min(CANVAS_HEIGHT - 200, rawY - 90)));

    // Case 1: Dropped image file from desktop/folder
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'));
      if (file) {
        sounds.playCorrect();
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          if (dataUrl) {
            const clean = file.name.replace(/\.[^/.]+$/, '').trim();
            const isFriendly = clean.length <= 20 && !/^[0-9a-f-]{15,}$/i.test(clean) && !/^(image|img|screenshot|pngtree|download|preview)/i.test(clean);
            onAddElement({
              type: 'drag_item',
              x: dropX,
              y: dropY,
              width: 180,
              height: 180,
              text: isFriendly ? clean : '',
              imageUrl: dataUrl,
              bgColor: '#ffffff',
              borderColor: '#6366f1',
              borderWidth: 3,
              borderRadius: 24,
              textColor: '#1e293b',
              fontSize: 18,
              isDraggable: true,
              shadow: true,
            });
          }
        };
        reader.readAsDataURL(file);
        return;
      }
    }

    // Case 2: Dragged JSON payload from ToolboxSidebar
    try {
      const jsonStr = e.dataTransfer.getData('application/json');
      if (jsonStr) {
        const parsed = JSON.parse(jsonStr);
        sounds.playCorrect();
        onAddElement({
          ...parsed,
          x: dropX,
          y: dropY,
        });
      }
    } catch (err) {
      console.warn('Could not parse dropped element payload:', err);
    }
  };

  const scaledW = Math.round(CANVAS_WIDTH * scale);
  const scaledH = Math.round(CANVAS_HEIGHT * scale);

  return (
    <div
      ref={containerRef}
      onClick={(e) => {
        if (e.target === containerRef.current || e.target === wrapperRef.current) {
          onSelectElement(null);
        }
      }}
      className="w-full h-full flex items-center justify-center p-2 sm:p-4 bg-slate-900/10 overflow-auto select-none relative"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Floating Canvas Viewport Controls */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-lg border border-slate-200 flex items-center gap-2 text-xs font-bold text-slate-700"
      >
        <button
          onClick={handleZoomOut}
          disabled={scale <= 0.2}
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 disabled:opacity-40 transition active:scale-95"
          title="Thu nhỏ"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <span className="font-mono font-black text-slate-800 w-12 text-center">
          {Math.round(scale * 100)}%
        </span>

        <button
          onClick={handleZoomIn}
          disabled={scale >= 1.5}
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 disabled:opacity-40 transition active:scale-95"
          title="Phóng to"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-200 mx-0.5" />

        <button
          onClick={handleResetFit}
          className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition text-[11px] font-extrabold ${
            autoFit
              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              : 'hover:bg-slate-100 text-slate-600'
          }`}
          title="Tự động thu phóng vừa màn hình (100% hiển thị đủ)"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Vừa màn hình</span>
        </button>
      </div>

      {/* Outer Scaled Bounding Box: Perfectly matches the visible pixel dimensions */}
      <div
        ref={wrapperRef}
        style={{
          width: `${scaledW}px`,
          height: `${scaledH}px`,
          minWidth: `${scaledW}px`,
          minHeight: `${scaledH}px`,
          position: 'relative',
        }}
        className="transition-[width,height] duration-75 ease-out shadow-2xl rounded-3xl"
      >
        {/* Inner 1280x720 Canvas scaled with top-left origin */}
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onSelectElement(null);
            }
          }}
          style={{
            width: `${CANVAS_WIDTH}px`,
            height: `${CANVAS_HEIGHT}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
          className={`bg-white rounded-3xl overflow-hidden border-4 border-slate-300 transition-shadow ${
            showGrid
              ? 'bg-[radial-gradient(#cbd5e1_1.5px,transparent_1.5px)] [background-size:24px_24px]'
              : ''
          }`}
        >
          {/* Drop Image Overlay */}
          {isDragOverCanvas && (
            <div className="absolute inset-0 bg-indigo-600/15 border-4 border-dashed border-indigo-500 rounded-3xl z-50 flex flex-col items-center justify-center pointer-events-none animate-in fade-in">
              <div className="bg-white/95 backdrop-blur-md px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-3 text-indigo-700 font-black text-sm border-2 border-indigo-200">
                <Sparkles className="w-6 h-6 text-amber-500 animate-bounce" />
                <span>Thả ảnh vào đây để tạo thẻ ảnh tương tác!</span>
              </div>
            </div>
          )}

          {/* Render elements */}
          {elements.map((elem) => {
            const isSelected = elem.id === selectedId;

            return (
              <div
                key={elem.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectElement(elem.id);
                  onOpenProperties?.();
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  handlePointerDown(e, elem);
                }}
                style={{
                  position: 'absolute',
                  left: `${elem.x}px`,
                  top: `${elem.y}px`,
                  width: `${elem.width}px`,
                  height: `${elem.height}px`,
                  backgroundColor: elem.bgColor || 'transparent',
                  borderColor: elem.borderColor || 'transparent',
                  borderWidth: elem.borderWidth ? `${elem.borderWidth}px` : undefined,
                  borderRadius: elem.borderRadius ? `${elem.borderRadius}px` : undefined,
                  color: elem.textColor || '#1e293b',
                  fontSize: elem.fontSize ? `${elem.fontSize}px` : undefined,
                  fontWeight: elem.fontWeight || 'bold',
                  fontFamily: elem.isHandwriting ? "'Playpen Sans', 'Mali', cursive" : (elem.fontFamily || undefined),
                  boxShadow: elem.shadow ? '0 10px 25px -5px rgba(0, 0, 0, 0.1)' : undefined,
                  transform: elem.rotation ? `rotate(${elem.rotation}deg)` : undefined,
                  zIndex: elem.zIndex || (isSelected ? 50 : 10),
                }}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                className={`group transition-transform select-none ${
                  (elem.isLocked || elem.cardRole === 'static' || elem.isDraggable === false)
                    ? 'cursor-not-allowed'
                    : 'cursor-move'
                } ${
                  isSelected
                    ? 'ring-4 ring-indigo-500 ring-offset-2 ring-offset-white'
                    : 'hover:ring-2 hover:ring-indigo-300'
                }`}
              >
                {/* Type indicator badge for builder */}
                <div className={`absolute -top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow pointer-events-none opacity-90 shrink-0 whitespace-nowrap z-10 ${
                  elem.cardRole === 'illustration' || elem.isIllustration || elem.type === 'illustration_card'
                    ? 'bg-amber-600 ring-2 ring-amber-300'
                    : elem.isLocked || elem.cardRole === 'static' || elem.isDraggable === false
                    ? 'bg-slate-800'
                    : elem.cardRole === 'wrong'
                    ? 'bg-rose-600'
                    : (elem.type === 'drop_zone' || elem.isDropZone)
                    ? 'bg-sky-600'
                    : 'bg-emerald-600'
                }`}>
                  {elem.cardRole === 'illustration' || elem.isIllustration || elem.type === 'illustration_card'
                    ? '💡 Thẻ MINH HỌA (Đáp án mẫu)'
                    : elem.isLocked || elem.cardRole === 'static' || elem.isDraggable === false
                    ? '🔒 Đã khóa kéo (Không di chuyển)'
                    : elem.cardRole === 'wrong'
                    ? '❌ Kéo là SAI'
                    : (elem.type === 'drop_zone' || elem.isDropZone)
                    ? `🎯 Vùng đích${elem.maxItems && elem.maxItems > 0 ? ` (Chứa tối đa ${elem.maxItems} thẻ)` : ' (Không giới hạn)'}`
                    : '↔ Thẻ kéo ĐÚNG'}
                </div>

                {/* Inner element content */}
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-1.5 overflow-hidden rounded-[inherit] pointer-events-none">
                  {elem.imageUrl ? (
                    <img
                      key={elem.imageUrl}
                      src={elem.imageUrl}
                      alt={elem.text || 'Hình ảnh'}
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                      className={`max-w-[94%] object-contain rounded-xl pointer-events-none select-none transition-all shadow-xs ${
                        elem.text ? 'max-h-[64%] mb-1' : 'max-h-[90%] w-auto h-auto'
                      }`}
                    />
                  ) : elem.type === 'image' ? (
                    <div className="flex flex-col items-center justify-center text-slate-400 p-2 pointer-events-none">
                      <ImageIcon className="w-8 h-8 opacity-40 mb-1" />
                      <span className="text-[10px] font-bold">Thẻ ảnh</span>
                    </div>
                  ) : null}
                  {elem.icon && !elem.imageUrl && (
                    <span className="text-3xl mb-1 pointer-events-none">{elem.icon}</span>
                  )}
                  {elem.text && (
                    <span
                      className={`leading-tight px-2 pointer-events-none max-w-full truncate ${
                        elem.imageUrl ? 'text-xs font-black text-slate-800' : ''
                      } ${
                        elem.isHandwriting ? 'font-handwriting lowercase font-bold tracking-normal text-indigo-950' : ''
                      }`}
                    >
                      {elem.text}
                    </span>
                  )}
                  {elem.subText && (
                    <span className="text-xs opacity-75 font-semibold mt-0.5 px-2 pointer-events-none truncate max-w-full">
                      {elem.subText}
                    </span>
                  )}
                </div>

                {/* 4 Interactive Corner Resize Handles (Hidden if card is locked) */}
                {isSelected && !(elem.isLocked || elem.cardRole === 'static' || elem.isDraggable === false) && (
                  <>
                    <div
                      onPointerDown={(e) => handleResizePointerDown(e, elem, 'nw')}
                      className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-600 shadow-md cursor-nwse-resize z-40 transition-transform hover:scale-125"
                      title="Kéo góc trên-trái để chỉnh kích thước"
                    />
                    <div
                      onPointerDown={(e) => handleResizePointerDown(e, elem, 'ne')}
                      className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-600 shadow-md cursor-nesw-resize z-40 transition-transform hover:scale-125"
                      title="Kéo góc trên-phải để chỉnh kích thước"
                    />
                    <div
                      onPointerDown={(e) => handleResizePointerDown(e, elem, 'se')}
                      className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-600 shadow-md cursor-nwse-resize z-40 transition-transform hover:scale-125"
                      title="Kéo góc dưới-phải để chỉnh kích thước"
                    />
                    <div
                      onPointerDown={(e) => handleResizePointerDown(e, elem, 'sw')}
                      className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-600 shadow-md cursor-nesw-resize z-40 transition-transform hover:scale-125"
                      title="Kéo góc dưới-trái để chỉnh kích thước"
                    />
                  </>
                )}

                {/* 4 Interactive Edge Resize Handles (Hidden if card is locked) */}
                {isSelected && !(elem.isLocked || elem.cardRole === 'static' || elem.isDraggable === false) && (
                  <>
                    <div
                      onPointerDown={(e) => handleResizePointerDown(e, elem, 'n')}
                      className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-2 rounded-full bg-white border border-indigo-500 shadow-xs cursor-ns-resize z-40 transition-transform hover:scale-125 opacity-90"
                      title="Chỉnh chiều cao (trên)"
                    />
                    <div
                      onPointerDown={(e) => handleResizePointerDown(e, elem, 's')}
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-2 rounded-full bg-white border border-indigo-500 shadow-xs cursor-ns-resize z-40 transition-transform hover:scale-125 opacity-90"
                      title="Chỉnh chiều cao (dưới)"
                    />
                    <div
                      onPointerDown={(e) => handleResizePointerDown(e, elem, 'w')}
                      className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2 h-3.5 rounded-full bg-white border border-indigo-500 shadow-xs cursor-ew-resize z-40 transition-transform hover:scale-125 opacity-90"
                      title="Chỉnh chiều rộng (trái)"
                    />
                    <div
                      onPointerDown={(e) => handleResizePointerDown(e, elem, 'e')}
                      className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2 h-3.5 rounded-full bg-white border border-indigo-500 shadow-xs cursor-ew-resize z-40 transition-transform hover:scale-125 opacity-90"
                      title="Chỉnh chiều rộng (phải)"
                    />
                  </>
                )}

                {/* Selection floating toolbar */}
                {isSelected && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-md text-white px-2.5 py-1 rounded-2xl shadow-xl border border-slate-700 z-50 pointer-events-auto shrink-0 whitespace-nowrap animate-in fade-in zoom-in-95"
                  >
                    <span className="text-[10px] font-black text-slate-300 px-1 border-r border-slate-700 truncate max-w-[120px]">
                      {elem.text || elem.type}
                    </span>

                    {/* Quick Lock / Unlock Button on Canvas */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        sounds.playClick();
                        const isLocked = Boolean(elem.isLocked) || elem.cardRole === 'static' || elem.isDraggable === false;
                        onUpdateElement({
                          ...elem,
                          isLocked: !isLocked,
                          isDraggable: isLocked,
                          cardRole: isLocked ? 'correct' : 'static',
                        });
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-black flex items-center gap-1 transition cursor-pointer ${
                        (elem.isLocked || elem.cardRole === 'static' || elem.isDraggable === false)
                          ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-black ring-1 ring-amber-500'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      }`}
                      title={
                        (elem.isLocked || elem.cardRole === 'static' || elem.isDraggable === false)
                          ? 'Thẻ đang khóa kéo (Không di chuyển). Bấm để mở khóa'
                          : 'Bấm để khóa kéo thẻ này (Cố định, không thể kéo di chuyển)'
                      }
                    >
                      <span>{(elem.isLocked || elem.cardRole === 'static' || elem.isDraggable === false) ? '🔒 Đã khóa' : '🔓 Khóa kéo'}</span>
                    </button>

                    {onOpenProperties && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenProperties();
                        }}
                        className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-[11px] font-black flex items-center gap-1 transition cursor-pointer"
                        title="Mở bảng thuộc tính để chỉnh sửa thẻ này"
                      >
                        <Settings className="w-3 h-3" />
                        <span>Thuộc tính</span>
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateElement(elem.id);
                      }}
                      className="p-1 hover:bg-slate-700 rounded-lg text-slate-200 hover:text-white transition cursor-pointer"
                      title="Nhân đôi thẻ này"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteElement(elem.id);
                      }}
                      className="p-1 hover:bg-rose-600 rounded-lg text-rose-300 hover:text-white transition cursor-pointer"
                      title="Xóa thẻ này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
