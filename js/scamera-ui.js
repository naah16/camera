class SCameraUIController {
  constructor() {
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.photoPreview = null;
    this.currentOrientation = this._getOrientation();
    this.setupOrientationWatcher();
  }

  
  init() {
    this.createCameraPreview();
    this.setupEventListeners();
    this.setupScreenOrientation();
  }

  _getOrientation() {
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  }

  setupOrientationWatcher() {
    if (!this.isMobile) return;

    window.addEventListener('resize', () => {
      const newOrientation = this._getOrientation();
      if (newOrientation !== this.currentOrientation) {
        this.currentOrientation = newOrientation;
        this._handleOrientationChange();
      }
    });
  }

  _handleOrientationChange() {
    const videoElement = document.querySelector('.camera-preview');
    if (!videoElement) return;

    // Ajustar transformação para câmera frontal
    if (SCamera.currentConfig.facingMode === 'user') {
      videoElement.style.transform = this.currentOrientation === 'landscape' 
        ? 'scale(-1, 1) rotate(0deg)' 
        : 'scale(-1, 1)';
    }

    // Ajustar controles específicos para orientação
    const zoomControl = document.querySelector('.zoom-control');
    if (zoomControl) {
      if (this.currentOrientation === 'landscape') {
        zoomControl.style.right = '20px';
        zoomControl.style.bottom = '50%';
        zoomControl.style.transform = 'translateY(50%)';
      } else {
        zoomControl.style.right = 'unset';
        zoomControl.style.bottom = '80px';
        zoomControl.style.transform = 'none';
      }
    }
  }

  setupScreenOrientation() {
    if (!screen.orientation) return;

    screen.orientation.addEventListener('change', () => {
      const angle = screen.orientation.angle;
      console.log('Ângulo de rotação:', angle);
      
      // Ajustar elementos conforme necessário
      const video = document.querySelector('.camera-preview');
      if (video) {
        video.style.transform = `rotate(${angle}deg)`;
      }
    });
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
    cameraContainer.classList.add(this.currentOrientation);
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
    const divEmpty = document.createElement('div');
    const actionsContainer = document.createElement('div');

    controlsContainer.className = `mobile-controls ${this.currentOrientation}`;
    actionsContainer.className = 'mobile-actions-container';
    divEmpty.style.width = '50px';

    const shutterBtn = this.createShutterBtn();
    shutterBtn.className += ' mobile-shutter';
    
    const switchCamBtn = await this.createSwitchCamControl();
    switchCamBtn.className += ' mobile-switch';
    
    const flashBtn = this.createFlashBtn();
    flashBtn.className += ' mobile-flash';
    
    const zoomControl = this.createZoomControl();
    zoomControl.className += ' mobile-zoom';
    
    actionsContainer.appendChild(divEmpty);
    actionsContainer.appendChild(shutterBtn);
    actionsContainer.appendChild(switchCamBtn);
    controlsContainer.appendChild(zoomControl);
    controlsContainer.appendChild(actionsContainer);
    container.appendChild(flashBtn);
    container.appendChild(controlsContainer);
  }

  async createDesktopControls(container) {
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'desktop-controls';
    
    const topBar = document.createElement('div');
    topBar.className = 'desktop-top-bar';
    
    const switchCamBtn = await this.createSwitchCamControl();

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

  async createSwitchCamControl() {
    if(this.isMobile) {
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
    const flashIcon = document.createElement('i');
    
    flashBtn.id = 'flash-btn';
    flashBtn.className = 'flash-btn';
    flashIcon.className = 'fas fa-bolt';
    
    flashBtn.appendChild(flashIcon);
    
    flashBtn.addEventListener('click', () => {
      const isFlashEnabled = SCamera.currentConfig.flash;
      flashIcon.style.color = isFlashEnabled === true ? '' : '#FFD700';
    });
    
    return flashBtn;
  }

  createZoomControl() {
    const zoomControl = document.createElement('div');
    const zoomSlider = document.createElement('input');
    const zoomLevel = document.createElement('div');
    
    zoomControl.className = 'zoom-control';
    zoomSlider.style.display = 'none';
    zoomSlider.id = 'zoom-slider';
    zoomSlider.type = 'range';
    zoomSlider.min = '1';
    zoomSlider.max = '3';
    zoomSlider.step = '0.1';
    zoomSlider.value = '1';
    
    zoomLevel.className = 'zoom-level';
    zoomLevel.textContent = 'x1.0';

    //adicionar toggle para abrir o zoomSlider
    zoomLevel.addEventListener('click', () => {
      if (zoomSlider.style.display === 'none') {
        zoomSlider.style.display = 'block';
      } else {
        zoomSlider.style.display = 'none';
      }
    });

    zoomControl.appendChild(zoomSlider);
    zoomControl.appendChild(zoomLevel);

    return zoomControl;
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
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.addEventListener('click', () => this.hidePhotoPreview());

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'photo-action-btn-desktop download-btn';
    downloadBtn.innerHTML = '<i class="fas fa-download"></i>';
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
      <i class="fas fa-camera-slash"></i>
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