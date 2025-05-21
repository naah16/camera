class SCameraCaptureController {
  constructor() {
    this.currentStream = null;
    this.currentDeviceId = null;
    this.imageCapture = null;
    this.videoTrack = null;
    this.capabilities = null;
    this.settings = null;
    this.currentZoom = 1;
    this.torchEnabled = false;
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  async init() {
    await this.getCameraStream();
  }

  async getCameraStream(constraints = null) {
    // Liberar stream atual se existir
    if (this.currentStream) {
      this.stopCurrentStream();
    }

    const defaultConstraints = {
      video: {
        facingMode: SCamera.currentConfig.facingMode,
        width: { ideal: SCamera.currentConfig.resolution.width },
        height: { ideal: SCamera.currentConfig.resolution.height },
        deviceId: SCamera.currentConfig.deviceId ? { exact: SCamera.currentConfig.deviceId } : undefined
      },
      audio: false,
    };

    const finalConstraints = constraints || defaultConstraints;

    try {
      const stream = await navigator.mediaDevices.getUserMedia(finalConstraints);
      this.currentStream = stream;
      this.videoTrack = stream.getVideoTracks()[0];

      if (!this.videoTrack) {
        throw new Error('No video track available');
      }

      // Configurar capacidades da câmera
      this.capabilities = this.videoTrack.getCapabilities?.() || null;
      this.settings = this.videoTrack.getSettings();
      this.currentDeviceId = this.settings.deviceId;

      console.log("Capacidades da câmera:", this.capabilities);

      // Aplicar zoom atual se suportado
      if (this.capabilities?.zoom && this.isMobile) {
        this.setZoom(this.currentZoom);
      }

      // Aplicar flash/torch se suportado
      if (this.capabilities?.torch && this.isMobile) {
        this.toggleFlash(this.torchEnabled);
      }
      
      // Inicializa ImageCapture se suportado
      if ('ImageCapture' in window) {
        this.imageCapture = new ImageCapture(this.videoTrack);
      }

      const videoElement = document.querySelector('.camera-preview');
      if (videoElement) {
        videoElement.srcObject = stream;
        videoElement.play();
        
        if (this.settings.facingMode === 'user') {
          videoElement.style.transform = 'scaleX(-1)';
        } else {
          videoElement.style.transform = 'scaleX(1)';
        }
      }
      
      // Atualiza configurações no SCamera
      SCamera.currentConfig.deviceId = this.currentDeviceId;
      SCamera.currentConfig.resolution = {
        width: this.settings.width,
        height: this.settings.height
      };
      
      return stream;
    } catch (error) {
      console.error('Error accessing camera:', error);
      SCamera.uiController?.showCameraError();
      throw error;
    }
  }

  stopCurrentStream() {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
      this.imageCapture = null;
      this.videoTrack = null;
    }
  }

  async switchMobileCamera() {
    const currentIndex = SCamera.devices.cameras.findIndex(
      cam => cam.deviceId === this.currentDeviceId
    );

    SCamera.currentConfig.facingMode = SCamera.currentConfig.facingMode == "user" ? "environment" : "user";
    
    const videoElement = document.querySelector('.camera-preview');
    if (SCamera.currentConfig.facingMode == "user") {
      videoElement.style.transform = 'scaleX(-1)';
    } else {
      videoElement.style.transform = 'scaleX(1)';
    }

    try {
      await this.getCameraStream({
        video: {
          width: { ideal: SCamera.currentConfig.resolution.width },
          height: { ideal: SCamera.currentConfig.resolution.height },
          facingMode: SCamera.currentConfig.facingMode,
        },
        audio: false
      });
      
      // Reaplicar configurações após trocar a câmera
      if (this.capabilities?.zoom && SCamera.currentConfig.zoom > 1) {
        this.setZoom(SCamera.currentConfig.zoom);
      }
      
      if (this.capabilities?.torch) {
        this.toggleFlash(SCamera.currentConfig.flash);
      }
    } catch (error) {
      console.error('Error switching camera:', error);
      throw error;
    }
  }

  async switchDesktopCamera() {
    const deviceId = SCamera.currentConfig.deviceId;

    if (!deviceId) {
      console.warn('Nenhum deviceId definido. Abortando troca de câmera.');
      return;
    }

    const newCamera = SCamera.devices.cameras.find(cam => cam.deviceId === deviceId);
    if (!newCamera) {
      console.error('Câmera não encontrada com o deviceId fornecido.');
      return;
    }

    SCamera.currentConfig.facingMode = newCamera.label.toLowerCase().includes('front') ? 'user' : 'environment';

    try {
      await this.getCameraStream({
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: SCamera.currentConfig.resolution.width },
          height: { ideal: SCamera.currentConfig.resolution.height }
        },
        audio: false
      });

      if (this.capabilities?.zoom && SCamera.currentConfig.zoom > 1) {
        this.setZoom(SCamera.currentConfig.zoom);
      }

      if (this.capabilities?.torch) {
        this.toggleFlash(SCamera.currentConfig.flash);
      }
    } catch (error) {
      console.error('Erro ao trocar a câmera:', error);
      throw error;
    }
  }

  async capturePhoto() {
    try {
      let photoBlob;
      
      // Tentar usar ImageCapture para melhor qualidade
      if (this.imageCapture) {
        try {
          const photoBitmap = await this.imageCapture.grabFrame();
          
          // Converter ImageBitmap para Blob
          const canvas = document.createElement('canvas');
          canvas.width = photoBitmap.width;
          canvas.height = photoBitmap.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(photoBitmap, 0, 0);
          
          photoBlob = await new Promise((resolve) => {
            canvas.toBlob(resolve, 'image/jpeg', 1);
          });
        } catch (error) {
          console.warn('ImageCapture failed, falling back to canvas:', error);
          // Continuar para o fallback do canvas
        }
      }
      
      // Fallback para canvas se ImageCapture não estiver disponível ou falhar
      if (!photoBlob) {
        const videoElement = document.querySelector('.camera-preview');
        if (!videoElement) throw new Error('Video element not found');
        
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        photoBlob = await new Promise((resolve) => {
          canvas.toBlob(resolve, 'image/jpeg', 1);
        });
      }
      
      return photoBlob;
    } catch (error) {
      console.error('Error capturing photo:', error);
      throw error;
    }
  }

  setZoom(configZoom) {
    if (!this.videoTrack || !this.capabilities?.zoom) {
      console.log('Zoom not supported');
      return;
    }
    
    if (this.capabilities.zoom) {
      if(zoomSlider) {
        zoomSlider.min = this.capabilities.zoom.min;
        zoomSlider.max = this.capabilities.zoom.max;
        zoomSlider.step = this.capabilities.zoom.step;
        zoomSlider.value = this.currentZoom;

        zoomSlider.oninput = () => {
          const zoomValue = parseFloat(zoomSlider.value);
          this.currentZoom = zoomValue;
          this.videoTrack.applyConstraints({
            advanced: [{ zoom: zoomValue }]
          }).then(() => {
            SCamera.currentConfig.zoom = zoomValue;
            const normalizedZoom = zoomValue / this.capabilities.zoom.min;
            zoomLevel.textContent = `x${normalizedZoom.toFixed(1)}`;
          }).catch(error => {
            console.error('Error setting zoom:', error);
          });
        }
      }
    } else {
      console.log('Zoom not supported on this device');
    }
  }

  toggleFlash(state) {
    if (!this.videoTrack || !this.capabilities?.torch) {
      console.log('Flash/torch not supported');
      return false;
    }
    
    const flashBtn = document.querySelector('.flash-btn');

    if (flashBtn) {
      flashBtn.onclick = () => {
        this.torchEnabled = !this.torchEnabled;
        this.videoTrack.applyConstraints({
          advanced: [{ torch: this.torchEnabled }]
        }).then(() => {
          SCamera.currentConfig.flash = this.torchEnabled;
        }).catch(error => {
          console.error('Error toggling flash:', error);
        });
      }
    }
  }
}