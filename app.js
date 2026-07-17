import { parseGIF, decompressFrames } from 'https://cdn.jsdelivr.net/npm/gifuct-js@2.1.2/+esm';

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const uploadState = document.getElementById('upload-state');
  const editorState = document.getElementById('editor-state');
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('gif-file-input');
  const btnBrowse = document.getElementById('btn-browse');
  const btnChangeFile = document.getElementById('btn-change-file');
  const btnDownloadTop = document.getElementById('btn-download-top');
  
  const gifPreview = document.getElementById('gif-preview');
  const gifWrapper = document.getElementById('gif-wrapper');
  const cropOverlay = document.getElementById('crop-overlay');
  const cropBox = document.getElementById('crop-box');
  const cropBoxSize = document.getElementById('crop-box-size');
  
  const metaFilename = document.getElementById('meta-filename');
  const metaFilesize = document.getElementById('meta-filesize');
  const metaDimensions = document.getElementById('meta-dimensions');
  
  // Controls
  const resizeWidth = document.getElementById('resize-width');
  const resizeHeight = document.getElementById('resize-height');
  const keepAspect = document.getElementById('keep-aspect-ratio');
  const btnApplyResize = document.getElementById('btn-apply-resize');
  
  const cropXInput = document.getElementById('crop-x');
  const cropYInput = document.getElementById('crop-y');
  const cropWInput = document.getElementById('crop-w');
  const cropHInput = document.getElementById('crop-h');
  const btnApplyCrop = document.getElementById('btn-apply-crop');
  
  const scaleSlider = document.getElementById('scale-slider');
  const scaleVal = document.getElementById('scale-val');
  const speedSlider = document.getElementById('speed-slider');
  const speedVal = document.getElementById('speed-val');
  
  // Toast
  const toast = document.getElementById('toast-notification');
  const toastMsg = document.getElementById('toast-message');
  
  // Tabs elements
  const tabButtons = document.querySelectorAll('.tool-tab-btn');
  const toolPanels = document.querySelectorAll('.tool-panel');
  
  // State variables
  let currentFile = null;
  let objectUrl = null;
  let gifArrayBuffer = null;
  let processedGifDataUrl = null;
  
  let originalWidth = 0;
  let originalHeight = 0;
  let aspectRatio = 1;
  
  let cropState = { x: 0, y: 0, w: 0, h: 0 };
  
  // 1. Toast Notification Utility
  function showToast(message, duration = 3000) {
    toastMsg.textContent = message;
    toast.className = 'toast-visible';
    
    setTimeout(() => {
      toast.className = 'toast-hidden';
    }, duration);
  }
  
  // 2. Loading Overlay Utility
  function showLoader(title, subtitle) {
    document.getElementById('loader-title').textContent = title;
    document.getElementById('loader-subtitle').textContent = subtitle;
    document.getElementById('progress-bar').style.width = '0%';
    document.getElementById('processing-loader').className = '';
  }
  
  function updateLoaderProgress(pct) {
    document.getElementById('progress-bar').style.width = `${pct}%`;
  }
  
  function hideLoader() {
    document.getElementById('processing-loader').className = 'loader-hidden';
  }

  // 3. Tab Switching Logic
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      
      // Switch active tab button
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Switch active panel
      toolPanels.forEach(p => p.classList.remove('active'));
      document.getElementById(targetId).classList.add('active');
      
      // Show/Hide crop overlay dynamically
      if (targetId === 'panel-crop') {
        cropOverlay.classList.remove('crop-overlay-hidden');
        setTimeout(updateCropOverlayBounds, 50); // small delay to ensure rendering completes
      } else {
        cropOverlay.classList.add('crop-overlay-hidden');
      }
    });
  });

  // 4. Drag & Drop Event Listeners
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
    }, false);
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      handleGifFile(files[0]);
    }
  });

  // 5. File Input Trigger / Change
  btnBrowse.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleGifFile(e.target.files[0]);
    }
  });

  // 6. File processing and state transition
  function handleGifFile(file) {
    if (file.type !== 'image/gif' && !file.name.toLowerCase().endsWith('.gif')) {
      showToast('Error: Please select a valid GIF file.');
      return;
    }
    
    currentFile = file;
    processedGifDataUrl = null;
    btnDownloadTop.disabled = true;
    
    // Switch object URLs to avoid memory leaks
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
    objectUrl = URL.createObjectURL(file);
    gifPreview.src = objectUrl;
    
    // Fill metadata: Name & Size
    metaFilename.textContent = file.name;
    metaFilesize.textContent = formatBytes(file.size);
    
    // Load file as array buffer for parser
    const reader = new FileReader();
    reader.onload = function(e) {
      gifArrayBuffer = e.target.result;
    };
    reader.readAsArrayBuffer(file);
    
    // Get image dimensions
    const img = new Image();
    img.onload = function() {
      originalWidth = this.width;
      originalHeight = this.height;
      aspectRatio = originalWidth / originalHeight;
      
      metaDimensions.textContent = `${originalWidth} x ${originalHeight} px`;
      
      // Update resize controls default values
      resizeWidth.value = originalWidth;
      resizeHeight.value = originalHeight;
      
      // Update crop controls default values
      cropXInput.value = 0;
      cropYInput.value = 0;
      cropWInput.value = originalWidth;
      cropHInput.value = originalHeight;
      
      cropState = { x: 0, y: 0, w: originalWidth, h: originalHeight };
      
      // Reset active tabs back to Resize
      tabButtons.forEach(b => b.classList.remove('active'));
      document.querySelector('[data-target="panel-resize"]').classList.add('active');
      toolPanels.forEach(p => p.classList.remove('active'));
      document.getElementById('panel-resize').classList.add('active');
      cropOverlay.classList.add('crop-overlay-hidden');
      
      // Transition states: hide landing page, show editor workspace
      uploadState.classList.remove('active');
      setTimeout(() => {
        uploadState.style.display = 'none';
        editorState.style.display = 'block';
        setTimeout(() => {
          editorState.classList.add('active');
          updateCropOverlayBounds();
        }, 50);
      }, 300);
      
      showToast('GIF successfully loaded!');
    };
    
    img.onerror = function() {
      showToast('Error: Failed to load GIF image.');
    };
    
    img.src = objectUrl;
  }

  // Helper: Format file size bytes
  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // 7. Choose Another File / Reset Workflow
  btnChangeFile.addEventListener('click', () => {
    // Reset file inputs and buffers
    fileInput.value = '';
    currentFile = null;
    gifArrayBuffer = null;
    processedGifDataUrl = null;
    btnDownloadTop.disabled = true;
    
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    
    // Reset input fields
    resizeWidth.value = '';
    resizeHeight.value = '';
    keepAspect.checked = true;
    
    cropXInput.value = '';
    cropYInput.value = '';
    cropWInput.value = '';
    cropHInput.value = '';
    
    scaleSlider.value = 100;
    scaleVal.textContent = '100%';
    speedSlider.value = 1;
    speedVal.textContent = '1.0x (Original)';
    
    cropOverlay.classList.add('crop-overlay-hidden');
    
    // Transition states: hide editor, show upload landing
    editorState.classList.remove('active');
    setTimeout(() => {
      editorState.style.display = 'none';
      uploadState.style.display = 'block';
      setTimeout(() => {
        uploadState.classList.add('active');
      }, 50);
    }, 300);
    
    showToast('Workspace reset successfully.');
  });

  // 8. Aspect Ratio Locking
  resizeWidth.addEventListener('input', () => {
    if (keepAspect.checked && originalWidth > 0) {
      const val = parseInt(resizeWidth.value);
      if (!isNaN(val)) {
        resizeHeight.value = Math.round(val / aspectRatio);
      }
    }
  });

  resizeHeight.addEventListener('input', () => {
    if (keepAspect.checked && originalHeight > 0) {
      const val = parseInt(resizeHeight.value);
      if (!isNaN(val)) {
        resizeWidth.value = Math.round(val * aspectRatio);
      }
    }
  });

  // 9. Downscale/Speed sliders live update (placeholders)
  scaleSlider.addEventListener('input', (e) => {
    scaleVal.textContent = `${e.target.value}%`;
  });

  speedSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    speedVal.textContent = val === 1 ? '1.0x (Original)' : `${val.toFixed(2)}x`;
  });

  // 10. Visual Crop Box Drag & Resize Operations
  let isDragging = false;
  let isResizing = false;
  let currentHandle = null;
  let dragStart = { x: 0, y: 0 };
  let cropStart = { x: 0, y: 0, w: 0, h: 0 };

  function getCoords(e) {
    if (e.touches && e.touches.length > 0) {
      return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    }
    return { clientX: e.clientX, clientY: e.clientY };
  }

  function updateCropOverlayBounds() {
    if (!gifPreview.complete || gifPreview.naturalWidth === 0) return;
    
    const width = gifPreview.clientWidth;
    const height = gifPreview.clientHeight;
    
    cropOverlay.style.width = `${width}px`;
    cropOverlay.style.height = `${height}px`;
    
    const scale = width / originalWidth;
    
    cropBox.style.left = `${cropState.x * scale}px`;
    cropBox.style.top = `${cropState.y * scale}px`;
    cropBox.style.width = `${cropState.w * scale}px`;
    cropBox.style.height = `${cropState.h * scale}px`;
    
    cropBoxSize.textContent = `${Math.round(cropState.w)} x ${Math.round(cropState.h)}`;
  }

  // Trigger update on image load and window resizing
  gifPreview.addEventListener('load', updateCropOverlayBounds);
  window.addEventListener('resize', updateCropOverlayBounds);

  cropBox.addEventListener('mousedown', startDrag);
  cropBox.addEventListener('touchstart', startDrag, { passive: false });

  function startDrag(e) {
    if (e.target.classList.contains('crop-handle')) return;
    isDragging = true;
    const coords = getCoords(e);
    dragStart.x = coords.clientX;
    dragStart.y = coords.clientY;
    cropStart.x = cropState.x;
    cropStart.y = cropState.y;
    if (e.cancelable) e.preventDefault();
  }

  document.querySelectorAll('.crop-handle').forEach(handle => {
    handle.addEventListener('mousedown', startResize);
    handle.addEventListener('touchstart', startResize, { passive: false });
  });

  function startResize(e) {
    isResizing = true;
    currentHandle = e.target.dataset.handle;
    const coords = getCoords(e);
    dragStart.x = coords.clientX;
    dragStart.y = coords.clientY;
    cropStart.x = cropState.x;
    cropStart.y = cropState.y;
    cropStart.w = cropState.w;
    cropStart.h = cropState.h;
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();
  }

  document.addEventListener('mousemove', moveHandler);
  document.addEventListener('touchmove', moveHandler, { passive: false });

  function moveHandler(e) {
    if (!isDragging && !isResizing) return;
    
    const scale = gifPreview.clientWidth / originalWidth;
    const coords = getCoords(e);
    const deltaX = (coords.clientX - dragStart.x) / scale;
    const deltaY = (coords.clientY - dragStart.y) / scale;
    
    if (isDragging) {
      let newX = cropStart.x + deltaX;
      let newY = cropStart.y + deltaY;
      
      newX = Math.max(0, Math.min(originalWidth - cropState.w, newX));
      newY = Math.max(0, Math.min(originalHeight - cropState.h, newY));
      
      cropState.x = newX;
      cropState.y = newY;
    } else if (isResizing) {
      if (currentHandle === 'br') {
        let newW = cropStart.w + deltaX;
        let newH = cropStart.h + deltaY;
        newW = Math.max(10, Math.min(originalWidth - cropState.x, newW));
        newH = Math.max(10, Math.min(originalHeight - cropState.y, newH));
        cropState.w = newW;
        cropState.h = newH;
      } else if (currentHandle === 'tl') {
        let newX = cropStart.x + deltaX;
        let newY = cropStart.y + deltaY;
        let newW = cropStart.w - deltaX;
        let newH = cropStart.h - deltaY;
        if (newX >= 0 && newW >= 10) {
          cropState.x = newX;
          cropState.w = newW;
        }
        if (newY >= 0 && newH >= 10) {
          cropState.y = newY;
          cropState.h = newH;
        }
      } else if (currentHandle === 'tr') {
        let newY = cropStart.y + deltaY;
        let newW = cropStart.w + deltaX;
        let newH = cropStart.h - deltaY;
        if (newW >= 10 && (cropState.x + newW <= originalWidth)) {
          cropState.w = newW;
        }
        if (newY >= 0 && newH >= 10) {
          cropState.y = newY;
          cropState.h = newH;
        }
      } else if (currentHandle === 'bl') {
        let newX = cropStart.x + deltaX;
        let newW = cropStart.w - deltaX;
        let newH = cropStart.h + deltaY;
        if (newX >= 0 && newW >= 10) {
          cropState.x = newX;
          cropState.w = newW;
        }
        if (newH >= 10 && (cropState.y + newH <= originalHeight)) {
          cropState.h = newH;
        }
      }
    }
    
    cropXInput.value = Math.round(cropState.x);
    cropYInput.value = Math.round(cropState.y);
    cropWInput.value = Math.round(cropState.w);
    cropHInput.value = Math.round(cropState.h);
    
    updateCropOverlayBounds();
    if (e.cancelable) e.preventDefault();
  }

  document.addEventListener('mouseup', endHandler);
  document.addEventListener('touchend', endHandler);

  function endHandler() {
    isDragging = false;
    isResizing = false;
    currentHandle = null;
  }

  // Update visual overlay box when manual input coords are typed
  const updateFromInputs = () => {
    let x = parseInt(cropXInput.value) || 0;
    let y = parseInt(cropYInput.value) || 0;
    let w = parseInt(cropWInput.value) || originalWidth;
    let h = parseInt(cropHInput.value) || originalHeight;
    
    x = Math.max(0, Math.min(originalWidth, x));
    y = Math.max(0, Math.min(originalHeight, y));
    w = Math.max(10, Math.min(originalWidth - x, w));
    h = Math.max(10, Math.min(originalHeight - y, h));
    
    cropState = { x, y, w, h };
    updateCropOverlayBounds();
  };

  [cropXInput, cropYInput, cropWInput, cropHInput].forEach(inp => {
    inp.addEventListener('input', updateFromInputs);
  });

  // 11. GIF frame-by-frame processing core engine
  function dataURIToArrayBuffer(dataURI) {
    const byteString = atob(dataURI.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return ab;
  }

  function processGif(action) {
    if (!gifArrayBuffer) {
      showToast('Error: No file loaded to process.');
      return;
    }

    try {
      showLoader('Decoding GIF...', 'Reading and parsing file structure.');
      
      // Parse GIF raw buffer using gifuct-js
      const parsedGif = parseGIF(gifArrayBuffer);
      const frames = decompressFrames(parsedGif, true);
      
      if (!frames || frames.length === 0) {
        throw new Error('No animation frames found in the GIF.');
      }
      
      let targetW, targetH;
      let cX = 0, cY = 0, cW = originalWidth, cH = originalHeight;

      if (action === 'resize') {
        targetW = parseInt(resizeWidth.value) || originalWidth;
        targetH = parseInt(resizeHeight.value) || originalHeight;
        if (targetW <= 0 || targetH <= 0) {
          throw new Error('Width and Height must be positive numbers.');
        }
      } else if (action === 'crop') {
        cX = parseInt(cropXInput.value) || 0;
        cY = parseInt(cropYInput.value) || 0;
        cW = parseInt(cropWInput.value) || originalWidth;
        cH = parseInt(cropHInput.value) || originalHeight;
        
        if (cW <= 0 || cH <= 0) {
          throw new Error('Crop Width and Height must be positive numbers.');
        }
        targetW = cW;
        targetH = cH;
      }

      const processedImages = [];
      let i = 0;
      
      // Create accumulated canvas of original size to accumulate frames sequentially
      const accumCanvas = document.createElement('canvas');
      accumCanvas.width = originalWidth;
      accumCanvas.height = originalHeight;
      const accumCtx = accumCanvas.getContext('2d');
      
      function renderFrame() {
        if (i >= frames.length) {
          // Re-encoding phase using gifshot
          showLoader('Encoding GIF...', 'Compiling frames. Please wait...');
          
          let avgDelay = 100;
          const sum = frames.reduce((acc, f) => acc + (f.delay || 100), 0);
          avgDelay = sum / frames.length;
          
          gifshot.createGIF({
            images: processedImages,
            gifWidth: targetW,
            gifHeight: targetH,
            interval: avgDelay / 1000,
            numWorkers: 2
          }, function(obj) {
            if (!obj.error) {
              processedGifDataUrl = obj.image;
              gifPreview.src = processedGifDataUrl;
              
              // Cache buffer for next sequential operation
              gifArrayBuffer = dataURIToArrayBuffer(processedGifDataUrl);
              
              // Update state sizes
              originalWidth = targetW;
              originalHeight = targetH;
              aspectRatio = originalWidth / originalHeight;
              
              // Reset dimensions texts
              metaDimensions.textContent = `${originalWidth} x ${originalHeight} px`;
              
              // Calculate size of generated base64
              const base64Len = processedGifDataUrl.length - (processedGifDataUrl.indexOf(',') + 1);
              const padding = (processedGifDataUrl.endsWith('==')) ? 2 : (processedGifDataUrl.endsWith('=') ? 1 : 0);
              const calculatedBytes = (base64Len * 0.75) - padding;
              metaFilesize.textContent = formatBytes(calculatedBytes);
              
              // Reset edit input values
              resizeWidth.value = originalWidth;
              resizeHeight.value = originalHeight;
              
              cropXInput.value = 0;
              cropYInput.value = 0;
              cropWInput.value = originalWidth;
              cropHInput.value = originalHeight;
              cropState = { x: 0, y: 0, w: originalWidth, h: originalHeight };
              
              // Enable download top button
              btnDownloadTop.disabled = false;
              
              hideLoader();
              showToast('GIF successfully updated!');
              updateCropOverlayBounds();
            } else {
              hideLoader();
              showToast('Encoding failed: ' + obj.error);
            }
          });
          return;
        }

        // Render current frame
        const frame = frames[i];
        
        // Update loader progress bar
        const percent = Math.round((i / frames.length) * 100);
        showLoader('Processing frames...', `Rendering frame ${i + 1} of ${frames.length}`);
        updateLoaderProgress(percent);
        
        // Handle disposal method 2 (clear previous frame patch area before drawing)
        if (i > 0 && frames[i-1].disposalType === 2) {
          accumCtx.clearRect(frames[i-1].dims.left, frames[i-1].dims.top, frames[i-1].dims.width, frames[i-1].dims.height);
        }
        
        // Render current frame patch onto a temporary canvas
        const patchCanvas = document.createElement('canvas');
        patchCanvas.width = frame.dims.width;
        patchCanvas.height = frame.dims.height;
        const patchCtx = patchCanvas.getContext('2d');
        const patchImgData = patchCtx.createImageData(frame.dims.width, frame.dims.height);
        patchImgData.data.set(frame.patch);
        patchCtx.putImageData(patchImgData, 0, 0);
        
        // Draw patch at the designated top/left offset
        accumCtx.drawImage(patchCanvas, frame.dims.left, frame.dims.top);
        
        // Create target canvas representing the transformed (cropped or resized) frame
        const targetCanvas = document.createElement('canvas');
        targetCanvas.width = targetW;
        targetCanvas.height = targetH;
        const targetCtx = targetCanvas.getContext('2d');
        
        if (action === 'resize') {
          targetCtx.drawImage(accumCanvas, 0, 0, originalWidth, originalHeight, 0, 0, targetW, targetH);
        } else if (action === 'crop') {
          targetCtx.drawImage(accumCanvas, cX, cY, cW, cH, 0, 0, targetW, targetH);
        }
        
        processedImages.push(targetCanvas.toDataURL('image/png'));
        
        i++;
        setTimeout(renderFrame, 0);
      }
      
      setTimeout(renderFrame, 50);
      
    } catch (err) {
      hideLoader();
      showToast('Error: ' + err.message);
    }
  }

  // Bind edit action button clicks
  btnApplyResize.addEventListener('click', () => {
    processGif('resize');
  });

  btnApplyCrop.addEventListener('click', () => {
    processGif('crop');
  });

  // 12. Top Download Button Action
  btnDownloadTop.addEventListener('click', () => {
    if (!processedGifDataUrl) return;
    
    const filename = currentFile ? 'edited_' + currentFile.name : 'edited.gif';
    const link = document.createElement('a');
    link.href = processedGifDataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('GIF downloaded successfully!');
  });
});
