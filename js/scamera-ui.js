class SCameraUIController {
  constructor() {
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.photoPreview = null;
  }

  init() {
    this.createCameraPreview();
    this.setupEventListeners();
  }

  createCameraPreview() {
    const existingContainer = document.querySelector('.camera-container');
    if (existingContainer) {
      document.body.removeChild(existingContainer);
    }
    const cameraContainer = document.createElement('div');
    const cameraBody = document.createElement('div');
    const viewfinderContainer = document.createElement('div');
    const videoElement = document.createElement('video');
    
    cameraContainer.className = 'camera-container';
    cameraBody.className = 'camera-body';
    viewfinderContainer.className = 'viewfinder-container';
    videoElement.className = 'camera-preview';
    videoElement.autoplay = true;
    videoElement.playsInline = true;

    if(SCamera.currentConfig.facingMode === 'user') {
      videoElement.style.transform = 'scale(-1, 1)';
    }
    
    cameraContainer.appendChild(cameraBody);
    cameraBody.appendChild(viewfinderContainer);
    viewfinderContainer.appendChild(videoElement);
    
    if (this.isMobile) {
      this.createMobileControls(cameraBody);
    } else {
      this.createDesktopControls(cameraBody);
    }
    
    document.body.appendChild(cameraContainer);
    this.startCamera();
  }

  createMobileControls(container) {
    const controlsContainer = document.createElement('div');
    const primaryControls = document.createElement('div');
    const divEmpty = document.createElement('div');

    controlsContainer.className = 'mobile-controls';
    primaryControls.className = 'mobile-primary-controls';
    
    divEmpty.style.width = '40px';
    const shutterBtn = this.createShutterBtn();
    shutterBtn.className += ' mobile-shutter';
    
    const switchCamBtn = this.createSwitchCamBtn();
    switchCamBtn.className += ' mobile-switch';
    
    const flashBtn = this.createFlashBtn();
    flashBtn.className += ' mobile-flash';
    
    const zoomControl = this.createZoomControl();
    zoomControl.className += ' mobile-zoom';
    
    primaryControls.appendChild(divEmpty);
    primaryControls.appendChild(shutterBtn);
    primaryControls.appendChild(switchCamBtn);
    controlsContainer.appendChild(primaryControls);
    controlsContainer.appendChild(zoomControl);
    container.appendChild(flashBtn);
    container.appendChild(controlsContainer);
  }

  createDesktopControls(container) {
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'desktop-controls';
    
    const topBar = document.createElement('div');
    topBar.className = 'desktop-top-bar';
    
    const switchCamBtn = this.createSwitchCamBtn();
    
    const flashBtn = this.createFlashBtn();
    
    const zoomControl = this.createZoomControl();
    
    topBar.appendChild(switchCamBtn);
    topBar.appendChild(flashBtn);
    topBar.appendChild(zoomControl);
    
    const shutterBtn = this.createShutterBtn();
    shutterBtn.className += ' desktop-shutter';
    
    controlsContainer.appendChild(topBar);
    controlsContainer.appendChild(shutterBtn);
    container.appendChild(controlsContainer);
  }

  createShutterBtn() {
    const shutterBtn = document.createElement('button');
    const shutterInner = document.createElement('div');
    shutterBtn.id = 'shutter-btn';
    shutterBtn.className = 'shutter-btn';
    shutterInner.className = 'shutter-inner';
    shutterBtn.appendChild(shutterInner);
    
    shutterBtn.addEventListener('click', async () => {
      try {
        shutterBtn.disabled = true;
        const photoBlob = await SCamera.capturePhoto();
        this.showPhotoPreview(photoBlob);
      } catch (error) {
        console.error('Capture error:', error);
      } finally {
        shutterBtn.disabled = false;
      }
    });
    
    return shutterBtn;
  }

  createSwitchCamBtn() {
    const switchCamBtn = document.createElement('button');
    const switchCamInner = document.createElement('i');
    
    switchCamBtn.id = 'switch-cam-btn';
    switchCamBtn.className = 'switch-cam-btn';
    switchCamInner.className = 'fas fa-sync-alt';
    
    switchCamBtn.appendChild(switchCamInner);
    
    switchCamBtn.addEventListener('click', async () => {
      try {
        switchCamBtn.disabled = true;
        await SCamera.switchCamera();
      } catch (error) {
        console.error('Error switching camera:', error);
      } finally {
        switchCamBtn.disabled = false;
      }
    });
    
    return switchCamBtn;
  }

  createFlashBtn() {
    const flashBtn = document.createElement('button');
    const flashIcon = document.createElement('i');
    
    flashBtn.id = 'flash-btn';
    flashBtn.className = 'flash-btn';
    flashIcon.className = 'fas fa-bolt';
    
    flashBtn.appendChild(flashIcon);
    
    flashBtn.addEventListener('click', () => {
      const isFlashOn = SCamera.toggleFlash();
      flashIcon.style.color = isFlashOn ? '#FFD700' : '#FFFFFF';
    });
    
    return flashBtn;
  }

  createZoomControl() {
    const zoomControl = document.createElement('div');
    const zoomSlider = document.createElement('input');
    const zoomLevel = document.createElement('div');
    
    zoomControl.className = 'zoom-control';
    zoomSlider.id = 'zoom-slider';
    zoomSlider.type = 'range';
    zoomSlider.min = '1';
    zoomSlider.max = '3';
    zoomSlider.step = '0.1';
    zoomSlider.value = '1';
    
    zoomLevel.className = 'zoom-level';
    zoomLevel.textContent = '1.0x zoom';
    
    zoomControl.appendChild(zoomSlider);
    zoomControl.appendChild(zoomLevel);

    return zoomControl;
  }

  async startCamera() {
    try {
      const stream = await SCamera.captureController.getCameraStream();
      const videoElement = document.querySelector('.camera-preview');
      videoElement.srcObject = stream;
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();

      videoElement.style.transform = settings.facingMode === 'user' ? 'scaleX(-1)' : 'none';
    } catch (error) {
      console.error('Error starting camera:', error);
      this.showCameraError();
    }
  }

  showPhotoPreview(photoBlob) {
    // esconder visualização da câmera
    const viewfinder = document.querySelector('.viewfinder-container');
    viewfinder.style.display = 'none';
    
    // criar ou atualizar preview da foto
    if (!this.photoPreview) {
      this.photoPreview = document.createElement('div');
      this.photoPreview.className = 'photo-preview';
      
      const img = document.createElement('img');
      img.className = 'captured-photo';
      
      const actions = this.createPhotoActions();
      
      this.photoPreview.appendChild(img);
      this.photoPreview.appendChild(actions);
      document.querySelector('.camera-body').appendChild(this.photoPreview);
    }
    
    // atualizar a imagem
    const img = this.photoPreview.querySelector('.captured-photo');
    img.src = URL.createObjectURL(photoBlob);
    
    // salvar referência ao Blob para download
    img.dataset.blobUrl = img.src;
  }

  createPhotoActions() {
    const actions = document.createElement('div');
    actions.className = 'photo-actions';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'photo-action-btn close-btn';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.addEventListener('click', () => this.hidePhotoPreview());

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'photo-action-btn download-btn';
    downloadBtn.innerHTML = '<i class="fas fa-download"></i>';
    downloadBtn.addEventListener('click', () => this.downloadPhoto());
    
    actions.appendChild(downloadBtn);
    actions.appendChild(closeBtn);
    
    return actions;
  }

  hidePhotoPreview() {
    if (this.photoPreview) {
      const img = this.photoPreview.querySelector('.captured-photo');
      if (img && img.src) {
        URL.revokeObjectURL(img.src);
      }
      
      this.photoPreview.remove();
      this.photoPreview = null;
    }
    // mostrar novamente a visualização da câmera
    const viewfinder = document.querySelector('.viewfinder-container');
    viewfinder.style.display = 'block';
  }

  downloadPhoto() {
    if (!this.photoPreview) return;
    
    const img = this.photoPreview.querySelector('.captured-photo');
    if (!img || !img.src) return;
    
    const link = document.createElement('a');
    link.href = img.src;
    link.download = `photo_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  showCameraError() {
    const errorContainer = document.createElement('div');
    errorContainer.className = 'camera-error';
    errorContainer.innerHTML = `
      <i class="fas fa-camera-slash"></i>
      <p>Não foi possível acessar a câmera</p>
      <button id="retry-camera-btn">Tente novamente</button>
    `;
    
    document.querySelector('.viewfinder-container').appendChild(errorContainer);
    
    const retryBtn = document.getElementById('retry-camera-btn');
    retryBtn.addEventListener('click', () => {
      errorContainer.remove();
      this.startCamera();
    });
  }

  setupEventListeners() {
    // toque para controles móveis
    if (this.isMobile) {
      let touchStartY = 0;
      let touchStartZoom = 1;
      
      document.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
          // Pinch zoom
          touchStartZoom = SCamera.currentConfig.zoom;
        } else if (e.touches.length === 1) {
          touchStartY = e.touches[0].clientY;
        }
      }, { passive: true });
      
      document.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
          // Calcular distância entre dedos para zoom
          const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          const startDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          
          const zoom = touchStartZoom * (dist / startDist);
          SCamera.setZoom(Math.max(1, Math.min(3, zoom)));
        }
      }, { passive: true });
    }
  }
}