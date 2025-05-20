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
  onZoomChange: null,
  
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
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
     await SCamera.captureController.switchMobileCamera();
    } else {
      await SCamera.captureController.switchDesktopCamera();
    }
  },
  
  capturePhoto: async () => {
    return await SCamera.captureController.capturePhoto();
  },
  
  setZoom: async (zoomLevel) => {
    try {
      const newZoom = await SCamera.captureController.setZoom(zoomLevel);
      SCamera.currentConfig.zoom = newZoom;
      if (SCamera.onZoomChange) {
        SCamera.onZoomChange(newZoom);
      }
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
      SCamera.devices.cameras = devices.filter(device => device.kind === 'videoinput');
      return SCamera.devices.cameras;
    } catch (error) {
      console.error('Error listing cameras:', error);
      return [];
    }
  },
};