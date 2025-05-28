export default class SCameraUIController {
  constructor() {
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.photoPreview = null;
    this.orientation = null;
    this.rotation = 0;
    this.zoomIndicator = null;
    this.zoomTrack = null;
    this._autoRotate = this.isMobile && screen.availHeight < screen.availWidth;
  }

  init() {
    this.createCameraPreview();
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
    videoElement.muted = true;
    videoElement.poster = "/resources/img/black-pixel.png";

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
  }

  async createMobileControls(container) {
    const controlsContainer = document.createElement('div');
    const actionsContainer = document.createElement('div');
    const flashContainer = document.createElement('div');


    controlsContainer.className = 'mobile-controls';
    actionsContainer.className = 'mobile-actions-container';
    flashContainer.className = 'mobile-flash-container';

    const shutterBtn = this.createShutterBtn();
    
    const switchCamBtn = await this.createSwitchCamControl();
    switchCamBtn.className += ' mobile-switch';

    const leaveCameraBtn = this.createLeaveCameraBtn();
    
    actionsContainer.appendChild(flashContainer);
    actionsContainer.appendChild(shutterBtn);
    actionsContainer.appendChild(switchCamBtn);
    controlsContainer.appendChild(actionsContainer);
    container.appendChild(leaveCameraBtn);
    container.appendChild(controlsContainer);
  }

  async createDesktopControls(container) {
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'desktop-controls';
    
    const topBar = document.createElement('div');
    topBar.className = 'desktop-top-bar';
    
    const switchCamBtn = await this.createSwitchCamControl();

    if (switchCamBtn) {
      topBar.appendChild(switchCamBtn);
    }
    
    const shutterBtn = this.createShutterBtn();
    const leaveCameraBtn = this.createLeaveCameraBtn();
    
    controlsContainer.appendChild(topBar);
    controlsContainer.appendChild(shutterBtn);
    container.appendChild(leaveCameraBtn);
    container.appendChild(controlsContainer);
  }

  createLeaveCameraBtn() {
    const leaveCameraBtn = document.createElement('button');
    leaveCameraBtn.className = 'leave-camera-btn';
    leaveCameraBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="icons-actions-container"><title>close</title>
        <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
      </svg>
    `;
    
    leaveCameraBtn.addEventListener('click', () => {
      SCamera.closeCamera();
    });
    
    return leaveCameraBtn;
  }

  createShutterBtn() {
    const shutterBtn = document.createElement('button');
    shutterBtn.id = 'shutter-btn';
    shutterBtn.className = 'shutter-btn';
    
    shutterBtn.addEventListener('click', async () => {
      try {
        shutterBtn.disabled = true;
        shutterBtn.classList.add('animate');

        setTimeout(() => {
          shutterBtn.classList.remove('animate');
        }, 200);

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
    if (this.isMobile) {
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
          switchCamBtn.classList.add('animate');
          setTimeout(() => {
            switchCamBtn.classList.remove('animate');
          }, 500);

          await SCamera.switchCamera();
        } catch (error) {
          console.error('Error switching camera:', error);
        } finally {
          switchCamBtn.disabled = false;
        }
      });
      
      return switchCamBtn;
    } else {
      const cameras = await SCamera.listCameras();
      
      if(cameras.length < 2) {
        return;
      }

      const selectCam = document.createElement('select');
      selectCam.id = 'camera-select';
      selectCam.className = 'camera-select';

      // Popular opções
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
    let container;

    if (this.isMobile) {
      container = document.querySelector(".mobile-flash-container");
    }

    const flashCap = SCamera.captureController.capabilities?.torch;
    if (!flashCap) {
      console.warn('Flash não suportado.');
      return;
    }

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
    flashBtn.className = 'flash-btn mobile-flash';
    flashBtn.innerHTML = svgDisabled;

    flashBtn.addEventListener('click', async () => {
      if (!SCamera.captureController.capabilities?.torch) return;

      const newState = !SCamera.currentConfig.flash;
      const success = await SCamera.toggleFlash();

      if (success) {
        SCamera.currentConfig.flash = newState;
        flashBtn.innerHTML = newState ? svgEnabled : svgDisabled;
      }
    });
    
    if (container) {
      container.prepend(flashBtn);
    }
  }

  async createZoomControl() {
    let container;

    if (this.isMobile) {
      container = document.querySelector(".mobile-controls");
    }

    const zoomControl = document.createElement('div');
    zoomControl.className = 'zoom-slider-container';

    const zoomOptionsContainer = document.createElement('div');
    zoomOptionsContainer.className = 'zoom-options-container';

    const zoomOptions = document.createElement('div');
    zoomOptions.className = 'zoom-options';

    const customZoomContainer = document.createElement('div');
    customZoomContainer.className = 'custom-zoom-container';

    const containerSliderTrack = document.createElement('div');
    containerSliderTrack.className = 'zoom-slider-track-container';
    containerSliderTrack.style.display = 'none';

    const sliderTrack = document.createElement('div');
    sliderTrack.className = 'zoom-slider-track';

    const visualIndicator = document.createElement('div');
    visualIndicator.className = 'zoom-indicator';

    const touchArea = document.createElement('div');
    touchArea.className = 'zoom-touch-area';

    sliderTrack.appendChild(visualIndicator);
    sliderTrack.appendChild(touchArea);
    containerSliderTrack.appendChild(sliderTrack);

    zoomOptions.appendChild(zoomOptionsContainer);
    zoomOptions.appendChild(customZoomContainer);
    zoomControl.appendChild(zoomOptions);
    zoomControl.appendChild(containerSliderTrack);

    this.zoomIndicator = visualIndicator;
    this.zoomTrack = sliderTrack;
    
    const zoomCap = SCamera.captureController.capabilities?.zoom;
    // const isVirtualZoom = SCamera.captureController.isAndroidWebView;
    const isFrontal = SCamera.currentConfig.facingMode === 'user';

    if (isFrontal) {
      return;
    }

    if (!zoomCap) {
      console.warn('Zoom não suportado.');
      return;
    }

    // if (!zoomCap && !isVirtualZoom) {
    //   console.warn('Zoom não suportado.');
    //   return;
    // }

    // let min, max;
    // if (zoomCap) {
    //   min = zoomCap.min;
    //   max = zoomCap.max;
    // } else {
    //   // WebView Android - zoom virtual
    //   min = 1;
    //   max = 4;
    // }

    const { min, max } = zoomCap;
    const zoomSteps = [1, 2, 3, max];
    let currentZoom = 1;
    let lastClickedLabel = null;
    let sliderLabel = null;
    let isExpanded = false;
    const predefinedLabels = {};
    let isDragging = false;
    let scrollTimeout;
    const isVertical = containerSliderTrack.classList.contains('landscape');

    const formatZoom = (value) => `x${value % 1 === 0 ? value : value.toFixed(1).replace('.0', '')}`;

    const createZoomLabel = (zoomValue) => {
      const label = document.createElement('div');
      label.className = 'zoom-value-label';
      label.textContent = formatZoom(zoomValue);
      label.dataset.zoom = zoomValue;

      label.addEventListener('click', async (e) => {
        e.stopPropagation();
        const clickedZoom = parseFloat(label.dataset.zoom);

        if (lastClickedLabel === label && isExpanded) {
          if (this._autoRotate) {
            containerSliderTrack.style.display = 'none';
            zoomOptions.style.marginBottom = '0px';
            zoomOptions.style.right = '120px';
          } else {
            containerSliderTrack.style.display = 'flex';
            zoomOptions.style.marginBottom = '15px';
          }
          return;
        }

        isExpanded = true;
        await SCamera.captureController.setZoom(clickedZoom);
        currentZoom = clickedZoom;
        lastClickedLabel = label;

        const percent = (clickedZoom - min) / (max - min);
        if (isVertical) {
          visualIndicator.style.bottom = `${percent * 100}%`;
        } else {
          visualIndicator.style.left = `${percent * 100}%`;
        }

        containerSliderTrack.style.display = 'none';
        //teste landscape aqui
        if (this._autoRotate) {
          zoomOptions.classList.add('landscape');
          zoomOptions.style.marginBottom = '0px';
        } else {
          zoomOptions.classList.remove('landscape');
          zoomOptions.style.marginBottom = '160px';
        }

        document.querySelectorAll('.zoom-value-label').forEach(el => el.classList.remove('active'));
        label.classList.add('active');

        if (e.target.parentElement != customZoomContainer) {
          customZoomContainer.firstElementChild?.remove();
        }
        sliderLabel = null; // <== CORREÇÃO
      });

      return label;
    };

    zoomSteps.forEach((zoomVal) => {
      const label = createZoomLabel(zoomVal);
      predefinedLabels[zoomVal] = label;
      zoomOptionsContainer.appendChild(label);
    });

    predefinedLabels[1].classList.add('active');
    lastClickedLabel = predefinedLabels[1];

    const startScroll = () => {
      isDragging = true;
      // zoomOptionsContainer.style.display = 'none';
      customZoomContainer.innerHTML = '';
      if (sliderLabel) customZoomContainer.appendChild(sliderLabel);
    };

    const endScroll = () => {
      isDragging = false;

      const matched = zoomSteps.find(v => Math.abs(v - currentZoom) < 0.1);

      zoomOptionsContainer.innerHTML = '';
      zoomSteps.forEach(val => {
        const label = predefinedLabels[val];
        zoomOptionsContainer.appendChild(label);
      });

      if (matched !== undefined) {
        customZoomContainer.innerHTML = '';
        document.querySelectorAll('.zoom-value-label').forEach(el => el.classList.remove('active'));
        predefinedLabels[matched].classList.add('active');
        lastClickedLabel = predefinedLabels[matched];
      } else {
        customZoomContainer.innerHTML = '';
        if (sliderLabel) {
          customZoomContainer.appendChild(sliderLabel);
          sliderLabel.classList.add('active');
        }
      }

      zoomOptionsContainer.style.display = 'flex';
    };

    const updateZoomFromPercent = async (percent) => {
      const newZoom = min + (max - min) * percent;
      const clampedZoom = Math.round(newZoom * 10) / 10;

      await SCamera.captureController.setZoom(clampedZoom);
      currentZoom = clampedZoom;

      if (isVertical) {
        visualIndicator.style.bottom = `${percent * 100}%`;
      } else {
        visualIndicator.style.left = `${percent * 100}%`;
      }

      if (sliderLabel) sliderLabel.remove();
      sliderLabel = createZoomLabel(clampedZoom);

      customZoomContainer.innerHTML = '';
      customZoomContainer.appendChild(sliderLabel);

      document.querySelectorAll('.zoom-value-label').forEach(el => el.classList.remove('active'));
      sliderLabel.classList.add('active');
      lastClickedLabel = sliderLabel;

      startScroll();

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        endScroll();
      }, 500);
    };

    const handlePositionUpdate = (clientX) => {
      const rect = sliderTrack.getBoundingClientRect();
      const percent = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      updateZoomFromPercent(percent);
    };

    // Mouse events
    touchArea.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      isDragging = true;
      handlePositionUpdate(e.clientX);
    });

    window.addEventListener('mousemove', (e) => {
      if (isDragging) handlePositionUpdate(e.clientX);
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) endScroll();
    });

    // Touch events
    touchArea.addEventListener('touchstart', (e) => {
      isDragging = true;
      handlePositionUpdate(e.touches[0].clientX);
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (isDragging) handlePositionUpdate(e.touches[0].clientX);
    }, { passive: true });

    window.addEventListener('touchend', () => {
      if (isDragging) endScroll();
    });

    document.addEventListener('click', (e) => {
      if (!zoomControl.contains(e.target)) {
        containerSliderTrack.style.display = 'none';
        //teste landscape aqui
        if (this._autoRotate) {
          zoomOptions.classList.add('landscape');
          zoomOptions.style.marginBottom = '0px';
        } else {
          zoomOptions.classList.remove('landscape');
          zoomOptions.style.marginBottom = '160px';
        }

        zoomOptionsContainer.innerHTML = '';
        zoomSteps.forEach(val => {
          const label = predefinedLabels[val];
          zoomOptionsContainer.appendChild(label);
        });

        customZoomContainer.innerHTML = '';
        if (sliderLabel) {
          customZoomContainer.appendChild(sliderLabel);
        }
        isExpanded = false;
      }
    });

    if (container) {
      container.appendChild(zoomControl);
    }
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
    closeBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="icons-photo-actions"><title>close</title>
      <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
    </svg>
    <div>Cancelar</div>`;
    closeBtn.addEventListener('click', () => this.hidePhotoPreview());

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'photo-action-btn download-btn';
    downloadBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="icons-photo-actions"><title>send</title>
      <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z" />
    </svg>
    <div>Confirmar</div>`;
    downloadBtn.addEventListener('click', () => SCamera.sendBlob());
    
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
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="icons-photo-actions close-btn"><title>close</title>
        <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
      </svg>
    `;
    closeBtn.addEventListener('click', () => this.hidePhotoPreview());

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'photo-action-btn-desktop download-btn';
    downloadBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="icons-photo-actions download-btn"><title>send</title>
        <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z" />
      </svg>
    `;
    downloadBtn.addEventListener('click', () => SCamera.sendBlob());
    
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

  showCameraError(message = 'Não foi possível acessar a câmera') {
    const viewfinder = document.querySelector('.viewfinder-container');
    if (!viewfinder) return;

    const existingError = viewfinder.querySelector('.camera-error');
    if (existingError) existingError.remove();

    const errorContainer = document.createElement('div');
    errorContainer.className = 'camera-error';
    errorContainer.innerHTML = `
      <p>${message}</p>
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button id="retry-camera-btn">Tente novamente</button>
        <button id="exit-camera-btn">Sair</button>
      </div>
    `;
    
    viewfinder.appendChild(errorContainer);
    
    document.getElementById('retry-camera-btn').addEventListener('click', async () => {
      errorContainer.remove();
      try {
        await SCamera.captureController.getCameraStream();
      } catch (error) {
        this.showCameraError(error.message);
      }
    });

    document.getElementById('exit-camera-btn').addEventListener('click', () => {
      errorContainer.remove();
      SCamera.closeCamera();
    });
  }

  async setupOrientationListener() {
    this._eventListener = this.handleMotionChange.bind(this);
    if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const response = await DeviceOrientationEvent.requestPermission();
        if (response === 'granted') {
          window.addEventListener("devicemotion", this._eventListener);
        }
      } catch (error) {
        console.error(error);
      }
    } else {
      window.addEventListener("devicemotion", this._eventListener);
    }
  }
  
  removeOrientationListener() {
    window.removeEventListener("devicemotion", this._eventListener);
  }

  handleMotionChange(e) {
    const x = e.accelerationIncludingGravity.x;
    let rotation = 0;
    let orientation;
    
    this._autoRotate = this.isMobile && screen.availHeight < screen.availWidth;
    if (x > 7) {
      if (navigator.userAgent.indexOf('Android') >= 0){
        rotation = 90; // Landscape Left
      } else {
        rotation = -90; // Landscape Right
      }
      orientation = 'landscape-left';
    } else if (x < -7) {
      if (navigator.userAgent.indexOf('Android') >= 0){
        rotation = -90;  // Landscape Right
      } else {
        rotation = 90; // Landscape Left
      }
      orientation = 'landscape-right';
    } else {
      rotation = 0;   // Portrait
      orientation = 'portrait';
    }

    this.orientation = orientation;
    this.rotation = rotation;
    this.rotateIcons(rotation);
  }

  rotateIcons(degrees) {
    const icons = document.querySelectorAll('.mobile-switch, .mobile-flash, .zoom-value-label, .leave-camera-btn');

    const elements = [
      document.querySelector('.mobile-controls'),
      document.querySelector('.mobile-actions-container'),
      document.querySelector('.leave-camera-btn'),
      document.querySelector('.zoom-options'),
      document.querySelector('.zoom-options-container'),
      document.querySelector('.zoom-slider-container'),
      document.querySelector('.zoom-slider-track-container'),
      document.querySelector('.zoom-slider-track'),
      document.querySelector('.zoom-indicator'),
      document.querySelector('.zoom-touch-area')
    ];

    if (this._autoRotate === true) {
      elements.forEach(el => {
        if (el) el.classList.add('landscape');
      });

      icons.forEach(icon => {
        icon.style.transition = 'none';
        icon.style.transform = `rotate(0deg)`;
      });
    } else {
      elements.forEach(el => {
        if (el) el.classList.remove('landscape');
      });

      icons.forEach(icon => {
        icon.style.transition = 'transform 0.3s ease';
        icon.style.transform = `rotate(${degrees}deg)`;
      });
    }
  }
}