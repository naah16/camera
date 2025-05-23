export default class SCameraCaptureController {
  constructor() {
    this.currentStream = null;
    this.currentDeviceId = null;
    this.imageCapture = null;
    this.videoTrack = null;
    this.capabilities = null;
    this.settings = null;
    this.currentZoom = 1;
    this.torchEnabled = false;
    this.blob = null;
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  async init() {
    this.currentStream = await navigator.mediaDevices.getUserMedia();
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
        this.setZoom(1);
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

          if (this.settings.facingMode === 'user') {
            ctx.scale(-1, 1);
            ctx.drawImage(photoBitmap, -photoBitmap.width, 0, photoBitmap.width, photoBitmap.height);
          }
          ctx.drawImage(photoBitmap, 0, 0);
          
          photoBlob = await new Promise((resolve) => {
            canvas.toBlob(resolve, 'image/jpeg', 1);
          });
        } catch (error) {
          console.warn('ImageCapture failed, falling back to canvas:', error);
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

        if (this.settings.facingMode === 'user') {
          ctx.scale(-1, 1);
          ctx.drawImage(videoElement, -videoElement.videoWidth, 0, videoElement.videoWidth, videoElement.videoHeight);
        }
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        photoBlob = await new Promise((resolve) => {
          canvas.toBlob(resolve, 'image/jpeg', 1);
        });
      }

      const compressed = await this.compress(
        photoBlob,
        "image/jpeg",
        90,
        1920
      );

      compressed.name = `photo-${Date.now()}.jpg`;
      this.blob = compressed;

      return compressed;
    } catch (error) {
      console.error('Error capturing photo:', error);
      throw error;
    }
  }

  sendBlob() {
    document.dispatchEvent(new CustomEvent('photoCaptured', {
      detail: {  blob: this.blob },
      bubbles: true,
      cancelable: true,
      composed: true
    }));
  }

  waitForCapabilities() {
    return new Promise((resolve) => {
      const check = () => {
        if (this.capabilities?.zoom) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  setZoom(zoomValue) {
    if (!this.videoTrack || !this.capabilities?.zoom) {
      console.log('Zoom not supported');
      return this.currentZoom;
    }

    const clampedZoom = Math.min(Math.max(zoomValue, this.capabilities.zoom.min), this.capabilities.zoom.max);
    this.currentZoom = clampedZoom;

    return this.videoTrack.applyConstraints({
      advanced: [{ zoom: clampedZoom }]
    }).then(() => {
      SCamera.currentConfig.zoom = clampedZoom;
      return clampedZoom;
    }).catch((error) => {
      console.error('Error setting zoom:', error);
      return this.currentZoom;
    });
  }

  toggleFlash(state) {
    if (!this.videoTrack || !this.capabilities?.torch) {
      console.log('Flash/torch not supported');
      return false;
    }

    this.torchEnabled = state;
    return this.videoTrack.applyConstraints({
      advanced: [{ torch: this.torchEnabled }]
    }).then(() => true).catch(error => {
      console.error('Error toggling flash:', error);
      return false;
    });
  }

  imgIsProcessable = (mimeType) => {
    const processable = ["image/jpeg", "image/png"];
    return processable.includes(mimeType.toLowerCase());
  };

  readImg = async (originalBlob) => {
    const reader = new FileReader();
    const img = new Image();

    let data = await new Promise((resolve, reject) => {
      reader.onload = (event) => {
        resolve(event.target.result);
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsDataURL(originalBlob);
    });

    img.src = data;

    await new Promise((resolve, reject) => {
      img.onload = () => {
        resolve();
      };
      img.onerror = () => {
        reject("Erro ao carregar imagem");
      };
    }).catch((er) => {
      throw new Error(er);
    });

    return img;
  };

  cropImage = async (originalBlob, mimeType, quality, resolution) => {
    let img = originalBlob;
    if (!(originalBlob instanceof Image)) {
      img = await this.readImg(originalBlob);
    }

    let canvasProps = {
      width: img.width,
      height: img.height,
    };
    const landscape = img.height < img.width;
    let biggerProp = landscape ? "width" : "height";
    let smallerProp = landscape ? "height" : "width";

    canvasProps[biggerProp] = resolution;
    let scale = canvasProps[biggerProp] / img[biggerProp];
    canvasProps[smallerProp] = img[smallerProp] * scale;
    let resized = false;
    if (canvasProps[smallerProp] < 40) {
      canvasProps[smallerProp] = 40;
      resized = true;
    }

    const canvasElem = document.createElement("canvas");
    canvasElem.width = canvasProps.width;
    canvasElem.height = canvasProps.height;
    const ctx = canvasElem.getContext("2d");

    let diffProp = resized
      ? Math.abs(canvasProps[biggerProp] - img[biggerProp]) *
        (canvasProps[smallerProp] / img[smallerProp])
      : 0;

    if (landscape) {
      ctx.drawImage(
        img,
        diffProp / 2,
        0,
        img.width - diffProp,
        img.height,
        0,
        0,
        canvasProps.width,
        canvasProps.height
      );
    } else {
      ctx.drawImage(
        img,
        0,
        diffProp / 2,
        img.width,
        img.height - diffProp,
        0,
        0,
        canvasProps.width,
        canvasProps.height
      );
    }
    let newBlob = await new Promise((resolve) => {
      ctx.canvas.toBlob(
        (newBlob) => {
          resolve(newBlob);
        },
        mimeType,
        quality / 100.0
      );
    });

    return newBlob;
  };

  cropSquare = async (originalBlob, mimeType, quality, resolution) => {
    let img = originalBlob;
    if (!(originalBlob instanceof Image)) {
      img = await this.readImg(originalBlob);
    }

    const canvasElem = document.createElement("canvas");
    canvasElem.width = resolution;
    canvasElem.height = resolution;
    const ctx = canvasElem.getContext("2d");

    let landscape = img.height < img.width;
    let diffWidthHeight = Math.abs(img.width - img.height);
    if (landscape) {
      ctx.drawImage(
        img,
        diffWidthHeight / 2,
        0,
        img.height,
        img.height,
        0,
        0,
        resolution,
        resolution
      );
    } else {
      ctx.drawImage(
        img,
        0,
        diffWidthHeight / 2,
        img.width,
        img.width,
        0,
        0,
        resolution,
        resolution
      );
    }

    let newBlob = await new Promise((resolve) => {
      ctx.canvas.toBlob(
        (newBlob) => {
          resolve(newBlob);
        },
        mimeType,
        quality / 100.0
      );
    });

    return newBlob;
  };

  compress = async (
    originalBlob,
    mimeType,
    quality,
    maxResolution,
    sizeLowestPrevails = true
  ) => {
    let img = originalBlob;
    if (!(originalBlob instanceof Image)) {
      img = await this.readImg(originalBlob);
    }

    let newWidth = img.width;
    let newHeight = img.height;
    let resized = false;
    if (maxResolution != null) {
      if (
        (img.width > img.height || img.width == img.height) &&
        img.width > maxResolution
      ) {
        newWidth = maxResolution;
        let scaleFactor = newWidth / img.width;
        newHeight = img.height * scaleFactor;
        resized = true;
      }
      if (img.height > img.width && img.height > maxResolution) {
        newHeight = maxResolution;
        let scaleFactor = newHeight / img.height;
        newWidth = img.width * scaleFactor;
        resized = true;
      }
    }

    const canvasElem = document.createElement("canvas");
    canvasElem.width = newWidth;
    canvasElem.height = newHeight;

    const ctx = canvasElem.getContext("2d");

    ctx.drawImage(img, 0, 0, newWidth, newHeight);

    let newBlob = await new Promise((resolve) => {
      ctx.canvas.toBlob(
        (newBlob) => {
          if (newBlob.size < originalBlob.size) {
            resolve(newBlob);
          } else {
            if (resized) {
              if (sizeLowestPrevails) {
                resolve(originalBlob);
              } else {
                resolve(newBlob);
              }
            } else {
              resolve(originalBlob);
            }
          }
        },
        mimeType,
        quality / 100.0
      );
    });

    return newBlob;
  };
}