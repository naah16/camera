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

    if (SCamera.currentConfig.facingMode == "user") {
      videoElement.style.transform = 'scaleX(-1)';
    } else {
      videoElement.style.transform = 'scaleX(1)';
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
    // SCamera.startCamera();
  }

  async createMobileControls(container) {
    const controlsContainer = document.createElement('div');
    const actionsContainer = document.createElement('div');

    controlsContainer.className = 'mobile-controls';
    actionsContainer.className = 'mobile-actions-container';

    const shutterBtn = this.createShutterBtn();
    
    const switchCamBtn = await this.createSwitchCamControl();
    switchCamBtn.className += ' mobile-switch';
    
    const flashBtn = this.createFlashBtn();
    flashBtn.className += ' mobile-flash';
    
    const zoomControl = this.createZoomSliderUI();
    zoomControl.className += ' mobile-zoom';
    
    actionsContainer.appendChild(flashBtn);
    actionsContainer.appendChild(shutterBtn);
    actionsContainer.appendChild(switchCamBtn);
    controlsContainer.appendChild(zoomControl);
    controlsContainer.appendChild(actionsContainer);
    container.appendChild(controlsContainer);
  }

  async createDesktopControls(container) {
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'desktop-controls';
    
    const topBar = document.createElement('div');
    topBar.className = 'desktop-top-bar';
    
    const switchCamBtn = await this.createSwitchCamControl();
    
    topBar.appendChild(switchCamBtn);
    
    const shutterBtn = this.createShutterBtn();
    
    controlsContainer.appendChild(topBar);
    controlsContainer.appendChild(shutterBtn);
    container.appendChild(controlsContainer);
  }

  createShutterBtn() {
    const shutterBtn = document.createElement('button');
    shutterBtn.id = 'shutter-btn';
    shutterBtn.className = 'shutter-btn';
    
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

  async createSwitchCamControl() {
    if(this.isMobile) {
      const switchCamBtn = document.createElement('button');
      
      switchCamBtn.id = 'switch-cam-btn';
      switchCamBtn.className = 'switch-cam-btn';
      switchCamBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="icons-actions-container"><title>cached</title>
          <path d="M19,8L15,12H18A6,6 0 0,1 12,18C11,18 10.03,17.75 9.2,17.3L7.74,18.76C8.97,19.54 10.43,20 12,20A8,8 0 0,0 20,12H23M6,12A6,6 0 0,1 12,6C13,6 13.97,6.25 14.8,6.7L16.26,5.24C15.03,4.46 13.57,4 12,4A8,8 0 0,0 4,12H1L5,16L9,12" />
        </svg>
      `;
      
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
    } else {
      const selectCam = document.createElement('select');
      selectCam.id = 'camera-select';
      selectCam.className = 'camera-select';

      // Popular opções
      const cameras = await SCamera.listCameras();
      
      cameras.forEach(camera => {
        const option = document.createElement('option');
        option.value = camera.deviceId;
        option.text = camera.label;
        if (camera.deviceId === SCamera.currentConfig.deviceId) {
          option.selected = true;
        }
        selectCam.appendChild(option);
      });

      selectCam.addEventListener('change', async (event) => {
        const selectedDeviceId = event.target.value;
        try {
          selectCam.disabled = true;
          SCamera.currentConfig.deviceId = selectedDeviceId;
          await SCamera.switchCamera();
        } catch (error) {
          console.error('Error switching camera:', error);
        } finally {
          selectCam.disabled = false;
        }
      });

      return selectCam;
    }
  }

  createFlashBtn() {
    const flashBtn = document.createElement('button');
    const svgEnabled = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="icons-actions-container"><title>flash</title>
        <path d="M7,2V13H10V22L17,10H13L17,2H7Z" />
      </svg>
    `;
    const svgDisabled = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="icons-actions-container"><title>flash-off</title>
        <path d="M17,10H13L17,2H7V4.18L15.46,12.64M3.27,3L2,4.27L7,9.27V13H10V22L13.58,15.86L17.73,20L19,18.73L3.27,3Z" />
      </svg>
    `;
    
    flashBtn.id = 'flash-btn';
    flashBtn.className = 'flash-btn';
    flashBtn.innerHTML = svgDisabled;

    flashBtn.addEventListener('click', () => {
      const isFlashOn = SCamera.currentConfig.flash;
      SCamera.currentConfig.flash = isFlashOn;
      flashBtn.innerHTML = isFlashOn ? svgDisabled : svgEnabled;
    });
    
    return flashBtn;
  }

  // createZoomControl() {
  //   const zoomControl = document.createElement('div');
  //   const zoomSlider = document.createElement('input');
  //   const zoomLevel = document.createElement('div');
    
  //   zoomControl.className = 'zoom-control';
  //   zoomSlider.style.display = 'none';
  //   zoomSlider.id = 'zoom-slider';
  //   zoomSlider.type = 'range';
  //   zoomSlider.min = '1';
  //   zoomSlider.max = '3';
  //   zoomSlider.step = '0.1';
  //   zoomSlider.value = '1';
    
  //   zoomLevel.className = 'zoom-level';
  //   zoomLevel.textContent = 'x1.0';

  //   //adicionar toggle para abrir o zoomSlider
  //   zoomLevel.addEventListener('click', () => {
  //     if (zoomSlider.style.display === 'none') {
  //       zoomSlider.style.display = 'block';
  //     } else {
  //       zoomSlider.style.display = 'none';
  //     }
  //   });

  //   zoomControl.appendChild(zoomSlider);
  //   zoomControl.appendChild(zoomLevel);

  //   if (SCamera.currentConfig.facingMode === 'user') {
  //     zoomControl.style.display = 'none';
  //   } else {
  //     zoomControl.style.display = 'flex';
  //   }

  //   return zoomControl;
  // }

  createZoomSliderUI() {
    const zoomContainer = document.createElement('div');
    zoomContainer.className = 'zoom-slider-container';
    
    // Só mostra se não for câmera frontal
    if (SCamera.currentConfig.facingMode === 'user') {
      zoomContainer.style.display = 'none';
    }

    const zoomValueLabel = document.createElement('div');
    zoomValueLabel.className = 'zoom-value-label';
    zoomValueLabel.textContent = `x${SCamera.currentConfig.zoom.toFixed(1)}`;

    const sliderTrack = document.createElement('div');
    sliderTrack.className = 'zoom-slider-track';

    const indicator = document.createElement('div');
    indicator.className = 'zoom-indicator';

    sliderTrack.appendChild(indicator);
    zoomContainer.appendChild(zoomValueLabel);
    zoomContainer.appendChild(sliderTrack);

    // Configuração inicial
    let zoomMin = 1.0;
    let zoomMax = 3.0;
    
    // Atualizar com capacidades reais
    if (SCamera.captureController.capabilities?.zoom) {
      zoomMin = SCamera.captureController.capabilities.zoom.min;
      zoomMax = SCamera.captureController.capabilities.zoom.max;
    }

    const updateUI = (zoom) => {
      const normalized = Math.max(0, Math.min(1, (zoom - zoomMin) / (zoomMax - zoomMin)));
      indicator.style.left = `${normalized * 100}%`;
      zoomValueLabel.textContent = `x${zoom.toFixed(1)}`;
    };

    // Handler de toque
    const handleTouch = (e) => {
      e.preventDefault();
      const rect = sliderTrack.getBoundingClientRect();
      const touchX = e.touches[0].clientX;
      const percent = Math.max(0, Math.min(1, (touchX - rect.left) / rect.width));
      const zoomValue = zoomMin + percent * (zoomMax - zoomMin);
      
      SCamera.setZoom(zoomValue)
        .then(() => updateUI(zoomValue))
        .catch(console.error);
    };

    sliderTrack.addEventListener('touchstart', handleTouch, { passive: false });
    sliderTrack.addEventListener('touchmove', handleTouch, { passive: false });

    // Atualizar quando o zoom mudar externamente
    SCamera.onZoomChange = (zoom) => {
      updateUI(zoom);
    };

    // Posição inicial
    updateUI(SCamera.currentConfig.zoom);

    return zoomContainer;
  }

  showPhotoPreview(photoBlob) {
    // esconder visualização da câmera
    const viewfinder = document.querySelector('.viewfinder-container');
    const mobileControls = document.querySelector('.mobile-controls');
    
    viewfinder.style.display = 'none';
    if (mobileControls) {
      mobileControls.style.display = 'none';
    }
    
    // criar ou atualizar preview da foto
    if (!this.photoPreview) {
      this.photoPreview = document.createElement('div');
      this.photoPreview.className = 'photo-preview';
      
      const img = document.createElement('img');
      img.className = 'captured-photo';
      
      const actions = this.isMobile ? this.createPhotoActionsMobile() : this.createPhotoActionsDesktop();
      
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

  createPhotoActionsMobile() {
    const actions = document.createElement('div');
    actions.className = 'photo-actions';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'photo-action-btn close-btn';
    closeBtn.innerHTML = 'Repetir';
    closeBtn.addEventListener('click', () => this.hidePhotoPreview());

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'photo-action-btn download-btn';
    downloadBtn.innerHTML = 'Usar foto';
    downloadBtn.addEventListener('click', () => this.downloadPhoto());
    
    actions.appendChild(closeBtn);
    actions.appendChild(downloadBtn);
    
    return actions;
  }

  createPhotoActionsDesktop() {
    const actions = document.createElement('div');
    actions.className = 'photo-actions-desktop';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'photo-action-btn-desktop close-btn';
    closeBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="icons-actions-container"><title>close</title>
        <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
      </svg>
    `;
    closeBtn.addEventListener('click', () => this.hidePhotoPreview());

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'photo-action-btn-desktop download-btn';
    downloadBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="icons-actions-container"><title>download</title>
        <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" />
      </svg>
    `;
    downloadBtn.addEventListener('click', () => this.downloadPhoto());
    
    actions.appendChild(closeBtn);
    actions.appendChild(downloadBtn);
    
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
    const mobileControls = document.querySelector('.mobile-controls');

    viewfinder.style.display = 'block';
    if (mobileControls) {
      mobileControls.style.display = 'flex';
    }
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
      <p>Não foi possível acessar a câmera</p>
      <button id="retry-camera-btn">Tente novamente</button>
    `;
    
    document.querySelector('.viewfinder-container').appendChild(errorContainer);
    
    const retryBtn = document.getElementById('retry-camera-btn');
    retryBtn.addEventListener('click', () => {
      errorContainer.remove();
      // SCamera.startCamera();
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