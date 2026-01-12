import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import BpmnJS from 'bpmn-js/lib/NavigatedViewer';
import { saveAs } from 'file-saver';
import { Button, ButtonGroup } from 'react-bootstrap';
import { ZoomIn, ZoomOut, ArrowsFullscreen, AspectRatio } from 'react-bootstrap-icons';

interface BpmnViewerProps {
  xml: string;
  onElementClick?: (element: any) => void;
}

export interface BpmnViewerRef {
  exportSVG: () => Promise<void>;
  exportPNG: () => Promise<void>;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomReset: () => void;
}

const BpmnViewer = forwardRef<BpmnViewerRef, BpmnViewerProps>(({ xml, onElementClick }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<BpmnJS | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  useEffect(() => {
    if (!containerRef.current) return;

    // Destroy existing viewer if it exists
    if (viewerRef.current) {
      viewerRef.current.destroy();
      viewerRef.current = null;
    }

    // Create new viewer with navigation capabilities
    const viewer = new BpmnJS({
      container: containerRef.current,
      height: '100%',
      width: '100%',
      keyboard: {
        bindTo: document
      }
    });

    viewerRef.current = viewer;

    // Import XML
    viewer.importXML(xml)
      .then(() => {
        const canvas = viewer.get('canvas');
        canvas.zoom('fit-viewport');
        
        // Update zoom level
        const currentZoom = canvas.zoom();
        setZoomLevel(Math.round(currentZoom * 100) / 100);
      })
      .catch(err => {
        console.error('Error rendering BPMN diagram:', err);
      });

    // Add zoom scroll listener
    const canvas = viewer.get('canvas');
    const eventBus = viewer.get('eventBus');
    
    eventBus.on('canvas.viewbox.changed', () => {
      const currentZoom = canvas.zoom();
      setZoomLevel(Math.round(currentZoom * 100) / 100);
    });

    // Add click handler if provided
    if (onElementClick) {
      eventBus.on('element.click', (e: any) => {
        onElementClick(e.element);
      });
    }

    // Cleanup function
    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [xml, onElementClick]);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    exportSVG: async () => {
      if (viewerRef.current) {
        try {
          const { svg } = await viewerRef.current.saveSVG();
          const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
          saveAs(blob, 'diagram.svg');
        } catch (error) {
          console.error('Error exporting SVG:', error);
          throw error;
        }
      }
    },
    
    exportPNG: async () => {
      if (viewerRef.current) {
        try {
          const { svg } = await viewerRef.current.saveSVG();
          
          // Create a temporary image element
          const img = new Image();
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            throw new Error('Could not get canvas context');
          }

          // Convert SVG to data URL
          const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(svgBlob);

          // Load image and convert to PNG
          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              // Set canvas size based on image dimensions
              canvas.width = img.width;
              canvas.height = img.height;
              
              // Fill white background
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              
              // Draw the image
              ctx.drawImage(img, 0, 0);
              
              // Convert to blob and save
              canvas.toBlob((blob) => {
                if (blob) {
                  saveAs(blob, 'diagram.png');
                  URL.revokeObjectURL(url);
                  resolve();
                } else {
                  reject(new Error('Failed to create PNG blob'));
                }
              }, 'image/png');
            };
            
            img.onerror = () => {
              URL.revokeObjectURL(url);
              reject(new Error('Failed to load SVG image'));
            };
            
            img.src = url;
          });
        } catch (error) {
          console.error('Error exporting PNG:', error);
          throw error;
        }
      }
    },
    
    zoomIn: () => {
      if (viewerRef.current) {
        const canvas = viewerRef.current.get('canvas');
        const currentZoom = canvas.zoom();
        canvas.zoom(currentZoom + 0.1);
      }
    },
    
    zoomOut: () => {
      if (viewerRef.current) {
        const canvas = viewerRef.current.get('canvas');
        const currentZoom = canvas.zoom();
        canvas.zoom(Math.max(0.2, currentZoom - 0.1));
      }
    },
    
    zoomReset: () => {
      if (viewerRef.current) {
        const canvas = viewerRef.current.get('canvas');
        canvas.zoom('fit-viewport');
      }
    }
  }));

  const handleZoomIn = () => {
    if (viewerRef.current) {
      const canvas = viewerRef.current.get('canvas');
      const currentZoom = canvas.zoom();
      canvas.zoom(currentZoom + 0.1);
    }
  };

  const handleZoomOut = () => {
    if (viewerRef.current) {
      const canvas = viewerRef.current.get('canvas');
      const currentZoom = canvas.zoom();
      canvas.zoom(Math.max(0.2, currentZoom - 0.1));
    }
  };

  const handleZoomReset = () => {
    if (viewerRef.current) {
      const canvas = viewerRef.current.get('canvas');
      canvas.zoom('fit-viewport');
    }
  };

  const handleZoomActual = () => {
    if (viewerRef.current) {
      const canvas = viewerRef.current.get('canvas');
      canvas.zoom(1.0);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '600px' }}>
      {/* Zoom Controls */}
      <div 
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 10,
          backgroundColor: 'white',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          padding: '4px'
        }}
      >
        <ButtonGroup vertical size="sm">
          <Button 
            variant="light" 
            onClick={handleZoomIn}
            title="Zoom In"
          >
            <ZoomIn />
          </Button>
          <Button 
            variant="light" 
            onClick={handleZoomOut}
            title="Zoom Out"
          >
            <ZoomOut />
          </Button>
          <Button 
            variant="light" 
            onClick={handleZoomActual}
            title="Actual Size (100%)"
          >
            <AspectRatio />
          </Button>
          <Button 
            variant="light" 
            onClick={handleZoomReset}
            title="Fit to Screen"
          >
            <ArrowsFullscreen />
          </Button>
        </ButtonGroup>
      </div>

      {/* Zoom Level Indicator */}
      <div 
        style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          zIndex: 10,
          backgroundColor: 'white',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          padding: '4px 8px',
          fontSize: '12px',
          fontWeight: 'bold'
        }}
      >
        {Math.round(zoomLevel * 100)}%
      </div>

      {/* BPMN Container */}
      <div 
        ref={containerRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          border: '1px solid #ddd',
          borderRadius: '4px',
          backgroundColor: '#fafafa',
          cursor: 'move'
        }} 
        onMouseDown={(e) => {
          if (containerRef.current) {
            containerRef.current.style.cursor = 'grabbing';
          }
        }}
        onMouseUp={(e) => {
          if (containerRef.current) {
            containerRef.current.style.cursor = 'move';
          }
        }}
        onMouseLeave={(e) => {
          if (containerRef.current) {
            containerRef.current.style.cursor = 'move';
          }
        }}
      />
    </div>
  );
});

BpmnViewer.displayName = 'BpmnViewer';

export default BpmnViewer;