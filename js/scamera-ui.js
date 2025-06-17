export default class SCameraUIController {
  constructor() {
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.photoPreview = null;
    this.orientation = null;
    this.rotation = 0;
    this.zoomIndicator = null;
    this.zoomTrack = null;
    this._autoRotate = this.isMobile && window.innerHeight < window.innerWidth;
    this.photos = [];
    this.currentPhotoIndex = -1;
    this.previousPhotoBtn = null;
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
    this.createLoadingScreen();
    if (this.previousPhotoBtn) {
      this.previousPhotoBtn.style.display = this.photos.length > 0 ? 'flex' : 'none';
    }
  }

  createLoadingScreen() {
    const cameraBody = document.querySelector('.camera-container');
    const loadingContainer = document.createElement('div');

    loadingContainer.className = 'loading-container';
    loadingContainer.innerHTML = `
      <div class="loading-spinner rotation">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>loading</title><path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z" /></svg>
      </div>
      <p>Aguarde, carregando câmera...</p>
    `;
    
    cameraBody.appendChild(loadingContainer);
    
    return loadingContainer;
  }

  hideLoadingScreen() {
    const loadingContainer = document.querySelector('.loading-container');

    if (loadingContainer) {
      loadingContainer.remove();
    }
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
    const previousPhotoBtn = this.createPreviousPhotoContainer();
    
    actionsContainer.appendChild(flashContainer);
    actionsContainer.appendChild(shutterBtn);
    actionsContainer.appendChild(switchCamBtn);
    controlsContainer.appendChild(actionsContainer);
    container.appendChild(previousPhotoBtn);
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
    const previousPhotoBtn = this.createPreviousPhotoContainer();
    previousPhotoBtn.style.bottom = '120px';
    
    controlsContainer.appendChild(topBar);
    controlsContainer.appendChild(shutterBtn);
    container.appendChild(leaveCameraBtn);
    container.appendChild(previousPhotoBtn);
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
      //verificar se tem fotos antes de sair
      if (this.photos.length > 0) {
        if (!this.dialogConfirmLeave) {
          this.dialogConfirmLeave = document.createElement('div');
          this.dialogConfirmLeave.className = 'dialog-confirm';
          this.dialogConfirmLeave.innerHTML = `
            <p style="margin: 0;">Você tem certeza que deseja sair? As fotos tiradas serão descartadas.</p>
            <div class="dialog-buttons">
              <button class="cancel-discard" id="cancel-leave-camera">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="icons-actions-container"><title>close</title>
                  <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </svg>
                <div>Cancelar</div>
              </button>
              <button class="confirm-discard" id="confirm-leave-camera">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="icons-photo-actions"><title>delete</title>
                  <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                </svg>
                <div>Descartar</div>
              </button>
            </div>
          `;
        }

        const backdrop = document.createElement('div');
        backdrop.className = 'dialog-backdrop';
        document.body.appendChild(backdrop);
        document.body.appendChild(this.dialogConfirmLeave);

        const removeDialog = () => {
          this.dialogConfirmLeave.remove();
          backdrop.remove();
        };

        document.querySelector('#confirm-leave-camera').addEventListener('click', () => {
          this.photos.forEach(photo => {
            if (photo instanceof Blob) {
              URL.revokeObjectURL(photo);
            }
          });
          
          this.photos = [];
          this.currentPhotoIndex = -1;
          removeDialog();
          SCamera.closeCamera();
        });

        document.querySelector('#cancel-leave-camera').addEventListener('click', () => {
          removeDialog();
        });
      } else {
        SCamera.closeCamera();
      }
    });
    
    return leaveCameraBtn;
  }

  createShutterBtn() {
    const shutterBtn = document.createElement('button');
    shutterBtn.id = 'shutter-btn';
    shutterBtn.className = 'shutter-btn';
    
    shutterBtn.addEventListener('click', async () => {
      try {
        if(SCamera.captureController.isLoadingCamera){
          return;
        }

        shutterBtn.disabled = true;
        shutterBtn.classList.add('animate');

        setTimeout(() => {
          shutterBtn.classList.remove('animate');
        }, 200);

        const photoBlob = await SCamera.capturePhoto();
        await SCamera.captureController.resetZoom();
        SCamera.captureController.resetFlash();
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
      if (SCamera.captureController.isLoadingCamera) {
        return;
      }
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

    const sliderLabel = document.createElement('div');
    sliderLabel.className = 'zoom-value-label';

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

    const openZoomSlider = document.createElement('button');
    openZoomSlider.className = 'open-zoom-slider';
    openZoomSlider.innerHTML = `
     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="icons-actions-container"><title>tune-variant</title>
      <path d="M8 13C6.14 13 4.59 14.28 4.14 16H2V18H4.14C4.59 19.72 6.14 21 8 21S11.41 19.72 11.86 18H22V16H11.86C11.41 14.28 9.86 13 8 13M8 19C6.9 19 6 18.1 6 17C6 15.9 6.9 15 8 15S10 15.9 10 17C10 18.1 9.1 19 8 19M19.86 6C19.41 4.28 17.86 3 16 3S12.59 4.28 12.14 6H2V8H12.14C12.59 9.72 14.14 11 16 11S19.41 9.72 19.86 8H22V6H19.86M16 9C14.9 9 14 8.1 14 7C14 5.9 14.9 5 16 5S18 5.9 18 7C18 8.1 17.1 9 16 9Z" />
    </svg>`;

    sliderTrack.appendChild(visualIndicator);
    sliderTrack.appendChild(touchArea);
    containerSliderTrack.appendChild(sliderTrack);

    zoomOptions.appendChild(openZoomSlider);
    zoomOptions.appendChild(zoomOptionsContainer);
    zoomOptions.appendChild(customZoomContainer);
    zoomControl.appendChild(zoomOptions);
    zoomControl.appendChild(containerSliderTrack);

    this.zoomIndicator = visualIndicator;
    this.zoomTrack = sliderTrack;
    
    const zoomCap = SCamera.captureController.capabilities?.zoom;
    const isVirtualZoom = SCamera.captureController.isAndroidWebView;
    const isFrontal = SCamera.currentConfig.facingMode === 'user';

    if (isFrontal) {
      return;
    }

    if (!zoomCap && !isVirtualZoom) {
      console.warn('Zoom não suportado.');
      return;
    }

    let min, max;
    if (zoomCap) {
      min = zoomCap.min;
      max = zoomCap.max;
    } else {
    // WebView Android - zoom virtual
      min = 1;
      max = 4;
    }

    let zoomSteps = [1, 2, 3, max];
    let currentZoom = 1;
    let lastClickedLabel = null;
    let isExpanded = false;
    const predefinedLabels = {};
    let isDragging = false;
    let scrollTimeout;

    const formatZoom = (value) => `x${value % 1 === 0 ? value : value.toFixed(1).replace('.0', '')}`;

    const createZoomLabel = (zoomValue) => {
      const label = document.createElement('div');
      label.className = 'zoom-value-label';
      label.textContent = formatZoom(zoomValue);
      label.dataset.zoom = zoomValue;

      label.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (SCamera.captureController.isLoadingCamera) {
          return;
        }
        const clickedZoom = parseFloat(label.dataset.zoom);

        if (lastClickedLabel === label && isExpanded) {
          containerSliderTrack.style.display = 'flex';
          openZoomSlider.querySelector('.icons-actions-container').classList.add('active');
          if (this._autoRotate) {
            zoomOptions.style.marginBottom = '0px';
            zoomOptions.style.marginRight = '10px';
          } else {
            zoomOptions.style.marginBottom = '10px';
            zoomOptions.style.marginRight = '0px';
          }
          return;
        }

        isExpanded = true;
        await SCamera.captureController.setZoom(clickedZoom);
        currentZoom = clickedZoom;
        lastClickedLabel = label;

        const percent = (clickedZoom - min) / (max - min);
        if (this._autoRotate) {
          visualIndicator.style.bottom = `${percent * 100}%`;
          visualIndicator.style.left = '0%';
        } else {
          visualIndicator.style.left = `${percent * 100}%`;
          visualIndicator.style.bottom = '0%';
        }

        containerSliderTrack.style.display = 'none';
        openZoomSlider.querySelector('.icons-actions-container').classList.remove('active');
        //teste landscape aqui
        if (this._autoRotate) {
          zoomOptions.classList.add('landscape');
          zoomOptions.style.marginBottom = '0px';
          zoomOptions.style.marginRight = '160px';
        } else {
          zoomOptions.classList.remove('landscape');
          zoomOptions.style.marginBottom = '160px';
          zoomOptions.style.marginRight = '0px';
        }

        document.querySelectorAll('.zoom-value-label').forEach(el => el.classList.remove('active'));
        label.classList.add('active');

        if (e.target.parentElement != customZoomContainer) {
          customZoomContainer.firstElementChild?.remove();
        }
      });

      return label;
    };

    openZoomSlider.addEventListener('click', () => {
      if (containerSliderTrack.style.display === 'flex') {
        containerSliderTrack.style.display = 'none';
        openZoomSlider.querySelector('.icons-actions-container').classList.remove('active');
        
        if (this._autoRotate) {
          openZoomSlider.classList.add('landscape');
          zoomOptions.classList.add('landscape');
          zoomOptions.style.marginBottom = '0px';
          zoomOptions.style.marginRight = '160px';
        } else {
          openZoomSlider.classList.remove('landscape');
          zoomOptions.classList.remove('landscape');
          zoomOptions.style.marginBottom = '160px';
          zoomOptions.style.marginRight = '0px';
        }
      } else {
        containerSliderTrack.style.display = 'flex';
        openZoomSlider.querySelector('.icons-actions-container').classList.add('active');
        if (this._autoRotate) {
          zoomOptions.style.marginBottom = '0px';
          zoomOptions.style.marginRight = '10px';
        } else {
          zoomOptions.style.marginBottom = '10px';
          zoomOptions.style.marginRight = '0px';
        }
      }
    });

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

      if (this._autoRotate) {
        visualIndicator.style.bottom = `${percent * 100}%`;
        visualIndicator.style.left = '0%';
      } else {
        visualIndicator.style.left = `${percent * 100}%`;
        visualIndicator.style.bottom = '0%';
      }

      sliderLabel.textContent = formatZoom(clampedZoom);
      sliderLabel.dataset.zoom = clampedZoom;
      sliderLabel.classList.add('active');

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

    const handlePositionUpdate = (e) => {
      const rect = sliderTrack.getBoundingClientRect();
      let percent;
      if (this._autoRotate) {
        percent = Math.min(1, Math.max(0, (rect.bottom - e.clientY) / rect.height));
      } else {
        percent = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      }
      updateZoomFromPercent(percent);
    };

    // Mouse events
    touchArea.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      isDragging = true;
      handlePositionUpdate(e);
    });

    window.addEventListener('mousemove', (e) => {
      if (isDragging) handlePositionUpdate(e);
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) endScroll();
    });

    // Touch events
    touchArea.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      isDragging = true;
      handlePositionUpdate(e.touches[0]);
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
        handlePositionUpdate(e.touches[0]);
      }
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
        endScroll();
      }
    }, { passive: false });

    document.addEventListener('click', (e) => {
      if (!zoomControl.contains(e.target)) {
        containerSliderTrack.style.display = 'none';
        openZoomSlider.querySelector('.icons-actions-container').classList.remove('active');

        //teste landscape aqui
        if (this._autoRotate) {
          zoomOptions.classList.add('landscape');
          zoomOptions.style.marginBottom = '0px';
          zoomOptions.style.marginRight = '160px';
        } else {
          zoomOptions.classList.remove('landscape');
          zoomOptions.style.marginBottom = '160px';
          zoomOptions.style.marginRight = '0px';
        }

        zoomOptionsContainer.innerHTML = '';
        zoomSteps.forEach(val => {
          const label = predefinedLabels[val];
          zoomOptionsContainer.appendChild(label);
        });

        isExpanded = false;
      }
    });

    if (container) {
      container.appendChild(zoomControl);
    }
  }

  createPreviousPhotoContainer() {
    const previousPhotoBtn = document.createElement('button');
    previousPhotoBtn.className = 'previous-photo-btn';
    previousPhotoBtn.style.display = 'none';

    previousPhotoBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="icons-actions-container"><title>check</title>
        <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
      </svg>
    `;

    previousPhotoBtn.addEventListener('click', () => {
      if (this.photos.length > 0) {
        this.showFullPreview(this.photos.length - 1);
      }
    });

    this.previousPhotoBtn = previousPhotoBtn;
    return previousPhotoBtn;
  }

  updatePhotoCounter() {
    let counter = document.querySelector('.photo-counter');

    if (!counter) {
      const previousPhotoBtn = document.querySelector('.previous-photo-btn');
      if (!previousPhotoBtn) return;

      counter = document.createElement('span');
      counter.className = 'photo-counter';
      previousPhotoBtn.appendChild(counter);
    }

    counter.textContent = this.photos.length;
    counter.style.display = this.photos.length > 0 ? 'flex' : 'none';

    const previousPhotoBtn = document.querySelector('.previous-photo-btn');
    if (previousPhotoBtn) {
      previousPhotoBtn.style.display = this.photos.length > 0 ? 'flex' : 'none';
    }
  }

  showFullPreview(index) {
    this.currentPhotoIndex = index;
    
    // Esconde a visualização da câmera
    const viewfinder = document.querySelector('.viewfinder-container');
    const mobileControls = document.querySelector('.mobile-controls');
    
    viewfinder.style.display = 'none';
    if (mobileControls) {
      mobileControls.style.display = 'none';
    }
    
    if (!this.photoPreview) {
      this.createPhotoPreview();
    } else {
      this.photoPreview.style.display = 'flex';
    }
    
    this.displayCurrentPhoto();
    
    if (this.photos.length > 1) {
      this.photoGallery.style.display = 'flex';
      this.updatePhotoGallery();
    } else {
      this.photoGallery.style.display = 'none';
    }
  }

  showPhotoPreview(photoBlob) {
    if (!(photoBlob instanceof Blob)) {
      console.error('O objeto fornecido não é um Blob válido.');
      return;
    }

    // Adiciona a nova foto ao array
    this.photos.push(photoBlob);
    this.currentPhotoIndex = this.photos.length - 1;
    
    // Esconde a visualização da câmera
    const mobileControls = document.querySelector('.mobile-controls');
    
    if (mobileControls) {
      mobileControls.style.display = 'none';
    }
    
    // Cria ou atualiza o preview
    this.createPhotoPreview();
    
    // Mostra a foto atual
    this.displayCurrentPhoto();
    
    // Atualiza a galeria de previews
    this.updatePhotoGallery();

    if (this.previousPhotoBtn) {
      this.previousPhotoBtn.style.display = this.photos.length > 0 ? 'flex' : 'none';
    }

  }

  createPhotoPreview() {
    if (!this.photoPreview) {
      this.photoPreview = document.createElement('div');
      this.photoPreview.className = 'photo-preview';
      
      const photoContainer = document.createElement('div');
      photoContainer.className = 'photo-container';
      
      this.mainPhoto = document.createElement('img');
      this.mainPhoto.className = 'captured-photo';

      this.addMorePhotosBtn = document.createElement('button');
      this.addMorePhotosBtn.className = 'add-more-photos-btn';

      this.addMorePhotosBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="icons-photo-actions"><title>camera-plus</title>
          <path d="M3 4V1H5V4H8V6H5V9H3V6H0V4M6 10V7H9V4H16L17.8 6H21C22.1 6 23 6.9 23 8V20C23 21.1 22.1 22 21 22H5C3.9 22 3 21.1 3 20V10M13 19C17.45 19 19.69 13.62 16.54 10.46C13.39 7.31 8 9.55 8 14C8 16.76 10.24 19 13 19M9.8 14C9.8 16.85 13.25 18.28 15.26 16.26C17.28 14.25 15.85 10.8 13 10.8C11.24 10.8 9.8 12.24 9.8 14Z" />
        </svg>
      `;
      this.addMorePhotosBtn.addEventListener('click', () => {
        // Esconde o preview atual e volta para a câmera
        this.hidePhotoPreview();
        this.updatePhotoCounter();
        
        // Mostra novamente a visualização da câmera
        const viewfinder = document.querySelector('.viewfinder-container');
        const mobileControls = document.querySelector('.mobile-controls');

        if (viewfinder) {
          viewfinder.style.display = 'block';
        }
        if (mobileControls) {
          mobileControls.style.display = 'flex';
        }
      });
      
      photoContainer.appendChild(this.mainPhoto);
      photoContainer.appendChild(this.addMorePhotosBtn);
      
      // Galeria de previews
      this.photoGallery = document.createElement('div');
      this.photoGallery.className = 'photo-gallery';
      if (!this.isMobile) {
        this.photoGallery.style.bottom = '110px';
      }
      //esconder a galeria se for a primeira foto
      if (this.photos.length === 1) {
        this.photoGallery.style.display = 'none';
      }
      
      const actions = this.isMobile ? this.createPhotoActionsMobile() : this.createPhotoActionsDesktop();
      
      this.photoPreview.appendChild(photoContainer);
      this.photoPreview.appendChild(this.photoGallery);
      this.photoPreview.appendChild(actions);
      
      document.querySelector('.camera-body').appendChild(this.photoPreview);
    }
  }

  displayCurrentPhoto() {
    if (this.currentPhotoIndex >= 0 && this.currentPhotoIndex < this.photos.length) {
      const photoBlob = this.photos[this.currentPhotoIndex];
      this.mainPhoto.src = URL.createObjectURL(photoBlob);
      this.mainPhoto.dataset.blobUrl = this.mainPhoto.src;
    }
  }

  updatePhotoGallery() {
    // Limpa a galeria existente primeiro
    this.photoGallery.innerHTML = '';

    this.photos.forEach((photo, index) => {
      const thumbnail = document.createElement('div');
      thumbnail.className = 'photo-thumbnail';
      if (index === this.currentPhotoIndex) {
        thumbnail.classList.add('active');
      }

      const img = document.createElement('img');
      img.src = URL.createObjectURL(photo);

      const deleteOverlay = document.createElement('div');
      deleteOverlay.className = 'delete-overlay';
      deleteOverlay.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="icons-photo-actions"><title>trash-can-outline</title>
          <path d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z" />
        </svg>
      `;
      deleteOverlay.style.display = (index === this.currentPhotoIndex) ? 'flex' : 'none';

      deleteOverlay.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteCurrentPhoto(index);
      });

      thumbnail.appendChild(img);
      thumbnail.appendChild(deleteOverlay);

      thumbnail.addEventListener('click', () => {
        this.currentPhotoIndex = index;
        this.displayCurrentPhoto();

        const allOverlays = this.photoGallery.querySelectorAll('.delete-overlay');
        allOverlays.forEach(overlay => {
          overlay.style.display = 'none';
        });

        deleteOverlay.style.display = 'flex';

        // Atualiza a classe 'active' de todas as thumbnails
        Array.from(this.photoGallery.children).forEach((thumb, idx) => {
          thumb.classList.toggle('active', idx === index);
        });
      });

      this.photoGallery.appendChild(thumbnail);
    });
  }

  deleteCurrentPhoto(index) {
    if (!this.dialogConfirmDelete) {
      this.dialogConfirmDelete = document.createElement('div');
      this.dialogConfirmDelete.className = 'dialog-confirm';
      this.dialogConfirmDelete.innerHTML = `
        <p style="margin: 0;">Você tem certeza que deseja descartar essa foto?</p>
        <div class="dialog-buttons">
          <button class="cancel-discard" id="cancel-discard-delete">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="icons-photo-actions"><title>close</title>
              <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
            </svg>
            <div>Cancelar</div>
          </button>
          <button class="confirm-discard" id="confirm-discard-delete">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="icons-photo-actions"><title>delete</title>
              <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
            </svg>
            <div>Descartar</div>
          </button>
        </div>
      `;
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';
    document.body.appendChild(backdrop);
    document.body.appendChild(this.dialogConfirmDelete);

    const removeDialog = () => {
      this.dialogConfirmDelete.remove();
      backdrop.remove();
    };

    document.querySelector('#confirm-discard-delete').onclick = () => {
      if (index >= 0 && index < this.photos.length) {
        URL.revokeObjectURL(URL.createObjectURL(this.photos[index]));
        this.photos.splice(index, 1);
        this.updatePhotoCounter();

        if (this.photos.length === 0) {
          // Se não tem mais fotos, volta para a câmera
          removeDialog();
          this.hidePhotoPreview();
        } else {
          // Ajusta o índice atual e atualiza a exibição
          this.currentPhotoIndex = Math.min(this.currentPhotoIndex, this.photos.length - 1);
          this.displayCurrentPhoto();
          this.updatePhotoGallery();
          removeDialog();
        }
      }
    };

    document.querySelector('#cancel-discard-delete').onclick = () => {
      removeDialog();
    };
  }

  discardAllPhotos() {
    if (!this.dialogConfirm) {
      this.dialogConfirm = document.createElement('div');
      this.dialogConfirm.className = 'dialog-confirm';
      this.dialogConfirm.innerHTML = `
        <p style="margin: 0;">Você tem certeza que deseja descartar todas as fotos?</p>
        <div class="dialog-buttons">
          <button class="cancel-discard" id="cancel-discard-delete-all">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="icons-photo-actions"><title>close</title>
              <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
            </svg>
            <div>Cancelar</div>
          </button>
          <button class="confirm-discard" id="confirm-discard-delete-all">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="icons-photo-actions"><title>delete</title>
              <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
            </svg>
            <div>Descartar</div>
          </button>
        </div>
      `;
    }
    
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';
    document.body.appendChild(backdrop);
    document.body.appendChild(this.dialogConfirm);

    const removeDialog = () => {
      this.dialogConfirm.remove();
      backdrop.remove();
    };

    document.querySelector('#confirm-discard-delete-all').onclick = () => {
      this.photos.forEach(photo => {
        if (photo instanceof Blob) {
          URL.revokeObjectURL(photo);
        }
      });
      
      this.photos = [];
      this.currentPhotoIndex = -1;
      this.hidePhotoPreview();
      this.updatePhotoCounter();
      removeDialog();
    };

    document.querySelector('#cancel-discard-delete-all').onclick = () => {
      removeDialog();
    };
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
    <div>Descartar</div>`;
    closeBtn.addEventListener('click', () => this.discardAllPhotos());

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'photo-action-btn download-btn';
    downloadBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="icons-photo-actions"><title>send</title>
      <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z" />
    </svg>
    <div>Confirmar</div>`;
    downloadBtn.addEventListener('click', () => {
      SCamera.captureController.blob = this.photos;
      SCamera.sendBlob();
      // this.hidePhotoPreview();
    });
    
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
    closeBtn.addEventListener('click', () => this.discardAllPhotos());

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'photo-action-btn-desktop download-btn';
    downloadBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="icons-photo-actions download-btn"><title>send</title>
        <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z" />
      </svg>
    `;
    downloadBtn.addEventListener('click', () => {
      SCamera.captureController.blob = this.photos;
      SCamera.sendBlob();
    });
    
    actions.appendChild(closeBtn);
    actions.appendChild(downloadBtn);
    
    return actions;
  }

  hidePhotoPreview() {
    if (this.photoPreview) {
      this.photoPreview.remove();
      this.photoPreview = null;
    }
    
    // Mostra novamente a visualização da câmera
    const viewfinder = document.querySelector('.viewfinder-container');
    const mobileControls = document.querySelector('.mobile-controls');

    viewfinder.style.display = 'block';
    if (mobileControls) {
      mobileControls.style.display = 'flex';
    }

    if (this.previousPhotoBtn) {
      this.previousPhotoBtn.style.display = this.photos.length > 0 ? 'flex' : 'none';
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
        this.createLoadingScreen();
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
    
    let newAutoRotate = this.isMobile && window.innerHeight < window.innerWidth;
    let hasAutoRotateChanged = newAutoRotate != this._autoRotate;
    this._autoRotate = newAutoRotate;

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
    this.rotateIcons(rotation, hasAutoRotateChanged);
  }

  rotateIcons(degrees, autoRotateChanged = false) {
    const icons = document.querySelectorAll('.mobile-switch, .mobile-flash, .zoom-value-label, .leave-camera-btn, .previous-photo-btn, .open-zoom-slider');

    const elements = {
      mobileControls: document.querySelector('.mobile-controls'),
      mobileActions: document.querySelector('.mobile-actions-container'),
      leaveCameraBtn: document.querySelector('.leave-camera-btn'),
      zoomOptions: document.querySelector('.zoom-options'),
      zoomOptionsContainer: document.querySelector('.zoom-options-container'),
      zoomSliderContainer: document.querySelector('.zoom-slider-container'),
      zoomSliderTrackContainer: document.querySelector('.zoom-slider-track-container'),
      zoomSliderTrack: document.querySelector('.zoom-slider-track'),
      zoomIndicator: document.querySelector('.zoom-indicator'),
      zoomTouchArea: document.querySelector('.zoom-touch-area'),
      openZoomSlider: document.querySelector('.open-zoom-slider'),
      previousPhotoBtn: document.querySelector('.previous-photo-btn'),
    };

    const applyStyles = (el, styles = {}) => {
      if (!el) return;
      Object.entries(styles).forEach(([prop, val]) => {
        el.style[prop] = val;
      });
    };

    const toggleLandscapeClass = (action) => {
      Object.values(elements).forEach(el => {
        if (el) el.classList[action]('landscape');
      });
    };

    if (this._autoRotate === true) {
      toggleLandscapeClass('add');

      if (autoRotateChanged) {
        applyStyles(elements.zoomIndicator, {
          bottom: elements.zoomIndicator?.style.left,
          left: '0%'
        });

        applyStyles(elements.zoomOptions, {
          marginRight: '10px',
          marginBottom: '0px'
        });

        if (elements.zoomSliderTrackContainer?.style.display === 'none') {
          applyStyles(elements.zoomOptions, {
            marginRight: '160px'
          });
        }
      }

      icons.forEach(icon => {
        icon.style.transition = 'none';
        icon.style.transform = 'rotate(0deg)';
      });

    } else {
      toggleLandscapeClass('remove');

      if (autoRotateChanged) {
        applyStyles(elements.zoomIndicator, {
          left: elements.zoomIndicator?.style.bottom,
          bottom: '0%'
        });

        applyStyles(elements.zoomOptions, {
          marginRight: '0px',
          marginBottom: '10px'
        });

        if (elements.zoomSliderTrackContainer?.style.display === 'none') {
          applyStyles(elements.zoomOptions, {
            marginBottom: '160px'
          });
        }
      }

      icons.forEach(icon => {
        icon.style.transition = 'transform 0.3s ease';
        icon.style.transform = `rotate(${degrees}deg)`;
      });
    }
  }
}