let SCamera = {
  uiController: null,
  captureController: null,
  devices: {
    cameras: [],
    resolutions: []
  },
  currentConfig: {
    deviceId: null,
    resolution: { width: 1920, height: 1080 },
    facingMode: 'environment',
    flash: false,
    zoom: 1
  },
  
  init: async () => {
    SCamera.uiController = new SCameraUIController();
    SCamera.captureController = new SCameraCaptureController();
    
    SCamera.uiController.init();
    await SCamera.captureController.init();
    
    await SCamera.loadDevices();
  },
  
  loadDevices: async () => {
    await SCamera.listCameras();
    const devices = await navigator.mediaDevices.enumerateDevices();
    SCamera.devices.cameras = devices.filter(device => device.kind === 'videoinput');
    console.log('Cameras:', SCamera.devices.cameras);
    
    if (SCamera.captureController.currentStream) {
      await SCamera.loadSupportedResolutions();
    }
  },
  
  loadSupportedResolutions: async () => {
    SCamera.devices.resolutions = [
      { width: 1280, height: 720 },
      { width: 1920, height: 1080 },
    ].filter(res => {
      // Verificar se a resolução é suportada
      const isSupported = SCamera.captureController.currentStream.getVideoTracks()[0].getSettings().width === res.width &&
                          SCamera.captureController.currentStream.getVideoTracks()[0].getSettings().height === res.height;
      return isSupported;
    });
  },

  switchCamera: async () => {
    await SCamera.captureController.switchCamera();
  },
  
  capturePhoto: async () => {
    return await SCamera.captureController.capturePhoto();
  },
  
  setZoom: async (zoomLevel) => {
    try {
      const newZoom = await SCamera.captureController.setZoom(zoomLevel);
      SCamera.currentConfig.zoom = newZoom;
      return newZoom;
    } catch (error) {
      console.error('Error setting zoom:', error);
      throw error;
    }
  },
  
  toggleFlash: async () => {
    try {
      const newState = !SCamera.currentConfig.flash;
      const success = await SCamera.captureController.toggleFlash(newState);
      if (success) {
        SCamera.currentConfig.flash = newState;
      }
      return success;
    } catch (error) {
      console.error('Error toggling flash:', error);
      throw error;
    }
  },

  listCameras: async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');

      let front = null;
      let back = null;

      for (const device of videoDevices) {
        const label = device.label.toLowerCase();

        if (!front && (label.includes('front') || label.includes('frontal') || label.includes('user'))) {
          front = device;
        }

        if (!back && (label.includes('back') || label.includes('traseira') || label.includes('rear') || label.includes('environment'))) {
          back = device;
        }
      }

      // fallback: caso só tenha uma câmera
      const filteredCameras = [front, back].filter(Boolean);
      SCamera.devices.cameras = filteredCameras.length ? filteredCameras : videoDevices;

      return SCamera.devices.cameras;
    } catch (error) {
      console.error('Error listing cameras:', error);
      return [];
    }
  },
};