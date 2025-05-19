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
        deviceId: SCamera.currentConfig.deviceId ? { exact: SCamera.currentConfig.deviceId } : undefined,
        zoom: true
      },
      audio: false,
    };

    const finalConstraints = constraints || defaultConstraints;

    try {
      const stream = await navigator.mediaDevices.getUserMedia(finalConstraints);
      this.currentStream = stream;
      this.videoTrack = stream.getVideoTracks()[0];

      // Configurar capacidades da câmera
      this.capabilities = this.videoTrack.getCapabilities ? this.videoTrack.getCapabilities() : null;
      this.settings = this.videoTrack.getSettings();
      this.currentDeviceId = this.settings.deviceId;

      // Aplicar zoom atual se suportado
      if (this.capabilities?.zoom) {
        this.setZoom(this.currentZoom);
      }

      // Aplicar flash/torch se suportado
      if (this.capabilities?.torch) {
        this.toggleFlash(this.torchEnabled);
      }
      
      // Inicializa ImageCapture se suportado
      if ('ImageCapture' in window) {
        this.imageCapture = new ImageCapture(this.videoTrack);
      }
      
      this.capabilities = this.videoTrack.getCapabilities ? this.videoTrack.getCapabilities() : null;
      this.settings = this.videoTrack.getSettings();
      this.currentDeviceId = this.settings.deviceId;
      
      // Atualiza configurações no SCamera
      SCamera.currentConfig.deviceId = this.currentDeviceId;
      SCamera.currentConfig.resolution = {
        width: this.settings.width,
        height: this.settings.height
      };
      
      return stream;
    } catch (error) {
      alert('Erro ao acessar a câmera. Verifique as permissões ou se existe uma câmera disponível.');
      console.error('Error accessing camera:', error);
      throw error;
    } finally {
      // Atualiza a interface do usuário
      const videoElement = document.querySelector('.camera-preview');
      if (videoElement) {
        videoElement.srcObject = this.currentStream;
        videoElement.play();
      }
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

  async switchCamera() {
    const cameras = await SCamera.listCameras();
    if (cameras.length <= 1) return;

    // Resetar zoom para o padrão (1x)
    this.currentZoom = 1;
    SCamera.currentConfig.zoom = 1;

    const categorizedCams = this._categorizeCameras(cameras);

    // Determinar a câmera atual
    const currentCam = cameras.find(c => c.deviceId === this.currentDeviceId);
    const currentLabel = currentCam?.label.toLowerCase() || '';
    
    const isCurrentFront = currentLabel.includes('front') || currentLabel.includes('user') || currentLabel.includes('face') || (currentLabel.includes('1') && !currentLabel.includes('back'));
    const isCurrentBack = currentLabel.includes('back') || currentLabel.includes('environment') || (currentLabel.includes('0') && !currentLabel.includes('front'));

    // Lógica de seleção de câmera (mobile + desktop)
    let targetCam;
    if (isCurrentFront) {
      // Prioridade: back > external > qualquer outra
      targetCam = categorizedCams.back[0] || categorizedCams.external[0] || cameras.find(c => c.deviceId !== this.currentDeviceId);
    } else if (isCurrentBack) {
      // Prioridade: front > external > qualquer outra
      targetCam = categorizedCams.front[0] || categorizedCams.external[0] || cameras.find(c => c.deviceId !== this.currentDeviceId);
    } else {
      // Para câmeras não classificadas (desktop), alternar para próxima câmera
      const currentIndex = cameras.findIndex(c => c.deviceId === this.currentDeviceId);
      const nextIndex = (currentIndex + 1) % cameras.length;
      targetCam = cameras[nextIndex];
    }

    if (!targetCam) {
      console.warn('No alternative camera found');
      return;
    }

    // Determinar facingMode (só aplica se for mobile)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    let facingMode = 'user'; // Padrão para desktop
    
    if (isMobile) {
      const targetLabel = targetCam.label.toLowerCase();
      const isTargetFront = targetLabel.includes('front') || targetLabel.includes('user') || targetLabel.includes('face') || (targetLabel.includes('1') && !targetLabel.includes('back'));

      facingMode = isTargetFront ? 'user' : 'environment';
    }

    SCamera.currentConfig.facingMode = facingMode;
    SCamera.currentConfig.deviceId = targetCam.deviceId;

    console.log('Switching camera to:', targetCam.label);
    const newConstraints = {
      video: {
        ...(isMobile && { facingMode }), // Só aplica facingMode em mobile
        deviceId: { exact: targetCam.deviceId },
        width: { ideal: SCamera.currentConfig.resolution.width },
        height: { ideal: SCamera.currentConfig.resolution.height },
        zoom: true
      },
      audio: false
    };

    try {
      await this.getCameraStream(newConstraints);

      // Atualizar UI do zoom
      const zoomSlider = document.querySelector('#zoom-slider');
      const zoomLevel = document.querySelector('.zoom-level');
      if (zoomSlider && zoomLevel) {
        zoomSlider.value = 1;
        zoomLevel.textContent = 'x1.0';
      }
      
      // Atualizar espelhamento da câmera frontal (mesmo em desktop)
      const shouldMirror = targetCam.label.toLowerCase().includes('front') || targetCam.label.toLowerCase().includes('user') || targetCam.label.toLowerCase().includes('face');
      
      const videoElement = document.querySelector('.camera-preview');
      if (videoElement) {
        videoElement.style.transform = shouldMirror ? 'scaleX(-1)' : 'none';
      }
      
    } catch (error) {
      console.error('Error switching camera:', error);
      throw error;
    }
  }

  _categorizeCameras(cameras) {
    return cameras.reduce((acc, cam) => {
      const label = cam.label.toLowerCase();
      const isFront = label.includes('front') || label.includes('user') || label.includes('face') || (label.includes('1') && !label.includes('back'));
      const isBack = label.includes('back') ||  label.includes('environment') || (label.includes('0') && !label.includes('front'));
      // Verificação para desktop (webcams sem identificação clara)
      const isProbablyFront = !isBack && (
        label.includes('integrated') || 
        label.includes('built-in') || 
        label.includes('laptop') ||
        cameras.length === 2 // Assume que a segunda câmera em dispositivos com 2 câmeras é a frontal
      );
      if (isFront || isProbablyFront) {
        acc.front.push(cam);
      } else if (isBack) {
        acc.back.push(cam);
      } else {
        // Câmeras não classificadas (geralmente webcams externas em desktop)
        acc.external.push(cam);
      }
      return acc;
    }, { front: [], back: [], external: [] });
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
    const zoomSlider = document.querySelector('#zoom-slider');
    const zoomControl = document.querySelector('.zoom-control');
    const zoomLevel = document.querySelector('.zoom-level');

    if (!this.videoTrack || !this.capabilities?.zoom) {
      console.log('Zoom not supported');
      zoomControl.style.display = 'none';
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
            zoomControl.style.display = 'none';
            console.error('Error setting zoom:', error);
          });
        }
      }
    } else {
      zoomControl.style.display = 'none';
      console.log('Zoom not supported on this device');
    }
  }

  toggleFlash(state) {
    const flashBtn = document.querySelector('.flash-btn');

    if (!this.videoTrack || !this.capabilities?.torch) {
      console.log('Flash/torch not supported');
      flashBtn.style.display = 'none';
      return false;
    }

    if(this.capabilities.torch) {
      if (flashBtn) {
        flashBtn.onclick = () => {
          this.torchEnabled = !this.torchEnabled;
          this.videoTrack.applyConstraints({
            advanced: [{ torch: this.torchEnabled }]
          }).then(() => {
            SCamera.currentConfig.flash = this.torchEnabled;
          }).catch(error => {
            flashBtn.style.display = 'none';
            console.error('Error toggling flash:', error);
          });
        }
      }
    } else {
      flashBtn.style.display = 'none';
      console.log('Flash/torch not supported on this device');
    }
  }
}