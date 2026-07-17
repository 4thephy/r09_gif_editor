document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const uploadState = document.getElementById('upload-state');
  const editorState = document.getElementById('editor-state');
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('gif-file-input');
  const btnBrowse = document.getElementById('btn-browse');
  const btnChangeFile = document.getElementById('btn-change-file');
  
  const gifPreview = document.getElementById('gif-preview');
  const metaFilename = document.getElementById('meta-filename');
  const metaFilesize = document.getElementById('meta-filesize');
  const metaDimensions = document.getElementById('meta-dimensions');
  
  // Controls
  const resizeWidth = document.getElementById('resize-width');
  const resizeHeight = document.getElementById('resize-height');
  const keepAspect = document.getElementById('keep-aspect-ratio');
  
  const scaleSlider = document.getElementById('scale-slider');
  const scaleVal = document.getElementById('scale-val');
  
  const cropX = document.getElementById('crop-x');
  const cropY = document.getElementById('crop-y');
  const cropW = document.getElementById('crop-w');
  const cropH = document.getElementById('crop-h');
  const btnCropEnable = document.getElementById('btn-crop-enable');
  
  const speedSlider = document.getElementById('speed-slider');
  const speedVal = document.getElementById('speed-val');
  
  const btnExport = document.getElementById('btn-export');
  
  // Toast
  const toast = document.getElementById('toast-notification');
  const toastMsg = document.getElementById('toast-message');
  
  // State variables
  let currentFile = null;
  let objectUrl = null;
  let originalWidth = 0;
  let originalHeight = 0;
  let aspectRatio = 1;

  // 1. Toast Notification Utility
  function showToast(message, duration = 3000) {
    toastMsg.textContent = message;
    toast.className = 'toast-visible';
    
    setTimeout(() => {
      toast.className = 'toast-hidden';
    }, duration);
  }

  // 2. Drag & Drop Event Listeners
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

  // 3. File Input Trigger / Change
  btnBrowse.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleGifFile(e.target.files[0]);
    }
  });

  // 4. File processing and state transition
  function handleGifFile(file) {
    if (file.type !== 'image/gif' && !file.name.toLowerCase().endsWith('.gif')) {
      showToast('Error: Please select a valid GIF file.');
      return;
    }
    
    currentFile = file;
    
    // Switch object URLs to avoid memory leaks
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
    objectUrl = URL.createObjectURL(file);
    gifPreview.src = objectUrl;
    
    // Fill metadata: Name & Size
    metaFilename.textContent = file.name;
    metaFilesize.textContent = formatBytes(file.size);
    
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
      cropX.value = 0;
      cropY.value = 0;
      cropW.value = originalWidth;
      cropH.value = originalHeight;
      
      // Transition states: hide landing page, show editor workspace
      uploadState.classList.remove('active');
      setTimeout(() => {
        uploadState.style.display = 'none';
        editorState.style.display = 'block';
        setTimeout(() => {
          editorState.classList.add('active');
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

  // 5. Change File / Back Button
  btnChangeFile.addEventListener('click', () => {
    // Reset file input
    fileInput.value = '';
    currentFile = null;
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    
    // Transition states: hide editor, show upload
    editorState.classList.remove('active');
    setTimeout(() => {
      editorState.style.display = 'none';
      uploadState.style.display = 'block';
      setTimeout(() => {
        uploadState.classList.add('active');
      }, 50);
    }, 300);
  });

  // 6. Lock Aspect Ratio Logic for Resize Width/Height
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

  // 7. Scale slider change label update
  scaleSlider.addEventListener('input', (e) => {
    scaleVal.textContent = `${e.target.value}%`;
  });

  // 8. Speed slider change label update
  speedSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    if (val === 1) {
      speedVal.textContent = '1.0x (Original)';
    } else {
      speedVal.textContent = `${val.toFixed(2)}x`;
    }
  });

  // 9. Crop tool toggle click placeholder
  btnCropEnable.addEventListener('click', () => {
    showToast('Visual Crop overlay activated. (Visual handles will be enabled in the next phase)');
  });

  // 10. Process & Export Button action placeholder
  btnExport.addEventListener('click', () => {
    showToast('Processing GIF with your parameters... (Processing will be enabled in the next phase)');
  });
});
