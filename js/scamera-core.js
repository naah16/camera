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
    
    await SCamera.captureController.init();
    SCamera.uiController.init();
    
    await SCamera.loadDevices();
  },
  
  loadDevices: async () => {
    await SCamera.listCameras();
    const devices = await navigator.mediaDevices.enumerateDevices();
    SCamera.devices.microphones = devices.filter(device => device.kind === 'audioinput');
    
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
      console.log('newZoom:', newZoom);
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
      SCamera.devices.cameras = devices.filter(device => device.kind === 'videoinput');
      return SCamera.devices.cameras;
    } catch (error) {
      console.error('Error listing cameras:', error);
      return [];
    }
  },
};